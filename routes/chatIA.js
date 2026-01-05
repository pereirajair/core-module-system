const express = require('express');
const router = express.Router();
const chatIAController = require('../controllers/chatIAController');
const authenticateToken = require('../middleware/authenticateToken');

// Chat com IA
router.post('/', authenticateToken, chatIAController.chatIA);

module.exports = router;

