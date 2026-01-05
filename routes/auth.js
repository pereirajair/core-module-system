
const pathResolver = require('../utils/pathResolver');
const backendPath = pathResolver.getBackendPath();

const express = require(backendPath + '/node_modules/express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeFunctions = require('../middleware/authorizeFunctions');

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/impersonate', authenticateToken, authorizeFunctions('adm.impersonate_user'), authController.impersonate);

module.exports = router;
