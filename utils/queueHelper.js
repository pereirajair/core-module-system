'use strict';

/**
 * Helper para facilitar o uso do sistema de filas
 */

const modelsLoader = require('./modelsLoader');

/**
 * Adiciona itens a uma fila
 * 
 * @param {string} queueName - Nome da fila
 * @param {Array} items - Array de itens a serem adicionados (cada item será convertido para JSON)
 * @param {number} priority - Prioridade dos itens (default: 0, maior número = maior prioridade)
 * @returns {Promise<Array>} Array de QueueItems criados
 */
async function addItemsToQueue(queueName, items, priority = 0) {
  if (!queueName || !items || !Array.isArray(items) || items.length === 0) {
    throw new Error('queueName e items (array não vazio) são obrigatórios');
  }

  const db = modelsLoader.loadModels();
  const Queue = db.Queue;
  const QueueItem = db.QueueItem;

  if (!Queue || !QueueItem) {
    throw new Error('Models Queue e QueueItem não encontrados. Certifique-se de que as migrations foram executadas.');
  }

  // Buscar fila
  const queue = await Queue.findOne({ where: { name: queueName } });

  if (!queue) {
    throw new Error(`Fila "${queueName}" não encontrada`);
  }

  if (!queue.active) {
    throw new Error(`Fila "${queueName}" está inativa`);
  }

  // Criar itens
  const queueItems = items.map(itemData => ({
    id_queue: queue.id,
    data: itemData,
    status: 'pending',
    priority: priority,
    attempts: 0
  }));

  const createdItems = await QueueItem.bulkCreate(queueItems);

  // Atualizar total de itens da fila
  await queue.update({
    totalItems: (queue.totalItems || 0) + createdItems.length
  });

  console.log(`✅ ${items.length} item(ns) adicionado(s) à fila "${queueName}"`);

  return createdItems;
}

/**
 * Obtém uma fila pelo nome
 * 
 * @param {string} queueName - Nome da fila
 * @returns {Promise<Object>} Instância da fila
 */
async function getQueue(queueName) {
  if (!queueName) {
    throw new Error('queueName é obrigatório');
  }

  const db = modelsLoader.loadModels();
  const Queue = db.Queue;

  if (!Queue) {
    throw new Error('Model Queue não encontrado');
  }

  const queue = await Queue.findOne({ where: { name: queueName } });

  if (!queue) {
    throw new Error(`Fila "${queueName}" não encontrada`);
  }

  return queue;
}

/**
 * Obtém estatísticas de uma fila
 * 
 * @param {string} queueName - Nome da fila
 * @returns {Promise<Object>} Estatísticas da fila
 */
async function getQueueStats(queueName) {
  const queue = await getQueue(queueName);

  const db = modelsLoader.loadModels();
  const QueueItem = db.QueueItem;

  const items = await QueueItem.findAll({
    where: { id_queue: queue.id },
    attributes: ['status'],
    raw: true
  });

  return {
    queue: {
      id: queue.id,
      name: queue.name,
      active: queue.active,
      processing: queue.processing,
      itemsPerBatch: queue.itemsPerBatch,
      totalItems: queue.totalItems,
      totalProcessed: queue.totalProcessed,
      totalFailed: queue.totalFailed,
      lastProcessed: queue.lastProcessed
    },
    stats: {
      pending: items.filter(i => i.status === 'pending').length,
      processing: items.filter(i => i.status === 'processing').length,
      completed: items.filter(i => i.status === 'completed').length,
      failed: items.filter(i => i.status === 'failed').length,
      retry: items.filter(i => i.status === 'retry').length,
      total: items.length
    }
  };
}

/**
 * Processa uma fila manualmente
 * 
 * @param {string} queueName - Nome da fila
 * @returns {Promise<Object>} Resultado do processamento
 */
async function processQueue(queueName) {
  const queue = await getQueue(queueName);

  const db = modelsLoader.loadModels();
  const queueManager = require('./queueManager');

  return await queueManager.processQueue(db, queue);
}

module.exports = {
  addItemsToQueue,
  getQueue,
  getQueueStats,
  processQueue
};


