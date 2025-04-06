// controllers/payment-controller.js
const Payment = require('../models/payment');
const Charge = require('../models/charge');
const Proprietaire = require('../models/proprietaire');
const Appartement = require('../models/appartement');
const Immeuble = require('../models/immeuble');
const Notification = require('../models/notification');
const { generatePaymentReminderPDF, generatePaymentReceiptPDF, generatePaymentHistoryPDF, ensureUploadsDirectory } = require('../services/pdf-service');
const path = require('path');
const fs = require('fs');
const { db } = require('../config/firebase-config');

// Create a new payment (accessible by syndics and proprietaires)
exports.createPayment = async (req, res) => {
  try {
    const {
      montant,
      methodePaiement,
      reference,
      chargeId,
      notes
    } = req.body;

    // Validate required fields
    if (!montant || !chargeId) {
      return res.status(400).json({
        success: false,
        message: 'Montant et ID de charge sont requis'
      });
    }

    // Check if charge exists
    const charge = await Charge.findById(chargeId);
    if (!charge) {
      return res.status(404).json({
        success: false,
        message: 'Charge non trouvée'
      });
    }

    // If the user is a proprietaire, check if the charge belongs to them
    if (req.userRole === 'proprietaire') {
      const appartement = await Appartement.findById(charge.appartementId);
      if (!appartement || appartement.proprietaireId !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à payer cette charge'
        });
      }

      // Set the payment status to 'en attente' for proprietaire-initiated payments
      const paymentData = {
        montant,
        methodePaiement: methodePaiement || 'virement',
        reference: reference || null,
        chargeId,
        proprietaireId: req.userId,
        syndicId: charge.syndicId, // The syndic who created the charge
        statut: 'en attente', // Payments by proprietaires need to be confirmed by syndic
        notes: notes || ''
      };

      const payment = await Payment.create(paymentData);

      // Create a notification for the syndic
      await Notification.create({
        userId: charge.syndicId,
        title: 'Nouveau paiement en attente',
        message: `Un paiement de ${montant}€ a été effectué pour la charge "${charge.titre}" et est en attente de confirmation.`,
        type: 'info',
        relatedTo: 'payment',
        relatedId: payment.id
      });

      // Return success response
      return res.status(201).json({
        success: true,
        message: 'Paiement enregistré avec succès et en attente de confirmation',
        payment: payment.toJSON()
      });
    }
    // If the user is a syndic
    else if (req.userRole === 'syndic') {
      // Check if the syndic created this charge or manages the immeuble
      if (charge.syndicId !== req.userId) {
        // If the charge has an appartement, check if the syndic manages the immeuble
        if (charge.appartementId) {
          const appartement = await Appartement.findById(charge.appartementId);
          if (!appartement) {
            return res.status(404).json({
              success: false,
              message: 'Appartement non trouvé'
            });
          }

          const immeuble = await Immeuble.findById(appartement.immeubleId);
          if (!immeuble || immeuble.syndicId !== req.userId) {
            return res.status(403).json({
              success: false,
              message: 'Vous n\'êtes pas autorisé à enregistrer un paiement pour cette charge'
            });
          }
        }
        // If the charge is for an immeuble, check if the syndic manages it
        else if (charge.immeubleId) {
          const immeuble = await Immeuble.findById(charge.immeubleId);
          if (!immeuble || immeuble.syndicId !== req.userId) {
            return res.status(403).json({
              success: false,
              message: 'Vous n\'êtes pas autorisé à enregistrer un paiement pour cette charge'
            });
          }
        }
        else {
          return res.status(403).json({
            success: false,
            message: 'Vous n\'êtes pas autorisé à enregistrer un paiement pour cette charge'
          });
        }
      }

      // Get the proprietaire ID from the charge's appartement
      let proprietaireId = null;
      if (charge.appartementId) {
        const appartement = await Appartement.findById(charge.appartementId);
        if (appartement) {
          proprietaireId = appartement.proprietaireId;
        }
      }

      // Create the payment with confirmed status
      const paymentData = {
        montant,
        methodePaiement: methodePaiement || 'espèces',
        reference: reference || null,
        chargeId,
        proprietaireId,
        syndicId: req.userId,
        statut: 'confirmé', // Payments by syndics are automatically confirmed
        notes: notes || ''
      };

      const payment = await Payment.create(paymentData);

      // If there's a proprietaire, create a notification for them
      if (proprietaireId) {
        await Notification.create({
          userId: proprietaireId,
          title: 'Paiement confirmé',
          message: `Votre paiement de ${montant}€ pour la charge "${charge.titre}" a été confirmé. ${payment.isPartial ? `Montant restant à payer: ${payment.remainingAmount}€.` : 'La charge est entièrement payée.'}`,
          type: 'success',
          relatedTo: 'payment',
          relatedId: payment.id
        });

        // Generate a payment receipt PDF
        try {
          const proprietaire = await Proprietaire.findById(proprietaireId);
          const appartement = await Appartement.findById(charge.appartementId);

          if (proprietaire && appartement) {
            const pdfsDir = ensureUploadsDirectory();
            const pdfFileName = `recu_paiement_${payment.id}.pdf`;
            const pdfPath = path.join(pdfsDir, pdfFileName);

            await generatePaymentReceiptPDF({
              payment,
              charge,
              proprietaire,
              appartement
            }, pdfPath);

            // Add the PDF path to the response
            payment.receiptPdfPath = `/uploads/pdfs/${pdfFileName}`;
          }
        } catch (pdfError) {
          console.error('Error generating payment receipt PDF:', pdfError);
          // Continue even if PDF generation fails
        }
      }

      // Return success response
      return res.status(201).json({
        success: true,
        message: 'Paiement enregistré et confirmé avec succès',
        payment: payment.toJSON()
      });
    }
    else {
      return res.status(403).json({
        success: false,
        message: 'Rôle non autorisé'
      });
    }
  } catch (error) {
    console.error('Error creating payment:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création du paiement'
    });
  }
};

