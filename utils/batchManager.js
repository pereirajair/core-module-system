'use strict';
const cron = require('node-cron');
const modelsLoader = require('./modelsLoader');

let started = false;
const scheduledJobs = {};

function getDb() {
  return modelsLoader.loadModels();
}

function clearAllJobs() {
  Object.values(scheduledJobs).forEach(task => {
    try {
      task.stop();
    } catch (error) {
      console.error('❌ Erro ao parar batch job:', error);
    }
  });
  Object.keys(scheduledJobs).forEach(key => delete scheduledJobs[key]);
  console.log('✅ Todos os Batch Jobs foram limpos.');
}

async function initialize(passedDb) {
  if (started) {
    return;
  }
  started = true;

  const db = passedDb || getDb();
  const BatchJob = db.BatchJob;

  if (!BatchJob) {
    console.warn('⚠️  Modelo BatchJob não encontrado. Batch processing desabilitado.');
    return;
  }

  console.log('📦 Inicializando gerenciador de Batch Jobs a partir do banco...');

  const jobs = await BatchJob.findAll({
    where: { active: true }
  });

  clearAllJobs();

  jobs.forEach(job => {
    scheduleJob(db, job);
  });

  console.log(`✅ ${jobs.length} Batch Job(s) ativado(s) a partir do banco.`);
}

