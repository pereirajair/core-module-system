'use strict';
const pathResolver = require('../utils/pathResolver');

const fs = require('fs');
const path = require('path');

// Lazy load db
function getDb() {
  const modelsLoader = require('./modelsLoader');
  return modelsLoader.loadModels();
}

const db = getDb();

// Armazenar referência ao app Express
let appInstance = null;

// Função para definir a instância do app Express
function setAppInstance(app) {
  appInstance = app;
}

// Função para recarregar models do disco dinamicamente
// IMPORTANTE: Recarrega models de todos os módulos instalados em node_modules/@gestor/*
async function reloadModels() {
  try {
    console.log('🔄 Recarregando models do disco...');
    
    // Limpar cache do moduleLoader e modelsLoader para garantir que novos módulos sejam detectados
    const moduleLoaderPath = require.resolve('./moduleLoader');
    if (require.cache[moduleLoaderPath]) {
      delete require.cache[moduleLoaderPath];
    }
    
    const modelsLoaderPath = require.resolve('./modelsLoader');
    if (require.cache[modelsLoaderPath]) {
      delete require.cache[modelsLoaderPath];
    }
    
    // Carregar módulos usando moduleLoader
    const { loadModules } = require('./moduleLoader');
    const modules = loadModules();
    
    console.log(`📦 Encontrados ${modules.length} módulo(s) para recarregar models`);
    
    // Recarregar models de cada módulo
    let totalModelsReloaded = 0;
    
    for (const module of modules) {
      if (!module.enabled) {
        console.log(`⏭️  Pulando módulo ${module.name} (desabilitado)`);
        continue;
      }
      
      const modelsPath = path.join(module.path, 'models');
      
      if (!fs.existsSync(modelsPath)) {
        console.log(`⚠️  Diretório de models não encontrado para módulo ${module.name}: ${modelsPath}`);
        continue;
      }
      
      try {
        // Listar arquivos de model no diretório do módulo
        const files = fs.readdirSync(modelsPath)
          .filter(file => file.indexOf('.') !== 0 && file !== 'index.js' && file.slice(-3) === '.js');
        
        console.log(`📁 Recarregando ${files.length} model(s) do módulo ${module.name}...`);
        
        // Limpar cache do require para os arquivos de model
        files.forEach(file => {
          const filePath = path.join(modelsPath, file);
          try {
            if (require.cache[require.resolve(filePath)]) {
              delete require.cache[require.resolve(filePath)];
            }
          } catch (e) {
            // Ignorar se o arquivo não foi carregado ainda
          }
        });
        
        // Recarregar models manualmente
        files.forEach(file => {
          try {
            const filePath = path.join(modelsPath, file);
            const model = require(filePath)(db.sequelize, db.Sequelize.DataTypes);
            // Atualizar ou adicionar model no objeto db
            const modelName = model.name || model.constructor.name || file.replace('.js', '');
            db[modelName] = model;
            totalModelsReloaded++;
          } catch (error) {
            console.error(`❌ Erro ao recarregar model ${file} do módulo ${module.name}:`, error.message);
          }
        });
      } catch (error) {
        console.error(`❌ Erro ao processar models do módulo ${module.name}:`, error.message);
      }
    }
    
    // Reassociar models
    console.log('🔄 Reassociando models...');
    Object.keys(db).forEach(modelName => {
      if (db[modelName] && typeof db[modelName].associate === 'function') {
        try {
          db[modelName].associate(db);
        } catch (error) {
          console.error(`❌ Erro ao reassociar model ${modelName}:`, error.message);
        }
      }
    });
    
    console.log(`✅ ${totalModelsReloaded} model(s) recarregado(s) com sucesso de ${modules.filter(m => m.enabled).length} módulo(s)!`);
    return { success: true, message: `${totalModelsReloaded} models recarregados com sucesso` };
  } catch (error) {
    console.error('❌ Erro ao recarregar models:', error);
    return { success: false, message: `Erro ao recarregar models: ${error.message}` };
  }
}