// Confirm a payment (syndic only)
exports.confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the current user is a syndic
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can confirm payments'
      });
    }

    // Get the payment
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Check if the payment is already confirmed
    if (payment.statut === 'confirmé') {
      return res.status(400).json({
        success: false,
        message: 'Ce paiement est déjà confirmé'
      });
    }

    // Check if the syndic is authorized to confirm this payment
    if (payment.syndicId !== req.userId) {
      // Check if the syndic manages the immeuble related to this charge
      const charge = await Charge.findById(payment.chargeId);
      if (!charge) {
        return res.status(404).json({
          success: false,
          message: 'Charge non trouvée'
        });
      }

      let isAuthorized = false;

      if (charge.appartementId) {
        const appartement = await Appartement.findById(charge.appartementId);
        if (appartement) {
          const immeuble = await Immeuble.findById(appartement.immeubleId);
          if (immeuble && immeuble.syndicId === req.userId) {
            isAuthorized = true;
          }
        }
      } else if (charge.immeubleId) {
        const immeuble = await Immeuble.findById(charge.immeubleId);
        if (immeuble && immeuble.syndicId === req.userId) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à confirmer ce paiement'
        });
      }
    }

    // Update the payment status
    await payment.update({ statut: 'confirmé' });

    // Create a notification for the proprietaire
    if (payment.proprietaireId) {
      // Get the updated charge to show correct remaining amount
      const charge = await Charge.findById(payment.chargeId);

      await Notification.create({
        userId: payment.proprietaireId,
        title: 'Paiement confirmé',
        message: `Votre paiement de ${payment.montant}€ a été confirmé. ${charge.montantRestant > 0 ? `Montant restant à payer: ${charge.montantRestant}€.` : 'La charge est entièrement payée.'}`,
        type: 'success',
        relatedTo: 'payment',
        relatedId: payment.id
      });

      // Generate a payment receipt PDF
      try {
        const proprietaire = await Proprietaire.findById(payment.proprietaireId);
        let appartement = null;

        if (charge && charge.appartementId) {
          appartement = await Appartement.findById(charge.appartementId);
        } else {
          // Find any appartement owned by this proprietaire
          const appartements = await Appartement.findByProprietaireId(payment.proprietaireId);
          if (appartements.length > 0) {
            appartement = appartements[0];
          }
        }

        if (charge && proprietaire && appartement) {
          const pdfsDir = ensureUploadsDirectory();
          const pdfFileName = `recu_paiement_${payment.id}.pdf`;
          const pdfPath = path.join(pdfsDir, pdfFileName);

          await generatePaymentReceiptPDF({
            payment,
            charge,
            proprietaire,
            appartement
          }, pdfPath);

          // Add the PDF path to the response
          payment.receiptPdfPath = `/uploads/pdfs/${pdfFileName}`;
        }
      } catch (pdfError) {
        console.error('Error generating payment receipt PDF:', pdfError);
        // Continue even if PDF generation fails
      }
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Paiement confirmé avec succès',
      payment: payment.toJSON()
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la confirmation du paiement'
    });
  }
};

