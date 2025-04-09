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

exports.createPayment = async (req, res) => {
  try {
    const {
      montant,
      methodePaiement,
      reference,
      chargeId,
      notes
    } = req.body;

    if (!montant || !chargeId) {
      return res.status(400).json({
        success: false,
        message: 'Montant et ID de charge sont requis'
      });
    }

    const charge = await Charge.findById(chargeId);
    if (!charge) {
      return res.status(404).json({
        success: false,
        message: 'Charge non trouvée'
      });
    }

    if (req.userRole === 'proprietaire') {
      const appartement = await Appartement.findById(charge.appartementId);
      if (!appartement || appartement.proprietaireId !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à payer cette charge'
        });
      }

      const paymentData = {
        montant,
        methodePaiement: methodePaiement || 'virement',
        reference: reference || null,
        chargeId,
        proprietaireId: req.userId,
        syndicId: charge.syndicId,
        statut: 'en attente',
        notes: notes || ''
      };

      const payment = await Payment.create(paymentData);

      await Notification.create({
        userId: charge.syndicId,
        title: 'Nouveau paiement en attente',
        message: `Un paiement de ${montant}€ a été effectué pour la charge "${charge.titre}" et est en attente de confirmation.`,
        type: 'info',
        relatedTo: 'payment',
        relatedId: payment.id
      });

      return res.status(201).json({
        success: true,
        message: 'Paiement enregistré avec succès et en attente de confirmation',
        payment: payment.toJSON()
      });
    }
    else if (req.userRole === 'syndic') {
      if (charge.syndicId !== req.userId) {
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

      let proprietaireId = null;
      if (charge.appartementId) {
        const appartement = await Appartement.findById(charge.appartementId);
        if (appartement) {
          proprietaireId = appartement.proprietaireId;
        }
      }

      const paymentData = {
        montant,
        methodePaiement: methodePaiement || 'espèces',
        reference: reference || null,
        chargeId,
        proprietaireId,
        syndicId: req.userId,
        statut: 'confirmé',
        notes: notes || ''
      };

      const payment = await Payment.create(paymentData);

      if (proprietaireId) {
        await Notification.create({
          userId: proprietaireId,
          title: 'Paiement confirmé',
          message: `Votre paiement de ${montant}€ pour la charge "${charge.titre}" a été confirmé. ${payment.isPartial ? `Montant restant à payer: ${payment.remainingAmount}€.` : 'La charge est entièrement payée.'}`,
          type: 'success',
          relatedTo: 'payment',
          relatedId: payment.id
        });

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

            payment.receiptPdfPath = `/uploads/pdfs/${pdfFileName}`;
          }
        } catch (pdfError) {
          console.error('Error generating payment receipt PDF:', pdfError);
        }
      }

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

exports.confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can confirm payments'
      });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    if (payment.statut === 'confirmé') {
      return res.status(400).json({
        success: false,
        message: 'Ce paiement est déjà confirmé'
      });
    }

    if (payment.syndicId !== req.userId) {
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

    await payment.update({ statut: 'confirmé' });

    if (payment.proprietaireId) {
      const charge = await Charge.findById(payment.chargeId);

      await Notification.create({
        userId: payment.proprietaireId,
        title: 'Paiement confirmé',
        message: `Votre paiement de ${payment.montant}€ a été confirmé. ${charge.montantRestant > 0 ? `Montant restant à payer: ${charge.montantRestant}€.` : 'La charge est entièrement payée.'}`,
        type: 'success',
        relatedTo: 'payment',
        relatedId: payment.id
      });

      try {
        const proprietaire = await Proprietaire.findById(payment.proprietaireId);
        let appartement = null;

        if (charge && charge.appartementId) {
          appartement = await Appartement.findById(charge.appartementId);
        } else {
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

          payment.receiptPdfPath = `/uploads/pdfs/${pdfFileName}`;
        }
      } catch (pdfError) {
        console.error('Error generating payment receipt PDF:', pdfError);
      }
    }

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

exports.rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can reject payments'
      });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

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

    if (payment.syndicId !== req.userId) {
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

    await payment.update({
      statut: 'rejeté',
      notes: reason || 'Paiement rejeté sans raison spécifiée'
    });

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

exports.getAllPayments = async (req, res) => {
  try {
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can view all payments'
      });
    }

    const payments = await Payment.findBySyndicId(req.userId);

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

