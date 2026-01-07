'use strict';

/**
 * Helper para facilitar o registro de logs em controllers
 */

// Lazy load GestorSys
function getGestorSys() {
  return require('./gestorSys');
}

/**
 * Extrai informações do usuário da requisição
 * @param {Object} req - Objeto de requisição do Express
 * @returns {Object} Objeto com userId e organizationId
 */
function getUserInfo(req) {
  const user = req.user || {};
  return {
    userId: user.id || null,
    organizationId: user.organizationId || null,
    systemId: user.systemId || null
  };
}

/**
 * Registra log de atualização de registro
 * @param {Object} req - Objeto de requisição
 * @param {string} resourceName - Nome do recurso (ex: 'User', 'Role', 'Organization')
 * @param {Object} record - Registro atualizado
 * @param {Object} oldData - Dados antigos do registro (opcional)
 * @param {Object} additionalContext - Contexto adicional (opcional)
 */
async function logUpdate(req, resourceName, record, oldData = null, additionalContext = {}) {
  try {
    const GestorSys = getGestorSys();
    const userInfo = getUserInfo(req);
    
    const recordId = record?.id || record?.get?.('id') || 'unknown';
    const recordData = record?.get ? record.get({ plain: true }) : record;
    
    const context = {
      resource: resourceName,
      recordId: recordId,
      recordData: recordData,
      ...additionalContext
    };
    
    if (oldData) {
      context.oldData = oldData;
      context.changes = getChanges(oldData, recordData);
    }
    
    await GestorSys.logNormal(
      'system',
      `${resourceName} atualizado (ID: ${recordId})`,
      {
        userId: userInfo.userId,
        organizationId: userInfo.organizationId,
        systemId: userInfo.systemId,
        context: context
      }
    );
  } catch (error) {
    console.error(`⚠️  Erro ao registrar log de atualização de ${resourceName}:`, error);
  }
}

/**
 * Registra log de exclusão de registro
 * @param {Object} req - Objeto de requisição
 * @param {string} resourceName - Nome do recurso (ex: 'User', 'Role', 'Organization')
 * @param {Object} record - Registro excluído (pode ser apenas dados do registro antes da exclusão)
 * @param {Object} additionalContext - Contexto adicional (opcional)
 */
async function logDelete(req, resourceName, record, additionalContext = {}) {
  try {
    const GestorSys = getGestorSys();
    const userInfo = getUserInfo(req);
    
    const recordId = record?.id || record?.get?.('id') || 'unknown';
    const recordData = record?.get ? record.get({ plain: true }) : record;
    
    const context = {
      resource: resourceName,
      recordId: recordId,
      recordData: recordData,
      ...additionalContext
    };
    
    await GestorSys.logNormal(
      'system',
      `${resourceName} excluído (ID: ${recordId})`,
      {
        userId: userInfo.userId,
        organizationId: userInfo.organizationId,
        systemId: userInfo.systemId,
        context: context
      }
    );
  } catch (error) {
    console.error(`⚠️  Erro ao registrar log de exclusão de ${resourceName}:`, error);
  }
}

/**
 * Compara dois objetos e retorna as mudanças
 * @param {Object} oldData - Dados antigos
 * @param {Object} newData - Dados novos
 * @returns {Object} Objeto com as mudanças
 */
function getChanges(oldData, newData) {
  const changes = {};
  
  if (!oldData || !newData) return changes;
  
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  
  allKeys.forEach(key => {
    if (oldData[key] !== newData[key]) {
      changes[key] = {
        old: oldData[key],
        new: newData[key]
      };
    }
  });
  
  return changes;
}

module.exports = {
  logUpdate,
  logDelete,
  getUserInfo
};

