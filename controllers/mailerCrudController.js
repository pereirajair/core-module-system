'use strict';

const { Op } = require('sequelize');

// Lazy load db para evitar problemas de ordem de carregamento
function getDb() {
  const modelsLoader = require('../utils/modelsLoader');
  return modelsLoader.loadModels();
}

/**
 * Listar todos os emails
 */
async function getAllMailers(req, res) {
  try {
    const db = getDb();
    const Mailer = db.Mailer;

    const { page = 1, limit = 30, status, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where[Op.or] = [
        { from: { [Op.like]: `%${search}%` } },
        { to: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Mailer.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      data: rows,
      count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Erro ao listar emails:', error);
    res.status(500).json({ message: 'Erro ao listar emails', error: error.message });
  }
}

/**
 * Obter email por ID
 */
async function getMailerById(req, res) {
  try {
    const db = getDb();
    const Mailer = db.Mailer;
    const { id } = req.params;

    const mailer = await Mailer.findByPk(id);

    if (!mailer) {
      return res.status(404).json({ message: 'Email não encontrado' });
    }

    res.json(mailer);
  } catch (error) {
    console.error('❌ Erro ao obter email:', error);
    res.status(500).json({ message: 'Erro ao obter email', error: error.message });
  }
}

/**
 * Criar email
 */
async function createMailer(req, res) {
  try {
    const db = getDb();
    const Mailer = db.Mailer;

    const mailer = await Mailer.create({
      ...req.body,
      status: 'pending' // Sempre criar como pending
    });

    res.status(201).json(mailer);
  } catch (error) {
    console.error('❌ Erro ao criar email:', error);
    res.status(500).json({ message: 'Erro ao criar email', error: error.message });
  }
}

/**
 * Atualizar email
 */
async function updateMailer(req, res) {
  try {
    const db = getDb();
    const Mailer = db.Mailer;
    const { id } = req.params;

    const mailer = await Mailer.findByPk(id);

    if (!mailer) {
      return res.status(404).json({ message: 'Email não encontrado' });
    }

    // Não permitir alterar status manualmente se já foi enviado
    if (mailer.status === 'sent' && req.body.status && req.body.status !== 'sent') {
      return res.status(400).json({ message: 'Não é possível alterar o status de um email já enviado' });
    }

    await mailer.update(req.body);

    res.json(mailer);
  } catch (error) {
    console.error('❌ Erro ao atualizar email:', error);
    res.status(500).json({ message: 'Erro ao atualizar email', error: error.message });
  }
}

/**
 * Excluir email
 */
async function deleteMailer(req, res) {
  try {
    const db = getDb();
    const Mailer = db.Mailer;
    const { id } = req.params;

    const mailer = await Mailer.findByPk(id);

    if (!mailer) {
      return res.status(404).json({ message: 'Email não encontrado' });
    }

    await mailer.destroy();

    res.json({ message: 'Email excluído com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao excluir email:', error);
    res.status(500).json({ message: 'Erro ao excluir email', error: error.message });
  }
}

module.exports = {
  getAllMailers,
  getMailerById,
  createMailer,
  updateMailer,
  deleteMailer
};

