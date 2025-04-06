const User = require('../models/user');
const Syndic = require('../models/syndic');
const Proprietaire = require('../models/proprietaire');
const { admin } = require('../config/firebase-config');


const generateToken = async (user) => {
  try {

    const token = `${user.id}:${user.role}`;

    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    throw error;
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    try {
      const user = await User.authenticate(email, password);

      const token = await generateToken(user);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: user.toJSON(),
        token
      });
    } catch (authError) {
      console.error('Authentication error:', authError);
      return res.status(401).json({
        success: false,
        message: authError.message || 'Authentication failed'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

exports.syndicLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    try {
      const syndic = await Syndic.findByEmail(email);

      if (!syndic) {
        return res.status(401).json({
          success: false,
          message: 'Syndic not found'
        });
      }

      if (syndic.password !== password) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      const token = await generateToken(syndic);

      return res.status(200).json({
        success: true,
        message: 'Syndic login successful',
        user: syndic.toJSON(),
        token
      });
    } catch (authError) {
      console.error('Syndic authentication error:', authError);
      return res.status(401).json({
        success: false,
        message: authError.message || 'Syndic authentication failed'
      });
    }
  } catch (error) {
    console.error('Syndic login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during syndic login'
    });
  }
};

exports.getProfile = async (req, res) => {
  try {

    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error getting profile'
    });
  }
};

// Proprietaire login controller
exports.proprietaireLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    try {
      // Find the proprietaire by email
      const proprietaire = await Proprietaire.findByEmail(email);

      if (!proprietaire) {
        return res.status(401).json({
          success: false,
          message: 'Proprietaire not found'
        });
      }

      // Verify password
      if (proprietaire.password !== password) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Generate a token
      const token = await generateToken(proprietaire);

      // Return proprietaire data and token
      return res.status(200).json({
        success: true,
        message: 'Proprietaire login successful',
        user: proprietaire.toJSON(),
        token
      });
    } catch (authError) {
      console.error('Proprietaire authentication error:', authError);
      return res.status(401).json({
        success: false,
        message: authError.message || 'Proprietaire authentication failed'
      });
    }
  } catch (error) {
    console.error('Proprietaire login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during proprietaire login'
    });
  }
};