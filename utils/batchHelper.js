'use strict';

/**
 * Helper para facilitar a adição de métodos de controller ao batch processing
 * 
 * Este helper permite registrar métodos de controller como batch jobs de forma simples
 */

const modelsLoader = require('./modelsLoader');

/**
 * Registra um método de controller como batch job
 * 
 * @param {Object} options - Opções do batch job
 * @param {string} options.name - Nome único do batch job
 * @param {string} options.description - Descrição do batch job
 * @param {string} options.controller - Caminho do controller (ex: '@gestor/pessoa/controllers/batchController')
 * @param {string} options.method - Nome do método do controller
 * @param {string} options.cronExpression - Expressão cron (ex: '*/2 * * * *' = a cada 2 minutos)
 * @param {Object} options.parameters - Parâmetros em formato JSON para passar ao método
 * @param {boolean} options.active - Se o batch job está ativo (default: true)
 * @param {boolean} options.upsert - Se deve atualizar se já existir (default: true)
 * 
 * @returns {Promise<Object>} Instância do BatchJob criado/atualizado
 */
async function registerBatchJob(options) {
  const {
    name,
    description,
    controller,
    method,
    cronExpression = '*/2 * * * *',
    parameters = null,
    active = true,
    upsert = true
  } = options;

  if (!name || !controller || !method) {
    throw new Error('name, controller e method são obrigatórios');
  }

  const db = modelsLoader.loadModels();
  const BatchJob = db.BatchJob;

  if (!BatchJob) {
    throw new Error('Model BatchJob não encontrado. Certifique-se de que a migration foi executada.');
  }

  let batchJob;

  if (upsert) {
    // Buscar batch job existente
    batchJob = await BatchJob.findOne({ where: { name } });

    if (batchJob) {
      // Atualizar batch job existente
      await batchJob.update({
        description,
        controller,
        method,
        cronExpression,
        parameters: parameters ? JSON.stringify(parameters) : null,
        active
      });
      console.log(`✅ Batch job "${name}" atualizado com sucesso`);
    } else {
      // Criar novo batch job
      batchJob = await BatchJob.create({
        name,
        description,
        controller,
        method,
        cronExpression,
        parameters: parameters ? JSON.stringify(parameters) : null,
        active
      });
      console.log(`✅ Batch job "${name}" criado com sucesso`);
    }
  } else {
    // Apenas criar (não atualizar se existir)
    batchJob = await BatchJob.create({
      name,
      description,
      controller,
      method,
      cronExpression,
      parameters: parameters ? JSON.stringify(parameters) : null,
      active
    });
    console.log(`✅ Batch job "${name}" criado com sucesso`);
  }

  // Reagendar batch jobs para que o novo job seja incluído
  const batchManager = require('./batchManager');
  await batchManager.initialize(db);

  return batchJob;
}

/**
 * Remove um batch job pelo nome
 * 
 * @param {string} name - Nome do batch job a ser removido
 * @returns {Promise<boolean>} true se foi removido, false se não foi encontrado
 */
async function unregisterBatchJob(name) {
  if (!name) {
    throw new Error('name é obrigatório');
  }

  const db = modelsLoader.loadModels();
  const BatchJob = db.BatchJob;

  if (!BatchJob) {
    throw new Error('Model BatchJob não encontrado');
  }

  const batchJob = await BatchJob.findOne({ where: { name } });

  if (!batchJob) {
    console.log(`⚠️  Batch job "${name}" não encontrado`);
    return false;
  }

  await batchJob.destroy();

  // Reagendar batch jobs
  const batchManager = require('./batchManager');
  await batchManager.initialize(db);

  console.log(`✅ Batch job "${name}" removido com sucesso`);
  return true;
}

/**
 * Lista todos os batch jobs ativos
 * 
 * @returns {Promise<Array>} Lista de batch jobs ativos
 */
async function listBatchJobs() {
  const db = modelsLoader.loadModels();
  const BatchJob = db.BatchJob;

  if (!BatchJob) {
    throw new Error('Model BatchJob não encontrado');
  }

  const batchJobs = await BatchJob.findAll({
    where: { active: true },
    order: [['name', 'ASC']]
  });

  return batchJobs;
}

module.exports = {
  registerBatchJob,
  unregisterBatchJob,
  listBatchJobs
};

