const path = require('path');
const fs = require('fs');

// Tentar carregar .env do diretório frontend (onde está o projeto principal)
// O módulo pode estar em mod/system ou node_modules/@gestor/system
const possibleEnvPaths = [
  path.resolve(__dirname, '../../../frontend/.env'), // node_modules/@gestor/system/config -> frontend/.env
  path.resolve(__dirname, '../../../../frontend/.env'), // node_modules/@gestor/system/config -> frontend/.env (alternativo)
  path.resolve(__dirname, '../../frontend/.env'), // mod/system/config -> frontend/.env
  path.resolve(__dirname, '../.env'), // mod/system/.env ou node_modules/@gestor/system/.env
  path.resolve(__dirname, '../../.env'), // raiz do projeto
];

let envPath = null;
for (const envPathCandidate of possibleEnvPaths) {
  if (fs.existsSync(envPathCandidate)) {
    envPath = envPathCandidate;
    break;
  }
}

if (envPath) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config(); // Tentar do diretório atual como fallback
}

const { getModuleMigrationsPaths, getModuleSeedersPaths } = require('../utils/moduleLoader');

// Caminhos padrão
const defaultMigrationsPath = path.join(__dirname, '../migrations');
const defaultSeedersPath = path.join(__dirname, '../seeders');

// Obter caminhos dos módulos
const moduleMigrationsPaths = getModuleMigrationsPaths();
const moduleSeedersPaths = getModuleSeedersPaths();

// Combinar caminhos padrão com caminhos dos módulos
const migrationsPaths = [defaultMigrationsPath, ...moduleMigrationsPaths];
const seedersPaths = [defaultSeedersPath, ...moduleSeedersPaths];

const baseConfig = {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_CONNECTION,
  migrationStorage: 'sequelize',
  migrationStorageTableName: 'SequelizeMeta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'SequelizeData',
};

module.exports = {
  development: {
    ...baseConfig,
    // Sequelize CLI não suporta múltiplos caminhos diretamente
    // Usaremos o caminho padrão e carregaremos migrations dos módulos manualmente se necessário
    migrationStoragePath: defaultMigrationsPath,
    seederStoragePath: defaultSeedersPath,
  },
  test: {
    ...baseConfig,
    migrationStoragePath: defaultMigrationsPath,
    seederStoragePath: defaultSeedersPath,
  },
  production: {
    ...baseConfig,
    migrationStoragePath: defaultMigrationsPath,
    seederStoragePath: defaultSeedersPath,
  },
};

// Exportar caminhos para uso em outros lugares
module.exports.migrationsPaths = migrationsPaths;
module.exports.seedersPaths = seedersPaths;
