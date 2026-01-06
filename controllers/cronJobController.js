'use strict';

const { Op } = require('sequelize');

// Lazy load db para evitar problemas de ordem de carregamento
function getDb() {
  const modelsLoader = require('../utils/modelsLoader');
  return modelsLoader.loadModels();
}

/**
 * Executar um cron job manualmente
 */
async function executeCronJob(req, res) {
  try {
    const db = getDb();
    const CronJob = db.CronJob;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'ID do cron job é obrigatório' });
    }

    // Buscar o cron job
    const cronJob = await CronJob.findByPk(id);

    if (!cronJob) {
      return res.status(404).json({ message: 'Cron job não encontrado' });
    }

    // Verificar se está ativo
    if (!cronJob.active) {
      return res.status(400).json({ message: 'Cron job está inativo. Ative-o antes de executar manualmente.' });
    }

    console.log(`▶️  Executando cron job manualmente: "${cronJob.name}" (ID: ${id})`);

    const now = new Date();
    let lastExecutionLog = '';
    let lastExecutionSuccess = false;
    let executionResult = null;

    try {
      // Limpar cache do módulo para garantir que mudanças sejam carregadas
      const controllerPath = require.resolve(cronJob.controller);
      if (require.cache[controllerPath]) {
        delete require.cache[controllerPath];
      }

      const controllerModule = require(cronJob.controller);
      const handler = controllerModule[cronJob.method];

      if (typeof handler !== 'function') {
        throw new Error(`Método "${cronJob.method}" não encontrado no controller "${cronJob.controller}"`);
      }

      // Gerar token de sistema com permissões ADMIN
      const tokenHelper = require('../utils/cronTokenHelper');
      const systemToken = await tokenHelper.generateSystemToken(db);

      // Criar contexto para o handler
      const context = {
        db: db,
        token: systemToken,
        job: cronJob
      };

      // Executar o handler
      executionResult = await Promise.resolve(handler(context));

      lastExecutionSuccess = true;
      lastExecutionLog = `Executado manualmente com sucesso em ${now.toISOString()}`;
      
      console.log(`✅ Cron job "${cronJob.name}" executado com sucesso manualmente`);
    } catch (error) {
      console.error(`❌ Erro ao executar cron job "${cronJob.name}" manualmente:`, error);
      lastExecutionSuccess = false;
      lastExecutionLog = `Erro na execução manual em ${now.toISOString()}: ${error.message}`;
      
      // Atualizar status mesmo em caso de erro
      await cronJob.update({
        lastExecution: now,
        lastExecutionSuccess,
        lastExecutionLog
      });

      return res.status(500).json({
        message: 'Erro ao executar cron job',
        error: error.message,
        log: lastExecutionLog
      });
    }

    // Atualizar status do cron job
    await cronJob.update({
      lastExecution: now,
      lastExecutionSuccess,
      lastExecutionLog
    });

    res.json({
      success: true,
      message: `Cron job "${cronJob.name}" executado com sucesso`,
      executionTime: now.toISOString(),
      result: executionResult
    });

  } catch (error) {
    console.error('❌ Erro ao executar cron job:', error);
    res.status(500).json({ message: 'Erro ao executar cron job', error: error.message });
  }
}

module.exports = {
  executeCronJob
};

