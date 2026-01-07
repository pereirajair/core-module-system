'use strict';

/**
 * Controller de Mailer do módulo System
 * 
 * Este controller contém o cron job que adiciona emails pendentes à fila
 */
module.exports = {
  /**
   * Cron job que adiciona 20 emails pendentes à fila a cada 5 minutos
   * 
   * @param {Object} context - Contexto com db, token e job
   */
  async addEmailsToQueue(context) {
    const { db, token, job } = context;
    const now = new Date();

    console.log(`📧 [system] Adicionando emails pendentes à fila em ${now.toISOString()}`);

    try {
      const Mailer = db.Mailer;
      const queueHelper = require('../utils/queueHelper');

      if (!Mailer) {
        throw new Error('Model Mailer não encontrado');
      }

      // Buscar 20 emails com status 'pending'
      const pendingEmails = await Mailer.findAll({
        where: {
          status: 'pending'
        },
        limit: 20,
        order: [['createdAt', 'ASC']]
      });

      if (pendingEmails.length === 0) {
        console.log('✅ Nenhum email pendente para adicionar à fila');
        return {
          success: true,
          message: 'Nenhum email pendente para adicionar à fila',
          added: 0
        };
      }

      console.log(`📧 Encontrados ${pendingEmails.length} email(s) pendente(s)`);

      // Preparar itens para a fila
      const queueItems = pendingEmails.map(email => ({
        mailerId: email.id,
        from: email.from,
        to: email.to,
        subject: email.subject,
        message: email.message
      }));

      // Adicionar à fila de emails
      try {
        await queueHelper.addItemsToQueue('mailer-send', queueItems, 0);

        // Atualizar status dos emails para 'queued'
        await Mailer.update(
          { status: 'queued' },
          {
            where: {
              id: pendingEmails.map(e => e.id)
            }
          }
        );

        console.log(`✅ ${pendingEmails.length} email(s) adicionado(s) à fila com sucesso`);

        return {
          success: true,
          message: `${pendingEmails.length} email(s) adicionado(s) à fila`,
          added: pendingEmails.length
        };
      } catch (queueError) {
        console.error('❌ Erro ao adicionar emails à fila:', queueError);
        throw queueError;
      }
    } catch (error) {
      console.error(`❌ Erro ao adicionar emails à fila:`, error);
      throw error;
    }
  }
};

