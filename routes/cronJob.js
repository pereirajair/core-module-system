const express = require('express');
const router = express.Router();
const cronJobController = require('../controllers/cronJobController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeFunctions = require('../middleware/authorizeFunctions');

// Executar cron job manualmente (apenas admin)
router.post('/:id/execute', authenticateToken, authorizeFunctions('cron.manter_cron_jobs'), cronJobController.executeCronJob);

module.exports = router;

