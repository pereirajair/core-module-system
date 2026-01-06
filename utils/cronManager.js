'use strict';

const cron = require('node-cron');

// Lazy load db se não for passado explicitamente
function getDb() {
  const modelsLoader = require('./modelsLoader');
  return modelsLoader.loadModels();
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
        // Limpar cache do módulo para garantir que mudanças sejam carregadas
        const controllerPath = require.resolve(freshJob.controller);
        if (require.cache[controllerPath]) {
          delete require.cache[controllerPath];
        }

        const controllerModule = require(freshJob.controller);
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
      } catch (error) {
        console.error(`❌ Erro ao executar CronJob "${freshJob.name}":`, error);
        lastExecutionSuccess = false;
        lastExecutionLog = `Erro em ${now.toISOString()}: ${error.message}`;
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
