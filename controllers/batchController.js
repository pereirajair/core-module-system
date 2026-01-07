'use strict';

/**
 * Controller de Batch Jobs do módulo System
 * 
 * Este controller contém o cron job que executa todos os batch jobs cadastrados
 * 
 * Cada método de batch job recebe um contexto com:
 * - db: Instância do banco de dados (com todos os models)
 * - token: Token JWT válido com permissões de ADMIN
 * - job: Instância do BatchJob que está sendo executado
 * - parameters: Parâmetros em formato JSON passados ao método
 */
module.exports = {
  /**
   * Cron job que executa todos os batch jobs cadastrados
   * Este método é chamado pelo cron manager e por sua vez chama o batchManager
   * 
   * @param {Object} context - Contexto com db, token e job
   */
  async executeBatchJobs(context) {
    const { db, token, job } = context;
    console.log(`📦 [system] Executando batch jobs cadastrados em ${new Date().toISOString()}`);
    
    // O batchManager já está inicializado e executa os jobs automaticamente
    // Este método apenas registra que o cron foi executado
    const batchManager = require('../utils/batchManager');
    
    // Recarregar batch jobs do banco (caso tenham sido adicionados/modificados)
    try {
      await batchManager.initialize(db);
      console.log(`✅ Batch jobs recarregados com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao recarregar batch jobs:`, error);
    }
  },

  /**
   * Cron job que processa todas as filas ativas
   * Este método é chamado pelo cron manager para processar as filas
   * 
   * @param {Object} context - Contexto com db, token e job
   */
  async processQueues(context) {
    const { db, token, job } = context;
    console.log(`📋 [system] Processando filas ativas em ${new Date().toISOString()}`);
    
    const queueManager = require('../utils/queueManager');
    
    try {
      const results = await queueManager.processAllQueues(db);
      console.log(`✅ ${results.length} fila(s) processada(s)`);
      
      results.forEach(result => {
        if (result.success) {
          console.log(`  ✅ Fila "${result.queueName}": ${result.processed} processado(s), ${result.failed} falha(s)`);
        } else {
          console.log(`  ❌ Fila "${result.queueName}": ${result.error || result.message}`);
        }
      });
    } catch (error) {
      console.error(`❌ Erro ao processar filas:`, error);
    }
  }
};

