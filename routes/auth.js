const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeFunctions = require('../middleware/authorizeFunctions');

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/impersonate', authenticateToken, authorizeFunctions('adm.impersonate_user'), authController.impersonate);

module.exports = router;
