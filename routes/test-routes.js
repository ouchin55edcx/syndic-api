
const express = require('express');
const router = express.Router();
const testController = require('../controllers/test-controller');


router.get('/items', testController.getAllItems);


router.post('/items', testController.createItem);

module.exports = router;
