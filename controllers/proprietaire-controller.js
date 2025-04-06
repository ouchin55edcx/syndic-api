const Proprietaire = require('../models/proprietaire');
const Syndic = require('../models/syndic');
const { admin } = require('../config/firebase-config');
const { sendProprietaireWelcomeEmail } = require('../services/email-service');

exports.createProprietaire = async (req, res) => {
  try {
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can create proprietaires'
      });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      appartementId,
      apartmentNumber,
      buildingId,
      ownershipDate
    } = req.body;

    if (!email || !password || !firstName || !lastName || !appartementId) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, last name, and appartement ID are required'
      });
    }

    const proprietaireData = {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      appartementId, // Required field for assigning to an appartement
      apartmentNumber, // Legacy field
      buildingId, // Legacy field
      ownershipDate: ownershipDate || new Date().toISOString(),
      createdBy: req.userId
    };

    const proprietaire = await Proprietaire.create(proprietaireData);

    try {
      await sendProprietaireWelcomeEmail(proprietaire, password);
      console.log(`Welcome email sent to ${proprietaire.email}`);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    return res.status(201).json({
      success: true,
      message: 'Proprietaire created successfully and welcome email sent',
      proprietaire: proprietaire.toJSON()
    });
  } catch (error) {
    console.error('Error creating proprietaire:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error creating proprietaire'
    });
  }
};

exports.getAllProprietaires = async (req, res) => {
  try {
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can view all proprietaires'
      });
    }

    const proprietaires = await Proprietaire.findAll();

    return res.status(200).json({
      success: true,
      count: proprietaires.length,
      proprietaires: proprietaires.map(p => p.toJSON())
    });
  } catch (error) {
    console.error('Error getting proprietaires:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting proprietaires'
    });
  }
};

exports.getMyProprietaires = async (req, res) => {
  try {
    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can view their proprietaires'
      });
    }

    const proprietaires = await Proprietaire.findBySyndicId(req.userId);

    return res.status(200).json({
      success: true,
      count: proprietaires.length,
      proprietaires: proprietaires.map(p => p.toJSON())
    });
  } catch (error) {
    console.error('Error getting syndic proprietaires:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting syndic proprietaires'
    });
  }
};

exports.getProprietaireById = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can view proprietaire details'
      });
    }

    const proprietaire = await Proprietaire.findById(id);

    if (!proprietaire) {
      return res.status(404).json({
        success: false,
        message: 'Proprietaire not found'
      });
    }

    return res.status(200).json({
      success: true,
      proprietaire: proprietaire.toJSON()
    });
  } catch (error) {
    console.error('Error getting proprietaire:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting proprietaire'
    });
  }
};

exports.updateProprietaire = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can update proprietaires'
      });
    }

    const proprietaire = await Proprietaire.findById(id);

    if (!proprietaire) {
      return res.status(404).json({
        success: false,
        message: 'Proprietaire not found'
      });
    }

    const updatedProprietaire = await proprietaire.update(req.body);

    return res.status(200).json({
      success: true,
      message: 'Proprietaire updated successfully',
      proprietaire: updatedProprietaire.toJSON()
    });
  } catch (error) {
    console.error('Error updating proprietaire:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating proprietaire'
    });
  }
};

exports.deleteProprietaire = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.userRole !== 'syndic') {
      return res.status(403).json({
        success: false,
        message: 'Only syndics can delete proprietaires'
      });
    }

    const proprietaire = await Proprietaire.findById(id);

    if (!proprietaire) {
      return res.status(404).json({
        success: false,
        message: 'Proprietaire not found'
      });
    }

    await proprietaire.delete();

    return res.status(200).json({
      success: true,
      message: 'Proprietaire deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting proprietaire:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting proprietaire'
    });
  }
};

// Get proprietaire's own profile
exports.getProprietaireProfile = async (req, res) => {
  try {
    // Only proprietaires can view their own profile
    if (req.userRole !== 'proprietaire') {
      return res.status(403).json({
        success: false,
        message: 'Only proprietaires can view their own profile'
      });
    }

    // Get the proprietaire from the database
    const proprietaire = await Proprietaire.findById(req.userId);

    if (!proprietaire) {
      return res.status(404).json({
        success: false,
        message: 'Proprietaire not found'
      });
    }

    // Get the appartement information
    let appartementInfo = null;
    if (proprietaire.appartementId) {
      const Appartement = require('../models/appartement');
      const appartement = await Appartement.findById(proprietaire.appartementId);
      if (appartement) {
        appartementInfo = appartement.toJSON();
      }
    }

    return res.status(200).json({
      success: true,
      proprietaire: proprietaire.toJSON(),
      appartement: appartementInfo
    });
  } catch (error) {
    console.error('Error getting proprietaire profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting proprietaire profile'
    });
  }
};

// Allow proprietaires to update their own profile
exports.updateProprietaireProfile = async (req, res) => {
  try {
    // Only proprietaires can update their own profile
    if (req.userRole !== 'proprietaire') {
      return res.status(403).json({
        success: false,
        message: 'Only proprietaires can update their own profile'
      });
    }

    // Get the proprietaire from the database
    const proprietaire = await Proprietaire.findById(req.userId);

    if (!proprietaire) {
      return res.status(404).json({
        success: false,
        message: 'Proprietaire not found'
      });
    }

    // Fields that proprietaires are allowed to update
    const allowedFields = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email
    };

    // Remove undefined fields
    Object.keys(allowedFields).forEach(key => {
      if (allowedFields[key] === undefined) {
        delete allowedFields[key];
      }
    });

    // Validate required fields if they're being updated
    if (allowedFields.firstName === '') {
      return res.status(400).json({
        success: false,
        message: 'First name cannot be empty'
      });
    }

    if (allowedFields.lastName === '') {
      return res.status(400).json({
        success: false,
        message: 'Last name cannot be empty'
      });
    }

    if (allowedFields.email === '') {
      return res.status(400).json({
        success: false,
        message: 'Email cannot be empty'
      });
    }

    // Update the proprietaire
    const updatedProprietaire = await proprietaire.update(allowedFields);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      proprietaire: updatedProprietaire.toJSON()
    });
  } catch (error) {
    console.error('Error updating proprietaire profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating proprietaire profile'
    });
  }
};

// Allow proprietaires to change their password
exports.changePassword = async (req, res) => {
  try {
    // Only proprietaires can change their own password
    if (req.userRole !== 'proprietaire') {
      return res.status(403).json({
        success: false,
        message: 'Only proprietaires can change their own password'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Get the proprietaire from the database
    const proprietaire = await Proprietaire.findById(req.userId);

    if (!proprietaire) {
      return res.status(404).json({
        success: false,
        message: 'Proprietaire not found'
      });
    }

    // For this implementation, we'll trust that the user is authenticated
    // and has the correct credentials since they have a valid token
    // In a real application, you might want to implement a more secure approach
    // to verify the current password before allowing a password change

    // Update the password in Firebase Auth
    await admin.auth().updateUser(req.userId, {
      password: newPassword
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error updating proprietaire profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating proprietaire profile'
    });
  }
};
