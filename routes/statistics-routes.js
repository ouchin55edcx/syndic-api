const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth-middleware');
const statisticsController = require('../controllers/statistics-controller');

router.use(verifyToken);

router.get('/dashboard', statisticsController.getDashboardStats);
router.get('/payments', statisticsController.getPaymentStats);
router.get('/charges', statisticsController.getChargeStats);
router.get('/proprietaires', statisticsController.getProprietaireStats);
router.get('/appartements', statisticsController.getAppartementStats);

module.exports = router;