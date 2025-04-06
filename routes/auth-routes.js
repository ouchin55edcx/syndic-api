const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');

router.post('/login', authController.login);


router.post('/syndic/login', authController.syndicLogin);


router.post('/proprietaire/login', authController.proprietaireLogin);


router.get('/profile', authController.getProfile);

module.exports = router;
