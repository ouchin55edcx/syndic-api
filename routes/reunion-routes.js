const express = require('express');
const router = express.Router();
const reunionController = require('../controllers/reunion-controller');
const { verifyToken } = require('../middleware/auth-middleware');

router.use(verifyToken);

router.post('/', reunionController.createReunion);

router.get('/', reunionController.getAllReunions);

router.get('/my-reunions', reunionController.getMyReunions);

router.get('/my-proprietaire-reunions', reunionController.getMyProprietaireReunions);

router.get('/:id', reunionController.getReunionById);

router.put('/:id', reunionController.updateReunion);

router.delete('/:id', reunionController.deleteReunion);

router.put('/:id/cancel', reunionController.cancelReunion);

router.put('/:id/complete', reunionController.completeReunion);

router.post('/:id/invite', reunionController.inviteProprietaires);

router.get('/:id/invited', reunionController.getInvitedProprietaires);

router.put('/:id/attendance/:proprietaireId', reunionController.updateAttendance);

router.put('/:id/status', reunionController.updateInvitationStatus);

module.exports = router;
