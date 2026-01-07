'use strict';

const { Op } = require('sequelize');

// Lazy load db para evitar problemas de ordem de carregamento
function getDb() {
  const modelsLoader = require('../utils/modelsLoader');
  return modelsLoader.loadModels();
}

// Lazy load GestorSys
function getGestorSys() {
  return require('../utils/gestorSys');
}

/**
 * Extrai o nome do módulo do caminho do controller
 */
function extractModuleName(controllerPath) {
  if (!controllerPath) return 'system';
  const match = controllerPath.match(/@gestor\/([^\/]+)/);
  if (match) return match[1];
  const oldMatch = controllerPath.match(/old\/([^\/]+)/);
  if (oldMatch) return oldMatch[1];
  return 'system';
}

/**
 * Executar um batch job manualmente
 */
async function executeBatchJob(req, res) {
  try {
    const db = getDb();
    const BatchJob = db.BatchJob;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'ID do batch job é obrigatório' });
    }

    const batchJob = await BatchJob.findByPk(id);

    if (!batchJob) {
      return res.status(404).json({ message: 'Batch Job não encontrado' });
    }

    if (!batchJob.active) {
      return res.status(400).json({ message: 'Batch Job inativo, não pode ser executado manualmente' });
    }

    console.log(`⚡ Execução manual do BatchJob "${batchJob.name}" (ID: ${batchJob.id})`);

    const now = new Date();
    let lastExecutionLog = '';
    let lastExecutionSuccess = false;

    try {
      // Limpar cache do módulo
      const controllerPath = require.resolve(batchJob.controller);
      if (require.cache[controllerPath]) {
        delete require.cache[controllerPath];
      }

      const controllerModule = require(batchJob.controller);
      const handler = controllerModule[batchJob.method];

      if (typeof handler !== 'function') {
        throw new Error(`Método "${batchJob.method}" não encontrado no controller "${batchJob.controller}"`);
      }

      const tokenHelper = require('../utils/cronTokenHelper');
      const systemToken = await tokenHelper.generateSystemToken(db);

      const context = {
        db: db,
        token: systemToken,
        job: batchJob,
        parameters: batchJob.parameters || {}
      };

      await Promise.resolve(handler(context, batchJob.parameters || {}));

      lastExecutionSuccess = true;
      lastExecutionLog = `Executado manualmente com sucesso em ${now.toISOString()}`;

      // Atualizar estatísticas
      await batchJob.update({
        lastExecution: now,
        lastExecutionSuccess,
        lastExecutionLog,
        totalExecutions: (batchJob.totalExecutions || 0) + 1,
        totalSuccess: (batchJob.totalSuccess || 0) + 1,
        totalErrors: batchJob.totalErrors || 0
      });

      // Log usando GestorSys
      const GestorSys = getGestorSys();
      const moduleName = extractModuleName(batchJob.controller);
      const logHelper = require('../utils/logHelper');
      const userInfo = logHelper.getUserInfo(req);

      await GestorSys.logNormal(moduleName, `Batch job "${batchJob.name}" executado manualmente com sucesso`, {
        userId: userInfo.userId,
        organizationId: userInfo.organizationId,
        systemId: userInfo.systemId,
        context: {
          batchJobId: batchJob.id,
          batchJobName: batchJob.name,
          cronExpression: batchJob.cronExpression,
          controller: batchJob.controller,
          method: batchJob.method,
          parameters: batchJob.parameters,
          manualExecution: true,
          executionTime: now.toISOString()
        }
      });

      res.json({
        message: `Batch Job "${batchJob.name}" executado manualmente com sucesso.`,
        batchJob: batchJob
      });
    } catch (error) {
      console.error('❌ Erro ao executar Batch Job manualmente:', error);
      lastExecutionSuccess = false;
      lastExecutionLog = `Erro em ${now.toISOString()}: ${error.message}`;

      // Atualizar estatísticas
      await batchJob.update({
        lastExecution: now,
        lastExecutionSuccess,
        lastExecutionLog,
        totalExecutions: (batchJob.totalExecutions || 0) + 1,
        totalSuccess: batchJob.totalSuccess || 0,
        totalErrors: (batchJob.totalErrors || 0) + 1
      });

      // Log de erro
      const GestorSys = getGestorSys();
      const moduleName = extractModuleName(batchJob.controller);
      const logHelper = require('../utils/logHelper');
      const userInfo = logHelper.getUserInfo(req);

      await GestorSys.logException(moduleName, error, {
        userId: userInfo.userId,
        organizationId: userInfo.organizationId,
        systemId: userInfo.systemId,
        context: {
          batchJobId: batchJob.id,
          batchJobName: batchJob.name,
          cronExpression: batchJob.cronExpression,
          controller: batchJob.controller,
          method: batchJob.method,
          parameters: batchJob.parameters,
          manualExecution: true,
          executionTime: now.toISOString()
        }
      });

      res.status(500).json({
        message: 'Erro ao executar Batch Job manualmente',
        error: error.message
      });
    }
  } catch (error) {
    console.error('❌ Erro ao executar Batch Job manualmente:', error);
    res.status(500).json({
      message: 'Erro ao executar Batch Job manualmente',
      error: error.message
    });
  }
}

