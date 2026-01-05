const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const authenticateToken = require('../../../middleware/authenticateToken');
const authorizeFunctions = require('../../../middleware/authorizeFunctions');

router.get('/', authenticateToken, authorizeFunctions('sys.visualizar_sistemas'), systemController.getAllSystems);
router.get('/:id', authenticateToken, authorizeFunctions('sys.visualizar_sistemas'), systemController.getSystemById);
router.get('/:id/functions', authenticateToken, authorizeFunctions('sys.visualizar_sistemas'), systemController.getSystemFunctions);
router.post('/', authenticateToken, authorizeFunctions('sys.manter_sistemas'), systemController.createSystem);
router.put('/:id', authenticateToken, authorizeFunctions('sys.manter_sistemas'), systemController.updateSystem);
router.put('/:id/functions', authenticateToken, authorizeFunctions('sys.manter_sistemas'), systemController.updateSystemFunctions);
router.delete('/:id', authenticateToken, authorizeFunctions('sys.excluir_sistemas'), systemController.deleteSystem);

module.exports = router;

