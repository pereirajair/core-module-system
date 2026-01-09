'use strict';

const cron = require('node-cron');

// Lazy load db se não for passado explicitamente
function getDb() {
  const modelsLoader = require('./modelsLoader');
  return modelsLoader.loadModels();
}

// Lazy load GestorSys
function getGestorSys() {
  return require('./gestorSys');
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
  
  // Nota: old/ não é mais suportado, apenas node_modules/@gestor/*
  
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
  
  // Nota: old/ não é mais suportado, apenas node_modules/@gestor/*
  
  // Fallback para 'system'
  return 'system';
}

let started = false;
let scheduledJobs = {};

function clearAllJobs() {
  Object.values(scheduledJobs).forEach(job => {
    try {
      job.stop();
    } catch (_) {
      // ignore
    }
  });
  scheduledJobs = {};
}

async function initialize(passedDb) {
  if (started) {
    return;
  }
  started = true;

  const db = passedDb || getDb();
  const CronJob = db.CronJob;

  if (!CronJob) {
    console.warn('⚠️  Modelo CronJob não encontrado. Cron desabilitado.');
    return;
  }

  console.log('⏰ Inicializando gerenciador de Cron Jobs a partir do banco...');

  const jobs = await CronJob.findAll({
    where: { active: true }
  });

  clearAllJobs();

  jobs.forEach(job => {
    scheduleJob(db, job);
  });

  console.log(`✅ ${jobs.length} Cron Job(s) ativado(s) a partir do banco.`);
}

function scheduleJob(db, jobInstance) {
  if (!jobInstance.cronExpression || !jobInstance.controller || !jobInstance.method) {
    console.warn(`⚠️  CronJob inválido (id=${jobInstance.id}), ignorando.`);
    return;
  }

  try {
    const task = cron.schedule(jobInstance.cronExpression, async () => {
      const now = new Date();
      console.log(`⏰ Verificando CronJob "${jobInstance.name}" (${jobInstance.cronExpression}) às ${now.toISOString()}`);

      const CronJob = db.CronJob;
      let freshJob;

      try {
        freshJob = await CronJob.findByPk(jobInstance.id);
      } catch (error) {
        console.error(`❌ Erro ao recarregar CronJob "${jobInstance.name}" do banco:`, error);
      }

      // Se foi removido ou desativado, cancelar agendamento
      if (!freshJob || freshJob.active === false) {
        console.log(`⚠️  CronJob "${jobInstance.name}" foi desativado/removido. Cancelando agendamento.`);
        try {
          task.stop();
        } catch (_) {}
        delete scheduledJobs[jobInstance.id];
        return;
      }

      // Se configuração mudou (controller, método ou expressão), re-agendar com os novos dados
      if (
        freshJob.cronExpression !== jobInstance.cronExpression ||
        freshJob.controller !== jobInstance.controller ||
        freshJob.method !== jobInstance.method
      ) {
        console.log(`🔁 Configuração do CronJob "${jobInstance.name}" foi alterada. Reagendando...`);
        try {
          task.stop();
        } catch (_) {}
        delete scheduledJobs[jobInstance.id];
        // Re-agenda com a nova configuração (novo job cuidará das próximas execuções)
        scheduleJob(db, freshJob);
        return;
      }

      console.log(`⏰ Executando CronJob "${freshJob.name}" (${freshJob.cronExpression}) às ${now.toISOString()}`);

      let lastExecutionLog = '';
      let lastExecutionSuccess = false;

      try {
        // Converter caminho do controller para caminho relativo se necessário
        const resolvedControllerPath = resolveControllerPath(freshJob.controller);
        
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
          job: freshJob
        };

        await Promise.resolve(handler(context));

        lastExecutionSuccess = true;
        lastExecutionLog = `Executado com sucesso em ${now.toISOString()}`;
        
        // Registrar log de sucesso
        try {
          const GestorSys = getGestorSys();
          const moduleName = extractModuleName(freshJob.controller);
          await GestorSys.logNormal(
            moduleName,
            `Cron job "${freshJob.name}" executado com sucesso`,
            {
              context: {
                cronJobId: freshJob.id,
                cronJobName: freshJob.name,
                cronExpression: freshJob.cronExpression,
                controller: freshJob.controller,
                method: freshJob.method,
                executionTime: now.toISOString()
              }
            }
          );
        } catch (logError) {
          console.error(`⚠️  Erro ao registrar log de sucesso do cron job "${freshJob.name}":`, logError);
        }
      } catch (error) {
        console.error(`❌ Erro ao executar CronJob "${freshJob.name}":`, error);
        lastExecutionSuccess = false;
        lastExecutionLog = `Erro em ${now.toISOString()}: ${error.message}`;
        
        // Registrar log de erro
        try {
          const GestorSys = getGestorSys();
          const moduleName = extractModuleName(freshJob.controller);
          await GestorSys.logError(
            moduleName,
            `Erro ao executar cron job "${freshJob.name}": ${error.message}`,
            {
              error: error,
              context: {
                cronJobId: freshJob.id,
                cronJobName: freshJob.name,
                cronExpression: freshJob.cronExpression,
                controller: freshJob.controller,
                method: freshJob.method,
                executionTime: now.toISOString()
              }
            }
          );
        } catch (logError) {
          console.error(`⚠️  Erro ao registrar log de erro do cron job "${freshJob.name}":`, logError);
        }
      }

      try {
        await freshJob.update({
          lastExecution: now,
          lastExecutionSuccess,
          lastExecutionLog
        });
      } catch (updateError) {
        console.error(`❌ Erro ao atualizar status do CronJob "${freshJob.name}":`, updateError);
      }
    }, {
      scheduled: true
    });

    scheduledJobs[jobInstance.id] = task;
  } catch (error) {
    console.error(`❌ Erro ao agendar CronJob "${jobInstance.name}":`, error);
  }
}

module.exports = {
  initialize,
  clearAllJobs
};
