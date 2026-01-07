'use strict';

const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeFunctions = require('../middleware/authorizeFunctions');

// Processar fila manualmente
router.post('/:id/process', authenticateToken, authorizeFunctions('queue.manter_queues'), queueController.processQueue);

// Adicionar itens à fila
router.post('/:id/items', authenticateToken, authorizeFunctions('queue.manter_queues'), queueController.addItems);

// Listar itens de uma fila
router.get('/:id/items', authenticateToken, authorizeFunctions('queue.visualizar_queues'), queueController.getQueueItems);

// CRUD routes
router.get('/', authenticateToken, authorizeFunctions('queue.visualizar_queues'), queueController.getAllQueues);
router.get('/:id', authenticateToken, authorizeFunctions('queue.visualizar_queues'), queueController.getQueueById);
router.post('/', authenticateToken, authorizeFunctions('queue.manter_queues'), queueController.createQueue);
router.put('/:id', authenticateToken, authorizeFunctions('queue.manter_queues'), queueController.updateQueue);
router.delete('/:id', authenticateToken, authorizeFunctions('queue.excluir_queues'), queueController.deleteQueue);

module.exports = router;

