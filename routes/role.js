const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeFunctions = require('../middleware/authorizeFunctions');

router.get('/', authenticateToken, authorizeFunctions('role.visualizar_roles'), roleController.getAllRoles);
router.get('/:id', authenticateToken, authorizeFunctions('role.visualizar_roles'), roleController.getRoleById);
router.get('/:id/functions', authenticateToken, authorizeFunctions('role.visualizar_roles'), roleController.getRoleFunctions);
router.post('/', authenticateToken, authorizeFunctions('role.manter_roles'), roleController.createRole);
router.put('/:id', authenticateToken, authorizeFunctions('role.manter_roles'), roleController.updateRole);
router.put('/:id/functions', authenticateToken, authorizeFunctions('role.manter_roles'), roleController.updateRoleFunctions);
router.delete('/:id', authenticateToken, authorizeFunctions('role.excluir_roles'), roleController.deleteRole);

module.exports = router;
