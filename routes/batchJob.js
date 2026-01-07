'use strict';

const express = require('express');
const router = express.Router();
const batchJobController = require('../controllers/batchJobController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeFunctions = require('../middleware/authorizeFunctions');

// Executar batch job manualmente
router.post('/:id/execute', authenticateToken, authorizeFunctions('batch.manter_batch_jobs'), batchJobController.executeBatchJob);

// CRUD routes
router.get('/', authenticateToken, authorizeFunctions('batch.visualizar_batch_jobs'), batchJobController.getAllBatchJobs);
router.get('/:id', authenticateToken, authorizeFunctions('batch.visualizar_batch_jobs'), batchJobController.getBatchJobById);
router.post('/', authenticateToken, authorizeFunctions('batch.manter_batch_jobs'), batchJobController.createBatchJob);
router.put('/:id', authenticateToken, authorizeFunctions('batch.manter_batch_jobs'), batchJobController.updateBatchJob);
router.delete('/:id', authenticateToken, authorizeFunctions('batch.excluir_batch_jobs'), batchJobController.deleteBatchJob);

module.exports = router;


