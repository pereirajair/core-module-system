'use strict';

const express = require('express');
const router = express.Router();
const mailerCrudController = require('../controllers/mailerCrudController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeFunctions = require('../middleware/authorizeFunctions');

// CRUD routes
router.get('/', authenticateToken, authorizeFunctions('mailer.visualizar_mailers'), mailerCrudController.getAllMailers);
router.get('/:id', authenticateToken, authorizeFunctions('mailer.visualizar_mailers'), mailerCrudController.getMailerById);
router.post('/', authenticateToken, authorizeFunctions('mailer.manter_mailers'), mailerCrudController.createMailer);
router.put('/:id', authenticateToken, authorizeFunctions('mailer.manter_mailers'), mailerCrudController.updateMailer);
router.delete('/:id', authenticateToken, authorizeFunctions('mailer.excluir_mailers'), mailerCrudController.deleteMailer);

module.exports = router;