// Função para atualizar rotas dinâmicas
async function reloadDynamicRoutes() {
  if (!appInstance) {
    console.warn('⚠️ App instance não definida. Não é possível atualizar rotas dinâmicas.');
    return { success: false, message: 'App instance não definida' };
  }
  
  try {
    console.log('🔄 Atualizando rotas dinâmicas...');
    
    // IMPORTANTE: Recarregar models primeiro para garantir que novos modelos estejam disponíveis
    // Isso é crítico porque novos modelos criados/modificados precisam estar no objeto db
    console.log('🔄 Recarregando models antes de atualizar rotas...');
    const reloadResult = await reloadModels();
    if (!reloadResult.success) {
      console.warn('⚠️ Aviso: Falha ao recarregar models, mas continuando com atualização de rotas...');
    }
    
    // Limpar cache do dynamicCrudController para garantir que ele use os modelos recarregados
    const dynamicCrudControllerPath = require.resolve('../controllers/dynamicCrudController');
    if (require.cache[dynamicCrudControllerPath]) {
      delete require.cache[dynamicCrudControllerPath];
    }
    
    // Importar funções necessárias (após limpar cache)
    const dynamicCrudController = require('../controllers/dynamicCrudController');
    const authenticateToken = require('../middleware/authenticateToken');
    
    // Buscar CRUDs ativos
    const Crud = db.Crud;
    const cruds = await Crud.findAll({
      where: { active: true },
      attributes: ['resource', 'endpoint']
    });
    
    // Lista de rotas estáticas que não devem ser sobrescritas
    const staticRoutes = ['users', 'organizations', 'roles', 'systems', 'functions', 
                         'contacts', 'channel-types', 'channels', 'conversations', 
                         'messages', 'cruds', 'models', 'menus', 'chatia'];
    
    // Criar novas rotas dinâmicas
    let routesAdded = 0;
    cruds.forEach(crud => {
      let routePath = crud.endpoint;
      
      // Garantir que o endpoint começa com /api/
      if (!routePath.startsWith('/api/')) {
        if (routePath.startsWith('/')) {
          routePath = `/api${routePath}`;
        } else {
          routePath = `/api/${routePath}`;
        }
      }
      
      const routeName = routePath.replace(/^\/api\//, '');
      const resource = crud.resource || routeName;
      
      if (!staticRoutes.includes(routeName)) {
        // Adicionar rotas dinâmicas (Express permite adicionar rotas mesmo que já existam)
        appInstance.get(routePath, authenticateToken, (req, res, next) => {
          req.params.resource = resource;
          dynamicCrudController.handleDynamicCrud(req, res, next);
        });
        
        appInstance.get(`${routePath}/:id`, authenticateToken, (req, res, next) => {
          req.params.resource = resource;
          dynamicCrudController.handleDynamicCrud(req, res, next);
        });
        
        appInstance.post(routePath, authenticateToken, (req, res, next) => {
          req.params.resource = resource;
          dynamicCrudController.handleDynamicCrud(req, res, next);
        });
        
        appInstance.put(`${routePath}/:id`, authenticateToken, (req, res, next) => {
          req.params.resource = resource;
          dynamicCrudController.handleDynamicCrud(req, res, next);
        });
        
        appInstance.patch(`${routePath}/:id`, authenticateToken, (req, res, next) => {
          req.params.resource = resource;
          dynamicCrudController.handleDynamicCrud(req, res, next);
        });
        
        appInstance.delete(`${routePath}/:id`, authenticateToken, (req, res, next) => {
          req.params.resource = resource;
          dynamicCrudController.handleDynamicCrud(req, res, next);
        });
        
        routesAdded++;
      }
    });
    
    console.log(`✅ Rotas dinâmicas atualizadas com sucesso! (${routesAdded} rotas)`);
    return { success: true, message: `Rotas dinâmicas atualizadas com sucesso (${routesAdded} rotas)` };
  } catch (error) {
    console.error('❌ Erro ao atualizar rotas dinâmicas:', error);
    return { success: false, message: `Erro ao atualizar rotas: ${error.message}` };
  }
}

// Função para executar migrations pendentes
async function runPendingMigrations() {
  try {
    console.log('🔄 Executando migrations pendentes...');
    const { execSync } = require('child_process');
    const result = execSync('npm run db:migrate', { 
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf8'
    });
    console.log('✅ Migrations executadas com sucesso!');
    return { success: true, message: 'Migrations executadas com sucesso', output: result };
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    return { 
      success: false, 
      message: `Erro ao executar migrations: ${error.message}`,
      output: error.stdout || error.stderr || error.message 
    };
  }
}

module.exports = {
  setAppInstance,
  reloadModels,
  reloadDynamicRoutes,
  runPendingMigrations
};

