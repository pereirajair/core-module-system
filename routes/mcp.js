const express = require('express');
const router = express.Router();
const mcpController = require('../controllers/mcpController');
const authenticateToken = require('../middleware/authenticateToken');

// Servidor MCP - Model Context Protocol
// Suporta métodos: initialize, tools/list, tools/call
router.post('/', authenticateToken, mcpController.handleMCP);

module.exports = router;

