'use strict';

const modelsLoader = require('./modelsLoader');
const { Op } = require('sequelize');

// Lazy load GestorSys
function getGestorSys() {
  return require('./gestorSys');
}

/**
 * Extrai o nome do módulo do caminho do controller
 */
function extractModuleName(controllerPath) {
  if (!controllerPath) return 'system';
  const match = controllerPath.match(/@gestor\/([^\/]+)/);
  if (match) return match[1];
  const path = require('path');
  const parts = controllerPath.split(path.sep);
  const oldIndex = parts.indexOf('old');
  if (oldIndex >= 0 && oldIndex < parts.length - 1) {
    return parts[oldIndex + 1];
  }
  const modulesIndex = parts.indexOf('modules');
  if (modulesIndex >= 0 && modulesIndex < parts.length - 1) {
    return parts[modulesIndex + 1];
  }
  return 'system';
}

/**
 * Processa uma fila específica
 * 
 * @param {Object} db - Instância do banco de dados
 * @param {Object} queue - Instância da fila a ser processada
 * @returns {Promise<Object>} Resultado do processamento
 */
async function processQueue(db, queue) {
  if (!queue || !queue.active) {
    return {
      success: false,
      message: 'Fila não encontrada ou inativa'
    };
  }

  // Verificar se já está sendo processada
  if (queue.processing) {
    return {
      success: false,
      message: 'Fila já está sendo processada'
    };
  }

  // Marcar como processando
  await queue.update({ processing: true });

  try {
    const QueueItem = db.QueueItem;
    
    // Buscar itens pendentes ou para retry, ordenados por prioridade (maior primeiro) e data de criação
    const items = await QueueItem.findAll({
      where: {
        id_queue: queue.id,
        status: {
          [Op.in]: ['pending', 'retry']
        }
      },
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'ASC']
      ],
      limit: queue.itemsPerBatch
    });

    if (items.length === 0) {
      await queue.update({ processing: false });
      return {
        success: true,
        message: 'Nenhum item pendente para processar',
        processed: 0,
        failed: 0
      };
    }

    console.log(`📋 Processando ${items.length} item(ns) da fila "${queue.name}"`);

    let processed = 0;
    let failed = 0;

    // Resolver caminho do controller (converter @gestor/* para caminho relativo se necessário)
    const moduleLoader = require('./moduleLoader');
    const resolvedControllerPath = moduleLoader.resolveGestorModule(queue.controller);
    
    // Limpar cache do módulo para garantir que mudanças sejam carregadas
    let controllerPath;
    try {
      controllerPath = require.resolve(resolvedControllerPath);
    } catch (resolveError) {
      // Se não conseguir resolver, tentar o caminho original
      try {
        controllerPath = require.resolve(queue.controller);
      } catch (originalError) {
        throw new Error(`Não foi possível resolver o caminho do controller: ${queue.controller}. Erro: ${resolveError.message}`);
      }
    }
    
    if (require.cache[controllerPath]) {
      delete require.cache[controllerPath];
    }

    const controllerModule = require(resolvedControllerPath);
    const handler = controllerModule[queue.method];

    if (typeof handler !== 'function') {
      throw new Error(`Método "${queue.method}" não encontrado no controller "${queue.controller}"`);
    }

    // Gerar token de sistema com permissões ADMIN
    const tokenHelper = require('./cronTokenHelper');
    const systemToken = await tokenHelper.generateSystemToken(db);

    // Processar cada item
    for (const item of items) {
      try {
        // Marcar item como processando
        await item.update({
          status: 'processing',
          attempts: item.attempts + 1
        });

        // Criar contexto para o handler
        const context = {
          db: db,
          token: systemToken,
          queue: queue,
          item: item
        };

        // Executar o handler
        const result = await Promise.resolve(handler(context, item.data));

        // Marcar como concluído
        await item.update({
          status: 'completed',
          processedAt: new Date(),
          error: null
        });

        processed++;

        // Log de sucesso
        const GestorSys = getGestorSys();
        const moduleName = extractModuleName(queue.controller);
        await GestorSys.logNormal(moduleName, `Item da fila "${queue.name}" processado com sucesso`, {
          context: {
            queueId: queue.id,
            queueName: queue.name,
            itemId: item.id,
            itemData: item.data,
            result: result
          }
        });

        console.log(`✅ Item ${item.id} da fila "${queue.name}" processado com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao processar item ${item.id} da fila "${queue.name}":`, error);

        failed++;

        // Verificar se deve tentar novamente
        const shouldRetry = item.attempts < queue.maxAttempts;

        if (shouldRetry) {
          // Calcular próxima tentativa (agora + retryDelay segundos)
          const nextRetry = new Date(Date.now() + (queue.retryDelay * 1000));
          
          await item.update({
            status: 'retry',
            error: error.message,
            // Não atualizar processedAt ainda
          });

          console.log(`🔄 Item ${item.id} será tentado novamente após ${queue.retryDelay} segundos (tentativa ${item.attempts}/${queue.maxAttempts})`);
        } else {
          // Máximo de tentativas atingido, marcar como falha permanente
          await item.update({
            status: 'failed',
            error: error.message,
            processedAt: new Date()
          });

          console.log(`❌ Item ${item.id} falhou permanentemente após ${item.attempts} tentativas`);
        }

        // Log de erro
        const GestorSys = getGestorSys();
        const moduleName = extractModuleName(queue.controller);
        await GestorSys.logException(moduleName, error, {
          context: {
            queueId: queue.id,
            queueName: queue.name,
            itemId: item.id,
            itemData: item.data,
            attempts: item.attempts,
            maxAttempts: queue.maxAttempts
          }
        });
      }
    }

    // Atualizar estatísticas da fila
    await queue.update({
      processing: false,
      lastProcessed: new Date(),
      totalProcessed: (queue.totalProcessed || 0) + processed,
      totalFailed: (queue.totalFailed || 0) + failed
    });

    console.log(`✅ Fila "${queue.name}" processada: ${processed} sucesso(s), ${failed} falha(s)`);

    return {
      success: true,
      message: `Fila processada: ${processed} sucesso(s), ${failed} falha(s)`,
      processed,
      failed,
      total: items.length
    };
  } catch (error) {
    console.error(`❌ Erro ao processar fila "${queue.name}":`, error);
    
    // Marcar como não processando em caso de erro
    await queue.update({ processing: false });

    // Log de erro
    const GestorSys = getGestorSys();
    const moduleName = extractModuleName(queue.controller);
    await GestorSys.logException(moduleName, error, {
      context: {
        queueId: queue.id,
        queueName: queue.name
      }
    });

    throw error;
  }
}

/**
 * Processa todas as filas ativas
 * 
 * @param {Object} db - Instância do banco de dados (opcional)
 * @returns {Promise<Array>} Resultados do processamento de cada fila
 */
async function processAllQueues(db = null) {
  const database = db || modelsLoader.loadModels();
  const Queue = database.Queue;

  if (!Queue) {
    console.warn('⚠️  Modelo Queue não encontrado. Processamento de filas desabilitado.');
    return [];
  }

  const queues = await Queue.findAll({
    where: {
      active: true,
      processing: false
    }
  });

  const results = [];

  for (const queue of queues) {
    try {
      const result = await processQueue(database, queue);
      results.push({
        queueId: queue.id,
        queueName: queue.name,
        ...result
      });
    } catch (error) {
      console.error(`❌ Erro ao processar fila "${queue.name}":`, error);
      results.push({
        queueId: queue.id,
        queueName: queue.name,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

module.exports = {
  processQueue,
  processAllQueues
};


