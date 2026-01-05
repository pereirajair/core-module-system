const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../../../middleware/authenticateToken');
const authorizeFunctions = require('../../../middleware/authorizeFunctions');

// Rotas do usuário logado
router.get('/me/systems', authenticateToken, userController.getUserSystems);
router.get('/me/organizations', authenticateToken, userController.getUserOrganizations);

router.get('/', authenticateToken, authorizeFunctions('user.visualizar_usuarios'), userController.getAllUsers);
router.get('/:id', authenticateToken, authorizeFunctions('user.visualizar_usuarios'), userController.getUserById);
router.post('/', authenticateToken, authorizeFunctions('user.manter_usuarios'), userController.createUser);
router.put('/:id', authenticateToken, authorizeFunctions('user.manter_usuarios'), userController.updateUser);
router.put('/:id/roles', authenticateToken, authorizeFunctions('user.manter_usuarios'), userController.updateUserRoles);
router.put('/:id/organizations', authenticateToken, authorizeFunctions('user.manter_usuarios'), userController.updateUserOrganizations);
router.delete('/:id', authenticateToken, authorizeFunctions('user.excluir_usuarios'), userController.deleteUser);

module.exports = router;