// Reject a payment (syndic only)
exports.rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Check if the current user is a syndic
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can reject payments'
      });
    }

    // Get the payment
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Check if the payment is already confirmed or rejected
    if (payment.statut === 'confirmé') {
      return res.status(400).json({
        success: false,
        message: 'Ce paiement est déjà confirmé et ne peut pas être rejeté'
      });
    }

    if (payment.statut === 'rejeté') {
      return res.status(400).json({
        success: false,
        message: 'Ce paiement est déjà rejeté'
      });
    }

    // Check if the syndic is authorized to reject this payment
    if (payment.syndicId !== req.userId) {
      // Check if the syndic manages the immeuble related to this charge
      const charge = await Charge.findById(payment.chargeId);
      if (!charge) {
        return res.status(404).json({
          success: false,
          message: 'Charge non trouvée'
        });
      }

      let isAuthorized = false;

      if (charge.appartementId) {
        const appartement = await Appartement.findById(charge.appartementId);
        if (appartement) {
          const immeuble = await Immeuble.findById(appartement.immeubleId);
          if (immeuble && immeuble.syndicId === req.userId) {
            isAuthorized = true;
          }
        }
      } else if (charge.immeubleId) {
        const immeuble = await Immeuble.findById(charge.immeubleId);
        if (immeuble && immeuble.syndicId === req.userId) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à rejeter ce paiement'
        });
      }
    }

    // Update the payment status and notes
    await payment.update({
      statut: 'rejeté',
      notes: reason || 'Paiement rejeté sans raison spécifiée'
    });

    // Create a notification for the proprietaire
    if (payment.proprietaireId) {
      await Notification.create({
        userId: payment.proprietaireId,
        title: 'Paiement rejeté',
        message: `Votre paiement de ${payment.montant}€ a été rejeté. Raison: ${reason || 'Non spécifiée'}`,
        type: 'error',
        relatedTo: 'payment',
        relatedId: payment.id
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Paiement rejeté avec succès',
      payment: payment.toJSON()
    });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors du rejet du paiement'
    });
  }
};

// Get all payments (syndic only)
exports.getAllPayments = async (req, res) => {
  try {
    // Check if the current user is a syndic
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can view all payments'
      });
    }

    // Get all payments for this syndic
    const payments = await Payment.findBySyndicId(req.userId);

    // Return the payments
    return res.status(200).json({
      success: true,
      count: payments.length,
      payments: payments.map(p => p.toJSON())
    });
  } catch (error) {
    console.error('Error getting payments:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des paiements'
    });
  }
};

// Get payments for a proprietaire
exports.getProprietairePayments = async (req, res) => {
  try {
    const { proprietaireId } = req.params;

    // If the user is a proprietaire, they can only view their own payments
    if (req.userRole === 'proprietaire' && req.userId !== proprietaireId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez consulter que vos propres paiements'
      });
    }

    // If the user is a syndic, check if they manage any immeuble where this proprietaire has appartements
    if (req.userRole === 'syndic') {
      const appartements = await Appartement.findByProprietaireId(proprietaireId);

      if (appartements.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Aucun appartement trouvé pour ce propriétaire'
        });
      }

      let hasAccess = false;
      for (const appartement of appartements) {
        const immeuble = await Immeuble.findById(appartement.immeubleId);
        if (immeuble && immeuble.syndicId === req.userId) {
          hasAccess = true;
          break;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à consulter les paiements de ce propriétaire'
        });
      }
    }

    // Get payments for this proprietaire
    const payments = await Payment.findByProprietaireId(proprietaireId);

    // Return the payments
    return res.status(200).json({
      success: true,
      count: payments.length,
      payments: payments.map(p => p.toJSON())
    });
  } catch (error) {
    console.error('Error getting proprietaire payments:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des paiements du propriétaire'
    });
  }
};

