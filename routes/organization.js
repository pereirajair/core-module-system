const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeFunctions = require('../middleware/authorizeFunctions');

router.get('/', authenticateToken, authorizeFunctions('org.visualizar_organizacoes'), organizationController.getAllOrganizations);
router.post('/', authenticateToken, authorizeFunctions('org.manter_organizacoes'), organizationController.createOrganization);
router.put('/:id/users', authenticateToken, authorizeFunctions('org.manter_organizacoes'), organizationController.updateOrganizationUsers);
router.get('/:id', authenticateToken, authorizeFunctions('org.visualizar_organizacoes'), organizationController.getOrganizationById);
router.put('/:id', authenticateToken, authorizeFunctions('org.manter_organizacoes'), organizationController.updateOrganization);
router.delete('/:id', authenticateToken, authorizeFunctions('org.excluir_organizacoes'), organizationController.deleteOrganization);

module.exports = router;
