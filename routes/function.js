const express = require('express');
const router = express.Router();
const functionController = require('../controllers/functionController');
const authenticateToken = require('../../../middleware/authenticateToken');
const authorizeFunctions = require('../../../middleware/authorizeFunctions');

router.get('/', authenticateToken, authorizeFunctions('func.visualizar_funcoes'), functionController.getAllFunctions);
router.get('/:id', authenticateToken, authorizeFunctions('func.visualizar_funcoes'), functionController.getFunctionById);
router.post('/', authenticateToken, authorizeFunctions('func.manter_funcoes'), functionController.createFunction);
router.put('/:id', authenticateToken, authorizeFunctions('func.manter_funcoes'), functionController.updateFunction);
router.delete('/:id', authenticateToken, authorizeFunctions('func.excluir_funcoes'), functionController.deleteFunction);

module.exports = router;