// Get payment history for a proprietaire
exports.getPaymentHistory = async (req, res) => {
  try {
    const { proprietaireId } = req.params;
    const { startDate, endDate, format } = req.query;

    // If the user is a proprietaire, they can only view their own payment history
    if (req.userRole === 'proprietaire' && req.userId !== proprietaireId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez consulter que votre propre historique de paiements'
      });
    }

    // If the user is a syndic, check if they manage any immeuble where this proprietaire has appartements
    if (req.userRole === 'syndic') {
      const appartements = await Appartement.findByProprietaireId(proprietaireId);

      if (appartements.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Aucun appartement trouvé pour ce propriétaire'
        });
      }

      let hasAccess = false;
      for (const appartement of appartements) {
        const immeuble = await Immeuble.findById(appartement.immeubleId);
        if (immeuble && immeuble.syndicId === req.userId) {
          hasAccess = true;
          break;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à consulter l\'historique de paiements de ce propriétaire'
        });
      }
    }

    // Default date range to current year if not provided
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]; // January 1st of current year
    const defaultEndDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]; // December 31st of current year

    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || defaultEndDate;

    // Get payment history for this proprietaire
    const payments = await Payment.getPaymentHistory(proprietaireId, effectiveStartDate, effectiveEndDate);

    // Get all charges for this proprietaire in the date range
    const appartements = await Appartement.findByProprietaireId(proprietaireId);
    const charges = [];

    for (const appartement of appartements) {
      const appartementCharges = await Charge.findByAppartementId(appartement.id);

      // Filter charges by date range
      const filteredCharges = appartementCharges.filter(charge => {
        const chargeDate = new Date(charge.dateEcheance);
        const start = new Date(effectiveStartDate);
        const end = new Date(effectiveEndDate);
        return chargeDate >= start && chargeDate <= end;
      });

      charges.push(...filteredCharges);
    }

    // Get proprietaire details
    const proprietaire = await Proprietaire.findById(proprietaireId);
    if (!proprietaire) {
      return res.status(404).json({
        success: false,
        message: 'Propriétaire non trouvé'
      });
    }

    // If PDF format is requested, generate a PDF
    if (format === 'pdf') {
      try {
        const pdfsDir = ensureUploadsDirectory();
        const pdfFileName = `historique_paiements_${proprietaireId}_${effectiveStartDate}_${effectiveEndDate}.pdf`;
        const pdfPath = path.join(pdfsDir, pdfFileName);

        await generatePaymentHistoryPDF({
          proprietaire,
          payments,
          charges
        }, effectiveStartDate, effectiveEndDate, pdfPath);

        // Return the PDF file
        return res.status(200).json({
          success: true,
          message: 'Historique de paiements généré avec succès',
          pdfUrl: `/uploads/pdfs/${pdfFileName}`
        });
      } catch (pdfError) {
        console.error('Error generating payment history PDF:', pdfError);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la génération du PDF d\'historique de paiements'
        });
      }
    }

    // Update charge payment information based on confirmed payments
    for (const charge of charges) {
      // Get all confirmed payments for this charge
      const chargePayments = payments.filter(p =>
        p.chargeId === charge.id && p.statut === 'confirmé'
      );

      // Calculate total paid amount
      const totalPaid = chargePayments.reduce((sum, payment) =>
        sum + parseFloat(payment.montant), 0
      );

      // Update charge payment information
      charge.montantPaye = totalPaid;
      charge.montantRestant = Math.max(0, parseFloat(charge.montant) - totalPaid);
    }

    // Return the payment history as JSON
    return res.status(200).json({
      success: true,
      proprietaire: proprietaire.toJSON(),
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      payments: payments.map(p => p.toJSON()),
      charges: charges.map(c => c.toJSON())
    });
  } catch (error) {
    console.error('Error getting payment history:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération de l\'historique de paiements'
    });
  }
};