function scheduleJob(db, jobInstance) {
  if (!jobInstance.cronExpression || !jobInstance.controller || !jobInstance.method) {
    console.warn(`⚠️  BatchJob inválido (id=${jobInstance.id}), ignorando.`);
    return;
  }

  try {
    const task = cron.schedule(jobInstance.cronExpression, async () => {
      const now = new Date();
      console.log(`📦 Verificando BatchJob "${jobInstance.name}" (${jobInstance.cronExpression}) às ${now.toISOString()}`);

      const BatchJob = db.BatchJob;
      let freshJob;

      try {
        freshJob = await BatchJob.findByPk(jobInstance.id);
      } catch (error) {
        console.error(`❌ Erro ao recarregar BatchJob "${jobInstance.name}" do banco:`, error);
      }

      // Se foi removido ou desativado, cancelar agendamento
      if (!freshJob || freshJob.active === false) {
        console.log(`⚠️  BatchJob "${jobInstance.name}" foi desativado/removido. Cancelando agendamento.`);
        try {
          task.stop();
        } catch (_) {}
        delete scheduledJobs[jobInstance.id];
        return;
      }

      // Se configuração mudou (controller, método, expressão ou parâmetros), re-agendar
      if (
        freshJob.cronExpression !== jobInstance.cronExpression ||
        freshJob.controller !== jobInstance.controller ||
        freshJob.method !== jobInstance.method ||
        JSON.stringify(freshJob.parameters) !== JSON.stringify(jobInstance.parameters)
      ) {
        console.log(`🔁 Configuração do BatchJob "${jobInstance.name}" foi alterada. Reagendando...`);
        try {
          task.stop();
        } catch (_) {}
        delete scheduledJobs[jobInstance.id];
        scheduleJob(db, freshJob);
        return;
      }

      console.log(`📦 Executando BatchJob "${freshJob.name}" (${freshJob.cronExpression}) às ${now.toISOString()}`);

      let lastExecutionLog = '';
      let lastExecutionSuccess = false;

      try {
        // Resolver caminho do controller (converter @gestor/* para caminho relativo se necessário)
        const moduleLoader = require('./moduleLoader');
        const resolvedControllerPath = moduleLoader.resolveGestorModule(freshJob.controller);
        
        // Limpar cache do módulo para garantir que mudanças sejam carregadas
        let controllerPath;
        try {
          controllerPath = require.resolve(resolvedControllerPath);
        } catch (resolveError) {
          // Se não conseguir resolver, tentar o caminho original
          try {
            controllerPath = require.resolve(freshJob.controller);
          } catch (originalError) {
            throw new Error(`Não foi possível resolver o caminho do controller: ${freshJob.controller}. Erro: ${resolveError.message}`);
          }
        }
        
        if (require.cache[controllerPath]) {
          delete require.cache[controllerPath];
        }

        const controllerModule = require(resolvedControllerPath);
        const handler = controllerModule[freshJob.method];

        if (typeof handler !== 'function') {
          throw new Error(`Método "${freshJob.method}" não encontrado no controller "${freshJob.controller}"`);
        }

        // Gerar token de sistema com permissões ADMIN
        const tokenHelper = require('./cronTokenHelper');
        const systemToken = await tokenHelper.generateSystemToken(db);

        // Criar contexto para o handler
        const context = {
          db: db,
          token: systemToken,
          job: freshJob,
          parameters: freshJob.parameters || {}
        };

        // Executar o handler passando o contexto e os parâmetros
        await Promise.resolve(handler(context, freshJob.parameters || {}));

        lastExecutionSuccess = true;
        lastExecutionLog = `Executado com sucesso em ${now.toISOString()}`;

        // Log usando GestorSys
        const GestorSys = require('./gestorSys');
        const path = require('path');
        function extractModuleName(controllerPath) {
          const match = controllerPath.match(/@gestor\/([^/]+)/);
          if (match) return match[1];
          const parts = controllerPath.split(path.sep);
          const modulesIndex = parts.indexOf('modules');
          if (modulesIndex >= 0 && modulesIndex < parts.length - 1) {
            return parts[modulesIndex + 1];
          }
          const oldIndex = parts.indexOf('old');
          if (oldIndex >= 0 && oldIndex < parts.length - 1) {
            return parts[oldIndex + 1];
          }
          return 'system';
        }
        const moduleName = extractModuleName(freshJob.controller);
        await GestorSys.logNormal(moduleName, `Batch job "${freshJob.name}" executado com sucesso`, {
          context: {
            batchJobId: freshJob.id,
            batchJobName: freshJob.name,
            cronExpression: freshJob.cronExpression,
            controller: freshJob.controller,
            method: freshJob.method,
            parameters: freshJob.parameters,
            executionTime: now.toISOString()
          }
        });
      } catch (error) {
        console.error(`❌ Erro ao executar BatchJob "${freshJob.name}":`, error);
        lastExecutionSuccess = false;
        lastExecutionLog = `Erro em ${now.toISOString()}: ${error.message}`;

        // Log de erro usando GestorSys
        const GestorSys = require('./gestorSys');
        const path = require('path');
        function extractModuleName(controllerPath) {
          const match = controllerPath.match(/@gestor\/([^/]+)/);
          if (match) return match[1];
          const parts = controllerPath.split(path.sep);
          const modulesIndex = parts.indexOf('modules');
          if (modulesIndex >= 0 && modulesIndex < parts.length - 1) {
            return parts[modulesIndex + 1];
          }
          const oldIndex = parts.indexOf('old');
          if (oldIndex >= 0 && oldIndex < parts.length - 1) {
            return parts[oldIndex + 1];
          }
          return 'system';
        }
        const moduleName = extractModuleName(freshJob.controller);
        await GestorSys.logException(moduleName, error, {
          context: {
            batchJobId: freshJob.id,
            batchJobName: freshJob.name,
            cronExpression: freshJob.cronExpression,
            controller: freshJob.controller,
            method: freshJob.method,
            parameters: freshJob.parameters,
            executionTime: now.toISOString()
          }
        });
      }

      // Atualizar estatísticas no banco
      try {
        await freshJob.update({
          lastExecution: now,
          lastExecutionSuccess,
          lastExecutionLog,
          totalExecutions: (freshJob.totalExecutions || 0) + 1,
          totalSuccess: lastExecutionSuccess ? (freshJob.totalSuccess || 0) + 1 : (freshJob.totalSuccess || 0),
          totalErrors: !lastExecutionSuccess ? (freshJob.totalErrors || 0) + 1 : (freshJob.totalErrors || 0)
        });
      } catch (updateError) {
        console.error(`❌ Erro ao atualizar status do BatchJob "${freshJob.name}":`, updateError);
      }
    }, { scheduled: true });

    scheduledJobs[jobInstance.id] = task;
  } catch (error) {
    console.error(`❌ Erro ao agendar BatchJob "${jobInstance.name}":`, error);
  }
}

module.exports = {
  initialize,
  clearAllJobs,
  scheduleJob
};

