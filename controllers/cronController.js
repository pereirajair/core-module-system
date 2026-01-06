'use strict';

/**
 * Controller de Cron Jobs do módulo System
 * 
 * Cada método recebe um contexto com:
 * - db: Instância do banco de dados (com todos os models)
 * - token: Token JWT válido com permissões de ADMIN
 * - job: Instância do CronJob que está sendo executado
 */
module.exports = {
  /**
   * Executa a cada 1 minuto
   * @param {Object} context - Contexto com db, token e job
   */
  async runEveryMinute(context) {
    const { db, token, job } = context;
    console.log(`🕐 [system] Cron job a cada 1 minuto executado em ${new Date().toISOString()}`);
    console.log(`🔑 Token de sistema disponível: ${token.substring(0, 20)}...`);
    // Exemplo: você pode usar db.User, db.Role, etc. aqui
    // Exemplo: você pode usar o token para fazer chamadas autenticadas
  },

  /**
   * Executa a cada 5 minutos
   * @param {Object} context - Contexto com db, token e job
   */
  async runEveryFiveMinutes(context) {
    const { db, token, job } = context;
    console.log(`🕔 [system] Cron job a cada 5 minutos executado em ${new Date().toISOString()}`);
    console.log(`🔑 Token de sistema disponível: ${token.substring(0, 20)}...`);
    // Exemplo: você pode usar db.User, db.Role, etc. aqui
    // Exemplo: você pode usar o token para fazer chamadas autenticadas
  }
};


