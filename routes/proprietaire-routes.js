const express = require('express');
const router = express.Router();
const proprietaireController = require('../controllers/proprietaire-controller');
const { verifyToken, isSyndic } = require('../middleware/auth-middleware');

router.use(verifyToken);

// Routes for proprietaires to manage their own profile
router.get('/profile', proprietaireController.getProprietaireProfile);
router.put('/profile/update', proprietaireController.updateProprietaireProfile);
router.put('/profile/change-password', proprietaireController.changePassword);

// Routes that require syndic access
router.post('/', isSyndic, proprietaireController.createProprietaire);
router.get('/', isSyndic, proprietaireController.getAllProprietaires);
router.get('/my-proprietaires', isSyndic, proprietaireController.getMyProprietaires);
router.get('/:id', isSyndic, proprietaireController.getProprietaireById);
router.put('/:id', isSyndic, proprietaireController.updateProprietaire);
router.delete('/:id', isSyndic, proprietaireController.deleteProprietaire);

module.exports = router;
