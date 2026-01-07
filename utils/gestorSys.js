'use strict';

/**
 * GestorSys - Classe utilitária para operações padrões do sistema
 * Pode ser importada e usada por qualquer módulo
 */
class GestorSys {
  /**
   * Lazy load db para evitar problemas de ordem de carregamento
   */
  static getDb() {
    const modelsLoader = require('./modelsLoader');
    return modelsLoader.loadModels();
  }

  /**
   * Insere um log no sistema
   * @param {Object} options - Opções do log
   * @param {string} options.module - Nome do módulo (ex: 'system', 'pessoa', 'locations')
   * @param {string} options.message - Mensagem do log
   * @param {number} options.type - Tipo do log: 1=normal, 2=warning, 3=error
   * @param {number} [options.userId] - ID do usuário relacionado (opcional)
   * @param {number} [options.organizationId] - ID da organização relacionada (opcional)
   * @param {number} [options.systemId] - ID do sistema relacionado (opcional)
   * @param {Object} [options.context] - Contexto adicional em formato objeto (opcional)
   * @param {string} [options.stackTrace] - Stack trace do erro (opcional, geralmente para type=3)
   * @returns {Promise<Object>} Instância do log criado
   */
  static async log(options) {
    try {
      const db = this.getDb();
      const Logs = db.Logs;

      if (!options.module || !options.message) {
        throw new Error('Módulo e mensagem são obrigatórios para criar um log');
      }

      const logData = {
        date: new Date(),
        module: options.module,
        logMessage: options.message,
        logType: options.type || 1, // Default: normal
        id_user: options.userId || null,
        id_organization: options.organizationId || null,
        id_system: options.systemId || null,
        context: options.context ? JSON.stringify(options.context) : null,
        stackTrace: options.stackTrace || null
      };

      const log = await Logs.create(logData);
      return log;
    } catch (error) {
      // Se houver erro ao inserir log, apenas logar no console para não quebrar o fluxo
      console.error('❌ Erro ao inserir log no sistema:', error.message);
      return null;
    }
  }

  /**
   * Insere um log normal (tipo 1)
   * @param {string} module - Nome do módulo
   * @param {string} message - Mensagem do log
   * @param {Object} [options] - Opções adicionais (userId, organizationId, systemId, context)
   * @returns {Promise<Object>} Instância do log criado
   */
  static async logNormal(module, message, options = {}) {
    return this.log({
      module,
      message,
      type: 1,
      userId: options.userId,
      organizationId: options.organizationId,
      systemId: options.systemId,
      context: options.context
    });
  }

  /**
   * Insere um log de warning (tipo 2)
   * @param {string} module - Nome do módulo
   * @param {string} message - Mensagem do log
   * @param {Object} [options] - Opções adicionais (userId, organizationId, systemId, context)
   * @returns {Promise<Object>} Instância do log criado
   */
  static async logWarning(module, message, options = {}) {
    return this.log({
      module,
      message,
      type: 2,
      userId: options.userId,
      organizationId: options.organizationId,
      systemId: options.systemId,
      context: options.context
    });
  }

  /**
   * Insere um log de erro (tipo 3)
   * @param {string} module - Nome do módulo
   * @param {string} message - Mensagem do log
   * @param {Object} [options] - Opções adicionais (userId, organizationId, systemId, context, stackTrace)
   * @returns {Promise<Object>} Instância do log criado
   */
  static async logError(module, message, options = {}) {
    let stackTrace = options.stackTrace;
    
    // Se não fornecido stackTrace mas houver error object, extrair stack trace
    if (!stackTrace && options.error && options.error.stack) {
      stackTrace = options.error.stack;
    }

    return this.log({
      module,
      message,
      type: 3,
      userId: options.userId,
      organizationId: options.organizationId,
      systemId: options.systemId,
      context: options.context,
      stackTrace: stackTrace
    });
  }

  /**
   * Insere um log de erro a partir de uma exceção
   * @param {string} module - Nome do módulo
   * @param {Error} error - Objeto de erro
   * @param {Object} [options] - Opções adicionais (userId, organizationId, systemId, context)
   * @returns {Promise<Object>} Instância do log criado
   */
  static async logException(module, error, options = {}) {
    return this.logError(module, error.message || 'Erro desconhecido', {
      ...options,
      error: error,
      stackTrace: error.stack
    });
  }
}

module.exports = GestorSys;


