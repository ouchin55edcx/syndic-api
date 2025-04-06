// routes/financial-report-routes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth-middleware');

// All routes require authentication
router.use(verifyToken);

// Placeholder for financial report routes
// These will be implemented in the future

module.exports = router;
