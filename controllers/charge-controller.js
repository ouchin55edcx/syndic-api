const Charge = require('../models/charge');
const Appartement = require('../models/appartement');
const Immeuble = require('../models/immeuble');
const Proprietaire = require('../models/proprietaire');
const { admin } = require('../config/firebase-config');

exports.createCharge = async (req, res) => {
  try {
    // Check if the current user is a syndic
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can create charges'
      });
    }

    const {
      titre,
      description,
      montant,
      dateEcheance,
      appartementId,
      categorie
    } = req.body;

    if (!titre || !montant || !dateEcheance || !appartementId) {
      return res.status(400).json({
        success: false,
        message: 'Titre, montant, date d\'échéance et ID d\'appartement sont requis'
      });
    }

    const appartement = await Appartement.findById(appartementId);
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
        message: 'Vous n\'êtes pas autorisé à créer des charges pour cet appartement'
      });
    }

    const chargeData = {
      titre,
      description: description || '',
      montant,
      dateEcheance,
      statut: 'non payé',
      appartementId,
      syndicId: req.userId,
      categorie: categorie || 'général'
    };

    const charge = await Charge.create(chargeData);

    return res.status(201).json({
      success: true,
      message: 'Charge créée avec succès',
      charge: charge.toJSON()
    });
  } catch (error) {
    console.error('Error creating charge:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création de la charge'
    });
  }
};

exports.getAllCharges = async (req, res) => {
  try {
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can view all charges'
      });
    }

    const charges = await Charge.findBySyndicId(req.userId);

    return res.status(200).json({
      success: true,
      count: charges.length,
      charges: charges.map(c => c.toJSON())
    });
  } catch (error) {
    console.error('Error getting charges:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des charges'
    });
  }
};

exports.getChargesByAppartement = async (req, res) => {
  try {
    const { appartementId } = req.params;

    const appartement = await Appartement.findById(appartementId);

    if (!appartement) {
      return res.status(404).json({
        success: false,
        message: 'Appartement non trouvé'
      });
    }

    if (req.userRole === 'proprietaire' && appartement.proprietaireId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à voir les charges de cet appartement'
      });
    }

    if (req.userRole === 'syndic') {
      // Check if the syndic manages the immeuble that contains this appartement
      const immeuble = await Immeuble.findById(appartement.immeubleId);
      if (!immeuble || immeuble.syndicId !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à voir les charges de cet appartement'
        });
      }
    }

    const charges = await Charge.findByAppartementId(appartementId);

    return res.status(200).json({
      success: true,
      count: charges.length,
      charges: charges.map(c => c.toJSON())
    });
  } catch (error) {
    console.error('Error getting charges by appartement:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des charges'
    });
  }
};

exports.getChargesByProprietaire = async (req, res) => {
  try {
    const { proprietaireId } = req.params;

    const proprietaire = await Proprietaire.findById(proprietaireId);
    if (!proprietaire) {
      return res.status(404).json({
        success: false,
        message: 'Propriétaire non trouvé'
      });
    }

    if (req.userRole === 'proprietaire' && req.userId !== proprietaireId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez consulter que vos propres charges'
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
          message: 'Vous n\'\u00eates pas autorisé à consulter les charges de ce propriétaire'
        });
      }
    }

    const charges = await Charge.findByProprietaireId(proprietaireId);

    const appartements = await Appartement.findByProprietaireId(proprietaireId);
    const chargesByAppartement = {};

    for (const appartement of appartements) {
      chargesByAppartement[appartement.id] = {
        appartementInfo: appartement.toJSON(),
        charges: charges
          .filter(charge => charge.appartementId === appartement.id)
          .map(charge => charge.toJSON())
      };
    }

    const totalCharges = charges.reduce((sum, charge) => sum + parseFloat(charge.montant), 0);
    const totalPaid = charges.reduce((sum, charge) => sum + parseFloat(charge.montantPaye), 0);
    const totalRemaining = charges.reduce((sum, charge) => sum + parseFloat(charge.montantRestant), 0);

    return res.status(200).json({
      success: true,
      proprietaireId,
      proprietaireName: `${proprietaire.firstName} ${proprietaire.lastName}`,
      totalCharges,
      totalPaid,
      totalRemaining,
      count: charges.length,
      chargesByAppartement,
      charges: charges.map(c => c.toJSON())
    });
  } catch (error) {
    console.error('Error getting charges by proprietaire:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des charges'
    });
  }
};

exports.getChargeById = async (req, res) => {
  try {
    const { id } = req.params;

    const charge = await Charge.findById(id);

    if (!charge) {
      return res.status(404).json({
        success: false,
        message: 'Charge non trouvée'
      });
    }

    if (req.userRole === 'syndic' && charge.syndicId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à voir cette charge'
      });
    }

    if (req.userRole === 'proprietaire') {
      const appartement = await Appartement.findById(charge.appartementId);
      if (!appartement || appartement.proprietaireId !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à voir cette charge'
        });
      }
    }

    return res.status(200).json({
      success: true,
      charge: charge.toJSON()
    });
  } catch (error) {
    console.error('Error getting charge:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération de la charge'
    });
  }
};

exports.updateCharge = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can update charges'
      });
    }

    const charge = await Charge.findById(id);

    if (!charge) {
      return res.status(404).json({
        success: false,
        message: 'Charge non trouvée'
      });
    }

    if (charge.syndicId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez modifier que les charges que vous avez créées'
      });
    }

    const updatedCharge = await charge.update(req.body);

    return res.status(200).json({
      success: true,
      message: 'Charge mise à jour avec succès',
      charge: updatedCharge.toJSON()
    });
  } catch (error) {
    console.error('Error updating charge:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour de la charge'
    });
  }
};

exports.deleteCharge = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can delete charges'
      });
    }

    const charge = await Charge.findById(id);

    if (!charge) {
      return res.status(404).json({
        success: false,
        message: 'Charge non trouvée'
      });
    }

    if (charge.syndicId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez supprimer que les charges que vous avez créées'
      });
    }

    await charge.delete();

    return res.status(200).json({
      success: true,
      message: 'Charge supprimée avec succès'
    });
  } catch (error) {
    console.error('Error deleting charge:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression de la charge'
    });
  }
};