/**
 * Listar todos os batch jobs
 */
async function getAllBatchJobs(req, res) {
  try {
    const db = getDb();
    const BatchJob = db.BatchJob;

    const { page = 1, limit = 30, active, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (active !== undefined) {
      where.active = active === 'true';
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await BatchJob.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      data: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Erro ao listar batch jobs:', error);
    res.status(500).json({ message: 'Erro ao listar batch jobs', error: error.message });
  }
}

/**
 * Obter batch job por ID
 */
async function getBatchJobById(req, res) {
  try {
    const db = getDb();
    const BatchJob = db.BatchJob;
    const { id } = req.params;

    const batchJob = await BatchJob.findByPk(id);

    if (!batchJob) {
      return res.status(404).json({ message: 'Batch Job não encontrado' });
    }

    res.json(batchJob);
  } catch (error) {
    console.error('❌ Erro ao obter batch job:', error);
    res.status(500).json({ message: 'Erro ao obter batch job', error: error.message });
  }
}

/**
 * Criar batch job
 */
async function createBatchJob(req, res) {
  try {
    const db = getDb();
    const BatchJob = db.BatchJob;

    const batchJob = await BatchJob.create(req.body);

    // Reagendar batch jobs
    const batchManager = require('../utils/batchManager');
    await batchManager.initialize(db);

    res.status(201).json(batchJob);
  } catch (error) {
    console.error('❌ Erro ao criar batch job:', error);
    res.status(500).json({ message: 'Erro ao criar batch job', error: error.message });
  }
}

/**
 * Atualizar batch job
 */
async function updateBatchJob(req, res) {
  try {
    const db = getDb();
    const BatchJob = db.BatchJob;
    const { id } = req.params;

    const batchJob = await BatchJob.findByPk(id);

    if (!batchJob) {
      return res.status(404).json({ message: 'Batch Job não encontrado' });
    }

    await batchJob.update(req.body);

    // Reagendar batch jobs
    const batchManager = require('../utils/batchManager');
    await batchManager.initialize(db);

    res.json(batchJob);
  } catch (error) {
    console.error('❌ Erro ao atualizar batch job:', error);
    res.status(500).json({ message: 'Erro ao atualizar batch job', error: error.message });
  }
}

/**
 * Excluir batch job
 */
async function deleteBatchJob(req, res) {
  try {
    const db = getDb();
    const BatchJob = db.BatchJob;
    const { id } = req.params;

    const batchJob = await BatchJob.findByPk(id);

    if (!batchJob) {
      return res.status(404).json({ message: 'Batch Job não encontrado' });
    }

    await batchJob.destroy();

    // Reagendar batch jobs
    const batchManager = require('../utils/batchManager');
    await batchManager.initialize(db);

    res.json({ message: 'Batch Job excluído com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao excluir batch job:', error);
    res.status(500).json({ message: 'Erro ao excluir batch job', error: error.message });
  }
}

module.exports = {
  executeBatchJob,
  getAllBatchJobs,
  getBatchJobById,
  createBatchJob,
  updateBatchJob,
  deleteBatchJob
};


