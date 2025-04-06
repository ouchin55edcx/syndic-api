// routes/charge-routes.js
const express = require('express');
const router = express.Router();
const chargeController = require('../controllers/charge-controller');
const { verifyToken } = require('../middleware/auth-middleware');

// All routes require authentication
router.use(verifyToken);

// Create a new charge (syndic only)
router.post('/', chargeController.createCharge);

// Get all charges (syndic only)
router.get('/', chargeController.getAllCharges);

// Get charges by appartement ID
router.get('/appartement/:appartementId', chargeController.getChargesByAppartement);

// Get charges by proprietaire ID
router.get('/proprietaire/:proprietaireId', chargeController.getChargesByProprietaire);

// Get a single charge by ID
router.get('/:id', chargeController.getChargeById);

// Update a charge (syndic only)
router.put('/:id', chargeController.updateCharge);

// Delete a charge (syndic only)
router.delete('/:id', chargeController.deleteCharge);

module.exports = router;
