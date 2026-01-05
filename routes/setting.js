const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeFunctions = require('../middleware/authorizeFunctions');

// Get setting value by module and name (with scope resolution)
router.get('/value/:moduleName/:name', authenticateToken, settingController.getSettingValue);

// CRUD routes
router.get('/', authenticateToken, authorizeFunctions('setting.visualizar_settings'), settingController.getAllSettings);
router.get('/:id', authenticateToken, authorizeFunctions('setting.visualizar_settings'), settingController.getSettingById);
router.post('/', authenticateToken, authorizeFunctions('setting.manter_settings'), settingController.createSetting);
router.put('/:id', authenticateToken, authorizeFunctions('setting.manter_settings'), settingController.updateSetting);
router.delete('/:id', authenticateToken, authorizeFunctions('setting.excluir_settings'), settingController.deleteSetting);

module.exports = router;
