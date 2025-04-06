// routes/appartement-routes.js
const express = require('express');
const router = express.Router();
const { verifyToken, isSyndic } = require('../middleware/auth-middleware');
const Appartement = require('../models/appartement');
const Immeuble = require('../models/immeuble');

// All routes require authentication
router.use(verifyToken);

// Get all appartements (syndic only)
router.get('/', async (req, res) => {
  try {
    // Check if the current user is a syndic
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can view all appartements'
      });
    }

    // Get all appartements
    const appartements = await Appartement.findAll();

    // Return the appartements
    return res.status(200).json({
      success: true,
      count: appartements.length,
      appartements: appartements.map(a => a.toJSON())
    });
  } catch (error) {
    console.error('Error getting appartements:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting appartements'
    });
  }
});

// Get appartements by immeuble ID
router.get('/immeuble/:immeubleId', async (req, res) => {
  try {
    const { immeubleId } = req.params;

    // Check if the current user is a syndic
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can view appartements by immeuble'
      });
    }

    // Check if the immeuble exists
    const immeuble = await Immeuble.findById(immeubleId);
    if (!immeuble) {
      return res.status(404).json({
        success: false,
        message: 'Immeuble not found'
      });
    }

    // Check if the syndic manages this immeuble
    if (immeuble.syndicId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view appartements in this immeuble'
      });
    }

    // Get appartements for this immeuble
    const appartements = await Appartement.findByImmeubleId(immeubleId);

    // Return the appartements
    return res.status(200).json({
      success: true,
      count: appartements.length,
      appartements: appartements.map(a => a.toJSON())
    });
  } catch (error) {
    console.error('Error getting appartements by immeuble:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting appartements by immeuble'
    });
  }
});

// Get vacant appartements
router.get('/vacant', async (req, res) => {
  try {
    // Check if the current user is a syndic
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can view vacant appartements'
      });
    }

    // Get all appartements
    const allAppartements = await Appartement.findAll();
    
    // Filter vacant appartements (those without a proprietaireId)
    const vacantAppartements = allAppartements.filter(a => !a.proprietaireId);

    // Return the vacant appartements
    return res.status(200).json({
      success: true,
      count: vacantAppartements.length,
      appartements: vacantAppartements.map(a => a.toJSON())
    });
  } catch (error) {
    console.error('Error getting vacant appartements:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting vacant appartements'
    });
  }
});

// Get a single appartement by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the appartement
    const appartement = await Appartement.findById(id);
    if (!appartement) {
      return res.status(404).json({
        success: false,
        message: 'Appartement not found'
      });
    }

    // Check if the user is authorized to view this appartement
    if (req.userRole === 'proprietaire') {
      // Proprietaires can only view their own appartements
      if (appartement.proprietaireId !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this appartement'
        });
      }
    } else if (req.userRole === 'syndic') {
      // Syndics can only view appartements in immeubles they manage
      const immeuble = await Immeuble.findById(appartement.immeubleId);
      if (!immeuble || immeuble.syndicId !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this appartement'
        });
      }
    }

    // Return the appartement
    return res.status(200).json({
      success: true,
      appartement: appartement.toJSON()
    });
  } catch (error) {
    console.error('Error getting appartement:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting appartement'
    });
  }
});

module.exports = router;
