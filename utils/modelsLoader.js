/**
 * Models Loader
 * Carrega e inicializa todos os models do Sequelize
 */
const pathResolver = require('./pathResolver');
const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';

let dbInstance = null;

function loadModels() {
  // Retornar instância cached se já foi carregada
  if (dbInstance) {
    return dbInstance;
  }

  // Carregar configuração do banco
  const config = require('../config/database')[env];
  
  // Carregar moduleLoader
  const { loadModuleModels } = require('./moduleLoader');
  
  const db = {};
  
  // Criar instância do Sequelize
  let sequelize;
  if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
  } else {
    sequelize = new Sequelize(config.database, config.username, config.password, config);
  }
  
  // Carregar models dos módulos
  const moduleModels = loadModuleModels(sequelize, Sequelize.DataTypes);
  Object.assign(db, moduleModels);
  
  // Limpar todas as associações existentes antes de associar (para evitar conflitos de cache)
  Object.keys(db).forEach(modelName => {
    if (db[modelName].associations) {
      const assocNames = Object.keys(db[modelName].associations);
      assocNames.forEach(assocName => {
        try {
          delete db[modelName].associations[assocName];
        } catch (e) {
          // Ignorar erros ao deletar
        }
      });
    }
  });
  
  // Associar todos os models
  // Ordenar para garantir que Menu seja associado antes de MenuItems
  // (para evitar que belongsTo crie hasMany automático que conflite)
  const modelNames = Object.keys(db);
  const orderedModelNames = modelNames.sort((a, b) => {
    // Menu deve vir antes de MenuItems
    if (a === 'Menu' && b === 'MenuItems') return -1;
    if (a === 'MenuItems' && b === 'Menu') return 1;
    return 0;
  });
  
  orderedModelNames.forEach(modelName => {
    if (db[modelName].associate) {
      try {
        db[modelName].associate(db);
      } catch (error) {
        console.error(`❌ Erro ao associar modelo ${modelName}:`, error.message);
        throw error;
      }
    }
  });
  
  db.sequelize = sequelize;
  db.Sequelize = Sequelize;
  
  // Cachear instância
  dbInstance = db;
  
  return db;
}

module.exports = {
  loadModels
};

