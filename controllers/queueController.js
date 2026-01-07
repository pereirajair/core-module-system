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
 * Processar uma fila manualmente
 */
async function processQueue(req, res) {
  try {
    const db = getDb();
    const Queue = db.Queue;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'ID da fila é obrigatório' });
    }

    const queue = await Queue.findByPk(id);

    if (!queue) {
      return res.status(404).json({ message: 'Fila não encontrada' });
    }

    if (!queue.active) {
      return res.status(400).json({ message: 'Fila inativa, não pode ser processada' });
    }

    console.log(`⚡ Processamento manual da fila "${queue.name}" (ID: ${queue.id})`);

    const queueManager = require('../utils/queueManager');
    const result = await queueManager.processQueue(db, queue);

    // Log usando GestorSys
    const logHelper = require('../utils/logHelper');
    const userInfo = logHelper.getUserInfo(req);
    const GestorSys = getGestorSys();
    const moduleName = 'system';

    await GestorSys.logNormal(moduleName, `Fila "${queue.name}" processada manualmente`, {
      userId: userInfo.userId,
      organizationId: userInfo.organizationId,
      systemId: userInfo.systemId,
      context: {
        queueId: queue.id,
        queueName: queue.name,
        result: result
      }
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao processar fila:', error);
    res.status(500).json({
      message: 'Erro ao processar fila',
      error: error.message
    });
  }
}

/**
 * Adicionar itens à fila
 */
async function addItems(req, res) {
  try {
    const db = getDb();
    const Queue = db.Queue;
    const QueueItem = db.QueueItem;
    const { id } = req.params;
    const { items, priority = 0 } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID da fila é obrigatório' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'É necessário fornecer um array de itens' });
    }

    const queue = await Queue.findByPk(id);

    if (!queue) {
      return res.status(404).json({ message: 'Fila não encontrada' });
    }

    if (!queue.active) {
      return res.status(400).json({ message: 'Fila inativa, não é possível adicionar itens' });
    }

    console.log(`📥 Adicionando ${items.length} item(ns) à fila "${queue.name}"`);

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

    // Log usando GestorSys
    const logHelper = require('../utils/logHelper');
    const userInfo = logHelper.getUserInfo(req);
    const GestorSys = getGestorSys();
    const moduleName = 'system';

    await GestorSys.logNormal(moduleName, `${items.length} item(ns) adicionado(s) à fila "${queue.name}"`, {
      userId: userInfo.userId,
      organizationId: userInfo.organizationId,
      systemId: userInfo.systemId,
      context: {
        queueId: queue.id,
        queueName: queue.name,
        itemsCount: items.length
      }
    });

    res.status(201).json({
      message: `${items.length} item(ns) adicionado(s) à fila com sucesso`,
      items: createdItems,
      queue: {
        id: queue.id,
        name: queue.name,
        totalItems: queue.totalItems
      }
    });
  } catch (error) {
    console.error('❌ Erro ao adicionar itens à fila:', error);
    res.status(500).json({
      message: 'Erro ao adicionar itens à fila',
      error: error.message
    });
  }
}

/**
 * Listar itens de uma fila
 */
async function getQueueItems(req, res) {
  try {
    const db = getDb();
    const QueueItem = db.QueueItem;
    const { id } = req.params;
    const { page = 1, limit = 30, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { id_queue: id };
    if (status) {
      where.status = status;
    }

    const { count, rows } = await QueueItem.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['priority', 'DESC'], ['createdAt', 'ASC']]
    });

    res.json({
      data: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Erro ao listar itens da fila:', error);
    res.status(500).json({ message: 'Erro ao listar itens da fila', error: error.message });
  }
}

/**
 * Listar todas as filas
 */
async function getAllQueues(req, res) {
  try {
    const db = getDb();
    const Queue = db.Queue;

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

    const { count, rows } = await Queue.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: db.QueueItem,
        as: 'QueueItems',
        attributes: ['id', 'status'],
        required: false
      }]
    });

    // Adicionar contagem de itens por status
    const queuesWithStats = await Promise.all(rows.map(async (queue) => {
      const items = await db.QueueItem.findAll({
        where: { id_queue: queue.id },
        attributes: ['status'],
        raw: true
      });

      const stats = {
        pending: items.filter(i => i.status === 'pending').length,
        processing: items.filter(i => i.status === 'processing').length,
        completed: items.filter(i => i.status === 'completed').length,
        failed: items.filter(i => i.status === 'failed').length,
        retry: items.filter(i => i.status === 'retry').length
      };

      return {
        ...queue.toJSON(),
        stats
      };
    }));

    res.json({
      data: queuesWithStats,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Erro ao listar filas:', error);
    res.status(500).json({ message: 'Erro ao listar filas', error: error.message });
  }
}

/**
 * Obter fila por ID
 */
async function getQueueById(req, res) {
  try {
    const db = getDb();
    const Queue = db.Queue;
    const { id } = req.params;

    const queue = await Queue.findByPk(id, {
      include: [{
        model: db.QueueItem,
        as: 'QueueItems',
        limit: 100,
        order: [['priority', 'DESC'], ['createdAt', 'ASC']]
      }]
    });

    if (!queue) {
      return res.status(404).json({ message: 'Fila não encontrada' });
    }

    res.json(queue);
  } catch (error) {
    console.error('❌ Erro ao obter fila:', error);
    res.status(500).json({ message: 'Erro ao obter fila', error: error.message });
  }
}

/**
 * Criar fila
 */
async function createQueue(req, res) {
  try {
    const db = getDb();
    const Queue = db.Queue;

    const queue = await Queue.create(req.body);

    res.status(201).json(queue);
  } catch (error) {
    console.error('❌ Erro ao criar fila:', error);
    res.status(500).json({ message: 'Erro ao criar fila', error: error.message });
  }
}

/**
 * Atualizar fila
 */
async function updateQueue(req, res) {
  try {
    const db = getDb();
    const Queue = db.Queue;
    const { id } = req.params;

    const queue = await Queue.findByPk(id);

    if (!queue) {
      return res.status(404).json({ message: 'Fila não encontrada' });
    }

    await queue.update(req.body);

    res.json(queue);
  } catch (error) {
    console.error('❌ Erro ao atualizar fila:', error);
    res.status(500).json({ message: 'Erro ao atualizar fila', error: error.message });
  }
}

/**
 * Excluir fila
 */
async function deleteQueue(req, res) {
  try {
    const db = getDb();
    const Queue = db.Queue;
    const { id } = req.params;

    const queue = await Queue.findByPk(id);

    if (!queue) {
      return res.status(404).json({ message: 'Fila não encontrada' });
    }

    await queue.destroy();

    res.json({ message: 'Fila excluída com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao excluir fila:', error);
    res.status(500).json({ message: 'Erro ao excluir fila', error: error.message });
  }
}

module.exports = {
  processQueue,
  addItems,
  getQueueItems,
  getAllQueues,
  getQueueById,
  createQueue,
  updateQueue,
  deleteQueue
};

