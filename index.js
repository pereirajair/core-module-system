/**
 * Módulo System - Core do Sistema Gestor
 * Exporta informações do módulo e funcionalidades principais
 */
const fs = require('fs');
const path = require('path');

// Carregar module.json se existir, senão usar informações do package.json
let moduleInfo = {};
const moduleJsonPath = path.join(__dirname, 'module.json');
const packageJsonPath = path.join(__dirname, 'package.json');

if (fs.existsSync(moduleJsonPath)) {
  moduleInfo = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf8'));
} else if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (pkg.gestor) {
    moduleInfo = pkg.gestor;
  }
}

moduleInfo.path = __dirname;

// Exportar informações do módulo
module.exports = moduleInfo;

// Exportar funcionalidades principais para auto-carregamento
module.exports.middleware = {
  authenticateToken: require('./middleware/authenticateToken'),
  authorizeFunctions: require('./middleware/authorizeFunctions'),
  authorizeRoles: require('./middleware/authorizeRoles')
};

module.exports.routes = {
  auth: require('./routes/auth'),
  crud: require('./routes/crud'),
  model: require('./routes/model'),
  chatIA: require('./routes/chatIA'),
  mcp: require('./routes/mcp'),
  module: require('./routes/module')
};

module.exports.utils = {
  moduleLoader: require('./utils/moduleLoader'),
  settingsHelper: require('./utils/settingsHelper'),
  associationUtils: require('./utils/associationUtils'),
  autoMCP: require('./utils/autoMCP'),
  dynamicReload: require('./utils/dynamicReload')
};

module.exports.config = {
  database: require('./config/database')
};

module.exports.scripts = {
  migrate: require('./scripts/migrate'),
  seed: require('./scripts/seed')
};
