// routes/payment-routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment-controller');
const { verifyToken } = require('../middleware/auth-middleware');

// All routes require authentication
router.use(verifyToken);

// Create a new payment
router.post('/', paymentController.createPayment);

// Get all payments (syndic only)
router.get('/', paymentController.getAllPayments);

// Get a single payment by ID
router.get('/:id', paymentController.getPaymentById);

// Get payments for a proprietaire
router.get('/proprietaire/:proprietaireId', paymentController.getProprietairePayments);

// Get payment history for a proprietaire
router.get('/history/:proprietaireId', paymentController.getPaymentHistory);

// Confirm a payment (syndic only)
router.put('/:id/confirm', paymentController.confirmPayment);

// Reject a payment (syndic only)
router.put('/:id/reject', paymentController.rejectPayment);

// Generate a payment reminder for a charge (syndic only)
router.post('/reminder/:chargeId', paymentController.generatePaymentReminder);

module.exports = router;
