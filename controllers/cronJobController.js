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
 * Converte caminho do controller para caminho relativo quando necessário
 * @param {string} controllerPath - Caminho do controller (ex: '@gestor/system/controllers/cronController')
 * @returns {string} Caminho relativo ou original
 */
function resolveControllerPath(controllerPath) {
  if (!controllerPath) return controllerPath;
  
  // Se começar com @gestor/system/, converter para caminho relativo
  // Isso é necessário porque quando o código está dentro do próprio módulo,
  // não pode usar o nome do pacote npm para se referir a si mesmo
  if (controllerPath.startsWith('@gestor/system/')) {
    // Converter @gestor/system/controllers/mailerController -> ../controllers/mailerController
    const relativePath = controllerPath.replace('@gestor/system/', '../');
    return relativePath;
  }
  
  // Se contiver 'old/system/', converter para caminho relativo
  if (controllerPath.includes('old/system/')) {
    const relativePath = controllerPath.replace(/old\/system\//, '../');
    return relativePath;
  }
  
  // Retornar caminho original se não for do módulo system
  return controllerPath;
}

/**
 * Extrai o nome do módulo do caminho do controller
 * @param {string} controllerPath - Caminho do controller (ex: '@gestor/system/controllers/cronController')
 * @returns {string} Nome do módulo (ex: 'system', 'pessoa')
 */
function extractModuleName(controllerPath) {
  if (!controllerPath) return 'system';
  
  // Se começar com @gestor/, extrair o nome do módulo
  const match = controllerPath.match(/@gestor\/([^\/]+)/);
  if (match) {
    return match[1];
  }
  
  // Se contiver 'old/', tentar extrair o nome do módulo
  const oldMatch = controllerPath.match(/old\/([^\/]+)/);
  if (oldMatch) {
    return oldMatch[1];
  }
  
  // Fallback para 'system'
  return 'system';
}

/**
 * Executar um cron job manualmente
 */
async function executeCronJob(req, res) {
  try {
    const db = getDb();
    const CronJob = db.CronJob;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'ID do cron job é obrigatório' });
    }

    // Buscar o cron job
    const cronJob = await CronJob.findByPk(id);

    if (!cronJob) {
      return res.status(404).json({ message: 'Cron job não encontrado' });
    }

    // Verificar se está ativo
    if (!cronJob.active) {
      return res.status(400).json({ message: 'Cron job está inativo. Ative-o antes de executar manualmente.' });
    }

    console.log(`▶️  Executando cron job manualmente: "${cronJob.name}" (ID: ${id})`);

    const now = new Date();
    let lastExecutionLog = '';
    let lastExecutionSuccess = false;
    let executionResult = null;

    try {
      // Converter caminho do controller para caminho relativo se necessário
      const resolvedControllerPath = resolveControllerPath(cronJob.controller);
      
      // Limpar cache do módulo para garantir que mudanças sejam carregadas
      let controllerPath;
      try {
        controllerPath = require.resolve(resolvedControllerPath);
      } catch (resolveError) {
        // Se não conseguir resolver, tentar o caminho original
        try {
          controllerPath = require.resolve(cronJob.controller);
        } catch (originalError) {
          throw new Error(`Não foi possível resolver o caminho do controller: ${cronJob.controller}. Erro: ${resolveError.message}`);
        }
      }
      
      if (require.cache[controllerPath]) {
        delete require.cache[controllerPath];
      }

      const controllerModule = require(resolvedControllerPath);
      const handler = controllerModule[cronJob.method];

      if (typeof handler !== 'function') {
        throw new Error(`Método "${cronJob.method}" não encontrado no controller "${cronJob.controller}"`);
      }

      // Gerar token de sistema com permissões ADMIN
      const tokenHelper = require('../utils/cronTokenHelper');
      const systemToken = await tokenHelper.generateSystemToken(db);

      // Criar contexto para o handler
      const context = {
        db: db,
        token: systemToken,
        job: cronJob
      };

      // Executar o handler
      executionResult = await Promise.resolve(handler(context));

      lastExecutionSuccess = true;
      lastExecutionLog = `Executado manualmente com sucesso em ${now.toISOString()}`;
      
      console.log(`✅ Cron job "${cronJob.name}" executado com sucesso manualmente`);
      
      // Registrar log de sucesso
      try {
        const GestorSys = getGestorSys();
        const moduleName = extractModuleName(cronJob.controller);
        await GestorSys.logNormal(
          moduleName,
          `Cron job "${cronJob.name}" executado manualmente com sucesso`,
          {
            userId: req.user?.id,
            context: {
              cronJobId: cronJob.id,
              cronJobName: cronJob.name,
              cronExpression: cronJob.cronExpression,
              controller: cronJob.controller,
              method: cronJob.method,
              executionTime: now.toISOString(),
              manualExecution: true
            }
          }
        );
      } catch (logError) {
        console.error(`⚠️  Erro ao registrar log de sucesso do cron job "${cronJob.name}":`, logError);
      }
    } catch (error) {
      console.error(`❌ Erro ao executar cron job "${cronJob.name}" manualmente:`, error);
      lastExecutionSuccess = false;
      lastExecutionLog = `Erro na execução manual em ${now.toISOString()}: ${error.message}`;
      
      // Registrar log de erro
      try {
        const GestorSys = getGestorSys();
        const moduleName = extractModuleName(cronJob.controller);
        await GestorSys.logError(
          moduleName,
          `Erro ao executar cron job "${cronJob.name}" manualmente: ${error.message}`,
          {
            userId: req.user?.id,
            error: error,
            context: {
              cronJobId: cronJob.id,
              cronJobName: cronJob.name,
              cronExpression: cronJob.cronExpression,
              controller: cronJob.controller,
              method: cronJob.method,
              executionTime: now.toISOString(),
              manualExecution: true
            }
          }
        );
      } catch (logError) {
        console.error(`⚠️  Erro ao registrar log de erro do cron job "${cronJob.name}":`, logError);
      }
      
      // Atualizar status mesmo em caso de erro
      await cronJob.update({
        lastExecution: now,
        lastExecutionSuccess,
        lastExecutionLog
      });

      return res.status(500).json({
        message: 'Erro ao executar cron job',
        error: error.message,
        log: lastExecutionLog
      });
    }

    // Atualizar status do cron job
    await cronJob.update({
      lastExecution: now,
      lastExecutionSuccess,
      lastExecutionLog
    });

    res.json({
      success: true,
      message: `Cron job "${cronJob.name}" executado com sucesso`,
      executionTime: now.toISOString(),
      result: executionResult
    });

  } catch (error) {
    console.error('❌ Erro ao executar cron job:', error);
    res.status(500).json({ message: 'Erro ao executar cron job', error: error.message });
  }
}

module.exports = {
  executeCronJob
};

