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
  
  // Associar todos os models
  Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
      db[modelName].associate(db);
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

