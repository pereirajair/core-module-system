'use strict';

const { Op } = require('sequelize');

// Lazy load db para evitar problemas de ordem de carregamento
function getDb() {
  const modelsLoader = require('../utils/modelsLoader');
  return modelsLoader.loadModels();
}

/**
 * Lista todos os logs com paginação e filtros
 */
async function getAllLogs(req, res) {
  try {
    const db = getDb();
    const Logs = db.Logs;
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    // Filtros opcionais
    const where = {};
    
    if (req.query.module) {
      where.module = req.query.module;
    }
    
    if (req.query.logType) {
      where.logType = parseInt(req.query.logType);
    }
    
    if (req.query.id_user) {
      where.id_user = parseInt(req.query.id_user);
    }
    
    if (req.query.id_organization) {
      where.id_organization = parseInt(req.query.id_organization);
    }
    
    if (req.query.id_system) {
      where.id_system = parseInt(req.query.id_system);
    }
    
    // Filtro por data (opcional)
    if (req.query.dateFrom || req.query.dateTo) {
      where.date = {};
      if (req.query.dateFrom) {
        where.date[Op.gte] = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        where.date[Op.lte] = new Date(req.query.dateTo);
      }
    }

    // Buscar logs com paginação
    const { count, rows } = await Logs.findAndCountAll({
      where,
      limit,
      offset,
      order: [['date', 'DESC']], // Mais recentes primeiro
      include: [
        {
          model: db.User,
          as: 'User',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: db.Organization,
          as: 'Organization',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: db.System,
          as: 'System',
          attributes: ['id', 'name', 'sigla'],
          required: false
        }
      ]
    });

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar logs:', error);
    res.status(500).json({ message: 'Erro ao listar logs', error: error.message });
  }
}

/**
 * Busca um log por ID
 */
async function getLogById(req, res) {
  try {
    const db = getDb();
    const Logs = db.Logs;
    const { id } = req.params;

    const log = await Logs.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'User',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: db.Organization,
          as: 'Organization',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: db.System,
          as: 'System',
          attributes: ['id', 'name', 'sigla'],
          required: false
        }
      ]
    });

    if (!log) {
      return res.status(404).json({ message: 'Log não encontrado' });
    }

    res.json(log);
  } catch (error) {
    console.error('Erro ao buscar log:', error);
    res.status(500).json({ message: 'Erro ao buscar log', error: error.message });
  }
}

module.exports = {
  getAllLogs,
  getLogById
};

