'use strict';

/**
 * Controller de Queue para processar emails do Mailer
 * 
 * Este controller processa itens da fila de emails
 */
module.exports = {
  /**
   * Processa um item da fila de emails
   * 
   * @param {Object} context - Contexto com db, token, queue e item
   * @param {Object} data - Dados do email a ser enviado
   */
  async processMailerItem(context, data) {
    const { db, token, queue, item } = context;
    const now = new Date();

    console.log(`📧 [system] Processando email da fila:`, data);

    try {
      const Mailer = db.Mailer;

      if (!Mailer) {
        throw new Error('Model Mailer não encontrado');
      }

      // Validar dados
      if (!data || !data.mailerId || !data.to || !data.message) {
        throw new Error('Dados inválidos: é necessário mailerId, to e message');
      }

      // Buscar o registro do Mailer
      const mailer = await Mailer.findByPk(data.mailerId);

      if (!mailer) {
        throw new Error(`Mailer com ID ${data.mailerId} não encontrado`);
      }

      // Atualizar status para 'sending'
      await mailer.update({
        status: 'sending',
        attempts: (mailer.attempts || 0) + 1
      });

      // Simular envio de email
      // Em produção, aqui você usaria uma biblioteca como nodemailer, sendgrid, etc.
      console.log(`📧 Enviando email de ${data.from} para ${data.to}`);
      console.log(`📧 Assunto: ${data.subject || '(sem assunto)'}`);
      console.log(`📧 Mensagem: ${data.message.substring(0, 100)}...`);

      // Simular delay de envio
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simular erro proposital para emails de teste
      // Emails com "error@fail.com" ou assunto contendo "[ERROR-TEST]" irão falhar
      if (data.to === 'error@fail.com' || (data.subject && data.subject.includes('[ERROR-TEST]'))) {
        throw new Error('Erro simulado para teste: Email de teste configurado para falhar propositalmente');
      }

      // Simular sucesso (em produção, aqui você faria o envio real)
      const emailSent = true; // Simular sucesso

      if (emailSent) {
        // Atualizar status para 'sent'
        await mailer.update({
          status: 'sent',
          sentAt: now,
          error: null
        });

        console.log(`✅ Email enviado com sucesso: ID ${mailer.id} - ${data.to}`);

        return {
          success: true,
          message: `Email enviado com sucesso para ${data.to}`,
          mailerId: mailer.id
        };
      } else {
        throw new Error('Falha ao enviar email');
      }
    } catch (error) {
      console.error(`❌ Erro ao processar email da fila:`, error);

      // Atualizar Mailer com erro
      try {
        const Mailer = db.Mailer;
        if (data && data.mailerId) {
          const mailer = await Mailer.findByPk(data.mailerId);
          if (mailer) {
            await mailer.update({
              status: 'failed',
              error: error.message,
              attempts: (mailer.attempts || 0) + 1
            });
          }
        }
      } catch (updateError) {
        console.error('❌ Erro ao atualizar status do Mailer:', updateError);
      }

      throw error;
    }
  }
};

