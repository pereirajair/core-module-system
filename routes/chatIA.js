const pathResolver = require('../utils/pathResolver');
const backendPath = pathResolver.getBackendPath();
const express = require(backendPath + '/node_modules/express');
const router = express.Router();
const chatIAController = require('../controllers/chatIAController');
const authenticateToken = require('../middleware/authenticateToken');

// Chat com IA
router.post('/', authenticateToken, chatIAController.chatIA);

module.exports = router;

