const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeFunctions = require('../middleware/authorizeFunctions');

// Rotas read-only para logs
router.get('/', authenticateToken, authorizeFunctions('logs.visualizar_logs'), logsController.getAllLogs);
router.get('/:id', authenticateToken, authorizeFunctions('logs.visualizar_logs'), logsController.getLogById);

module.exports = router;