// Generate a payment reminder (Avis Client) for a charge
exports.generatePaymentReminder = async (req, res) => {
  try {
    const { chargeId } = req.params;

    // Check if the current user is a syndic
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can generate payment reminders'
      });
    }

    // Get the charge
    const charge = await Charge.findById(chargeId);
    if (!charge) {
      return res.status(404).json({
        success: false,
        message: 'Charge non trouvée'
      });
    }

    // Check if the charge is already fully paid
    if (charge.statut === 'payé') {
      return res.status(400).json({
        success: false,
        message: 'Cette charge est déjà payée intégralement'
      });
    }

    // Check if the syndic is authorized to generate a reminder for this charge
    if (charge.syndicId !== req.userId) {
      // Check if the syndic manages the immeuble related to this charge
      let isAuthorized = false;

      if (charge.appartementId) {
        const appartement = await Appartement.findById(charge.appartementId);
        if (appartement) {
          const immeuble = await Immeuble.findById(appartement.immeubleId);
          if (immeuble && immeuble.syndicId === req.userId) {
            isAuthorized = true;
          }
        }
      } else if (charge.immeubleId) {
        const immeuble = await Immeuble.findById(charge.immeubleId);
        if (immeuble && immeuble.syndicId === req.userId) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à générer un rappel pour cette charge'
        });
      }
    }

    // Get the proprietaire and appartement
    let proprietaire = null;
    let appartement = null;
    let immeuble = null;

    if (charge.appartementId) {
      appartement = await Appartement.findById(charge.appartementId);
      if (appartement) {
        proprietaire = await Proprietaire.findById(appartement.proprietaireId);
        immeuble = await Immeuble.findById(appartement.immeubleId);
      }
    }

    if (!proprietaire || !appartement || !immeuble) {
      return res.status(404).json({
        success: false,
        message: 'Impossible de trouver les informations nécessaires pour générer le rappel'
      });
    }

    // Get previous payments for this charge
    const payments = await Payment.findByChargeId(chargeId);

    // Generate the PDF reminder (Avis Client)
    const pdfsDir = ensureUploadsDirectory();
    const pdfFileName = `avis_client_${chargeId}_${new Date().getTime()}.pdf`;
    const pdfPath = path.join(pdfsDir, pdfFileName);

    await generatePaymentReminderPDF({
      charge,
      proprietaire,
      appartement,
      immeuble,
      payments
    }, pdfPath);

    // Create a notification for the proprietaire with the PDF link
    const pdfUrl = `/uploads/pdfs/${pdfFileName}`;
    const notification = await Notification.create({
      userId: proprietaire.id,
      title: 'Avis de paiement',
      message: `Un avis de paiement a été généré pour la charge "${charge.titre}". Montant restant à payer: ${charge.montantRestant}€.`,
      type: 'warning',
      relatedTo: 'charge',
      relatedId: charge.id,
      pdfUrl: pdfUrl
    });

    // Mark the charge as overdue if it's not already and update the last reminder date
    if (charge.statut !== 'en retard') {
      await charge.markAsOverdue();
    } else {
      // Just update the last reminder date
      await db.collection('charges').doc(charge.id).update({
        dernierRappel: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Avis client généré avec succès',
      pdfUrl: pdfUrl,
      notification: notification.toJSON()
    });
  } catch (error) {
    console.error('Error generating payment reminder:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la génération de l\'avis client'
    });
  }
};

// Get a single payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the payment
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Check if the user is authorized to view this payment
    if (req.userRole === 'proprietaire' && req.userId !== payment.proprietaireId) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à consulter ce paiement'
      });
    }

    if (req.userRole === 'syndic' && req.userId !== payment.syndicId) {
      // Check if the syndic manages the immeuble related to this payment
      const charge = await Charge.findById(payment.chargeId);
      if (!charge) {
        return res.status(404).json({
          success: false,
          message: 'Charge non trouvée'
        });
      }

      let isAuthorized = false;

      if (charge.appartementId) {
        const appartement = await Appartement.findById(charge.appartementId);
        if (appartement) {
          const immeuble = await Immeuble.findById(appartement.immeubleId);
          if (immeuble && immeuble.syndicId === req.userId) {
            isAuthorized = true;
          }
        }
      } else if (charge.immeubleId) {
        const immeuble = await Immeuble.findById(charge.immeubleId);
        if (immeuble && immeuble.syndicId === req.userId) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à consulter ce paiement'
        });
      }
    }

    // Return the payment
    return res.status(200).json({
      success: true,
      payment: payment.toJSON()
    });
  } catch (error) {
    console.error('Error getting payment:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération du paiement'
    });
  }
};