exports.getProprietairePayments = async (req, res) => {
  try {
    const { proprietaireId } = req.params;

    if (req.userRole === 'proprietaire' && req.userId !== proprietaireId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez consulter que vos propres paiements'
      });
    }

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

    const payments = await Payment.findByProprietaireId(proprietaireId);

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

exports.getPaymentHistory = async (req, res) => {
  try {
    const { proprietaireId } = req.params;
    const { startDate, endDate, format } = req.query;

    if (req.userRole === 'proprietaire' && req.userId !== proprietaireId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez consulter que votre propre historique de paiements'
      });
    }

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

    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]; // January 1st of current year
    const defaultEndDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]; // December 31st of current year

    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || defaultEndDate;

    const payments = await Payment.getPaymentHistory(proprietaireId, effectiveStartDate, effectiveEndDate);

    const appartements = await Appartement.findByProprietaireId(proprietaireId);
    const charges = [];

    for (const appartement of appartements) {
      const appartementCharges = await Charge.findByAppartementId(appartement.id);

      const filteredCharges = appartementCharges.filter(charge => {
        const chargeDate = new Date(charge.dateEcheance);
        const start = new Date(effectiveStartDate);
        const end = new Date(effectiveEndDate);
        return chargeDate >= start && chargeDate <= end;
      });

      charges.push(...filteredCharges);
    }

    const proprietaire = await Proprietaire.findById(proprietaireId);
    if (!proprietaire) {
      return res.status(404).json({
        success: false,
        message: 'Propriétaire non trouvé'
      });
    }

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

    for (const charge of charges) {
      const chargePayments = payments.filter(p =>
        p.chargeId === charge.id && p.statut === 'confirmé'
      );

      const totalPaid = chargePayments.reduce((sum, payment) =>
        sum + parseFloat(payment.montant), 0
      );

      charge.montantPaye = totalPaid;
      charge.montantRestant = Math.max(0, parseFloat(charge.montant) - totalPaid);
    }

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

exports.generatePaymentReminder = async (req, res) => {
  try {
    const { chargeId } = req.params;

    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can generate payment reminders'
      });
    }

    const charge = await Charge.findById(chargeId);
    if (!charge) {
      return res.status(404).json({
        success: false,
        message: 'Charge non trouvée'
      });
    }

    // Check if the charge is actually fully paid by calculating the total payments
    const chargePayments = await Payment.findByChargeId(chargeId);
    const confirmedPayments = chargePayments.filter(p => p.statut === 'confirmé');
    const totalPaid = confirmedPayments.reduce((sum, payment) =>
      sum + parseFloat(payment.montant), 0
    );
    const chargeMontant = parseFloat(charge.montant);

    // Only block sending notice if the charge is actually fully paid
    if (totalPaid >= chargeMontant) {
      return res.status(400).json({
        success: false,
        message: 'Cette charge est déjà payée intégralement'
      });
    }

    // If the status is 'payé' but the charge is not actually fully paid,
    // update the charge status to reflect the actual payment status
    if (charge.statut === 'payé' && totalPaid < chargeMontant) {
      await db.collection('charges').doc(chargeId).update({
        statut: 'partiellement payé',
        montantPaye: totalPaid,
        montantRestant: chargeMontant - totalPaid,
        updatedAt: new Date().toISOString()
      });

      // Update the charge object for use in the rest of this function
      charge.statut = 'partiellement payé';
      charge.montantPaye = totalPaid;
      charge.montantRestant = chargeMontant - totalPaid;
    }

    if (charge.syndicId !== req.userId) {
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

    // Use the payments we already fetched above
    const pdfsDir = ensureUploadsDirectory();
    const pdfFileName = `avis_client_${chargeId}_${new Date().getTime()}.pdf`;
    const pdfPath = path.join(pdfsDir, pdfFileName);

    await generatePaymentReminderPDF({
      charge,
      proprietaire,
      appartement,
      immeuble,
      payments: chargePayments
    }, pdfPath);

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

    if (charge.statut !== 'en retard') {
      await charge.markAsOverdue();
    } else {
      await db.collection('charges').doc(charge.id).update({
        dernierRappel: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

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

exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    if (req.userRole === 'proprietaire' && req.userId !== payment.proprietaireId) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à consulter ce paiement'
      });
    }

    if (req.userRole === 'syndic' && req.userId !== payment.syndicId) {
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
