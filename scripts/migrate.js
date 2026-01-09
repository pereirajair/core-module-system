#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Tentar carregar .env do diretório frontend (onde está o projeto principal)
// O módulo pode estar em mod/system ou node_modules/@gestor/system
const possibleEnvPaths = [
  path.resolve(__dirname, '../../../frontend/.env'), // node_modules/@gestor/system/scripts -> frontend/.env
  path.resolve(__dirname, '../../../../frontend/.env'), // node_modules/@gestor/system/scripts -> frontend/.env (alternativo)
  path.resolve(__dirname, '../../frontend/.env'), // mod/system/scripts -> frontend/.env
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
const { Sequelize, DataTypes } = require('sequelize');
const { getModuleMigrationsPaths } = require('../utils/moduleLoader');

const config = require('../config/database.js')[process.env.NODE_ENV || 'development'];

// Criar instância do Sequelize
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: false
});

// Caminho padrão de migrations
const defaultMigrationsPath = path.join(__dirname, '../migrations');

// Obter caminhos de migrations dos módulos (já ordenados por dependências)
const moduleMigrationsPaths = getModuleMigrationsPaths();
console.log(`📦 Caminhos de migrations encontrados: ${moduleMigrationsPaths.length}`);
if (moduleMigrationsPaths.length > 0) {
  console.log('   Módulos:', moduleMigrationsPaths.map(p => {
    const parts = p.split(path.sep);
    const modIndex = parts.indexOf('mod');
    return modIndex >= 0 && modIndex < parts.length - 1 ? parts[modIndex + 1] : 'unknown';
  }).join(', '));
}

async function runMigrations() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida.');

    // Carregar todas as migrations de todos os caminhos
    // Ordem: primeiro migrations padrão, depois módulos ordenados por dependências
    const allMigrations = [];
    const migrationPathsAdded = new Set(); // Usar Set para evitar duplicatas baseado no caminho real
    
    // Função auxiliar para resolver caminho real (resolver links simbólicos)
    function resolveRealPath(filePath) {
      try {
        return fs.realpathSync(filePath);
      } catch (error) {
        return filePath;
      }
    }
    
    // Carregar migrations padrão primeiro
    if (fs.existsSync(defaultMigrationsPath)) {
      const realDefaultPath = resolveRealPath(defaultMigrationsPath);
      migrationPathsAdded.add(realDefaultPath);
      
      const files = fs.readdirSync(defaultMigrationsPath)
        .filter(file => file.endsWith('.js'))
        .map(file => ({
          name: file,
          path: path.join(defaultMigrationsPath, file),
          source: 'default'
        }));
      console.log(`📁 Carregando ${files.length} migration(s) padrão de: ${defaultMigrationsPath}`);
      allMigrations.push(...files);
    }
    
    // Carregar migrations dos módulos na ordem de dependências
    for (const migrationsPath of moduleMigrationsPaths) {
      if (!fs.existsSync(migrationsPath)) {
        console.log(`⚠️  Caminho não encontrado: ${migrationsPath}`);
        continue;
      }

      // Verificar se o caminho real já foi adicionado (evitar duplicatas)
      const realMigrationsPath = resolveRealPath(migrationsPath);
      if (migrationPathsAdded.has(realMigrationsPath)) {
        console.log(`⏭️  Caminho de migrations já foi carregado (duplicata ignorada): ${migrationsPath}`);
        continue;
      }
      migrationPathsAdded.add(realMigrationsPath);

      // Extrair nome do módulo do caminho
      // Suporta: .../mod/[nome-do-modulo]/migrations
      //          .../modules/[nome-do-modulo]/migrations
      //          .../node_modules/@gestor/[nome-do-modulo]/migrations
      const pathParts = migrationsPath.split(path.sep);
      let moduleName = 'unknown';
      
      // Tentar encontrar em mod/ (nova estrutura)
      const modIndex = pathParts.indexOf('mod');
      if (modIndex >= 0 && modIndex < pathParts.length - 1) {
        moduleName = pathParts[modIndex + 1];
      } else {
        // Tentar encontrar em modules/
        const modulesIndex = pathParts.indexOf('modules');
        if (modulesIndex >= 0 && modulesIndex < pathParts.length - 1) {
          moduleName = pathParts[modulesIndex + 1];
        } else {
          // Tentar encontrar em node_modules/@gestor/
          const gestorIndex = pathParts.indexOf('@gestor');
          if (gestorIndex >= 0 && gestorIndex < pathParts.length - 1) {
            moduleName = pathParts[gestorIndex + 1];
          }
        }
      }

      const files = fs.readdirSync(migrationsPath)
        .filter(file => file.endsWith('.js'))
        .map(file => ({
          name: file,
          path: path.join(migrationsPath, file),
          source: moduleName
        }));

      console.log(`📁 Carregando ${files.length} migration(s) do módulo "${moduleName}": ${migrationsPath}`);
      allMigrations.push(...files);
    }

    // Ordenar migrations por nome (timestamp)
    allMigrations.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`\n📦 Total de migrations encontradas: ${allMigrations.length}`);

    // Executar migrations pendentes
    const queryInterface = sequelize.getQueryInterface();
    
    // Verificar se a tabela SequelizeMeta existe, se não, criar
    let executedNames = new Set();
    try {
      const [executedMigrations] = await sequelize.query(
        "SELECT name FROM SequelizeMeta ORDER BY name",
        { type: sequelize.QueryTypes.SELECT }
      );
      executedNames = new Set(executedMigrations.map(m => m.name));
    } catch (error) {
      // Tabela não existe, criar
      await queryInterface.createTable('SequelizeMeta', {
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          primaryKey: true
        }
      });
      console.log('📋 Tabela SequelizeMeta criada.');
      // Verificar novamente após criar a tabela (pode já ter dados)
      try {
        const [executedMigrations] = await sequelize.query(
          "SELECT name FROM SequelizeMeta ORDER BY name",
          { type: sequelize.QueryTypes.SELECT }
        );
        executedNames = new Set(executedMigrations.map(m => m.name));
      } catch (e) {
        // Tabela vazia, continuar
      }
    }

    let executedCount = 0;
    for (const migration of allMigrations) {
      if (executedNames.has(migration.name)) {
        console.log(`⏭️  ${migration.name} já executada`);
        continue;
      }

      console.log(`🔄 Executando: ${migration.name}`);
      const migrationModule = require(migration.path);
      
      if (migrationModule.up) {
        try {
          await migrationModule.up(queryInterface, DataTypes);
          // Usar INSERT IGNORE ou verificar novamente antes de inserir
          await sequelize.query(
            `INSERT IGNORE INTO SequelizeMeta (name) VALUES ('${migration.name.replace(/'/g, "''")}')`
          );
          executedCount++;
          console.log(`✅ ${migration.name} executada com sucesso`);
        } catch (error) {
          // Se já foi executada entre a verificação e a execução, apenas logar
          if (error.name === 'SequelizeUniqueConstraintError' || 
              (error.original && error.original.code === 'ER_DUP_ENTRY')) {
            console.log(`⏭️  ${migration.name} já foi executada durante o processo`);
            // Registrar como executada mesmo que tenha dado erro de duplicata
            await sequelize.query(
              `INSERT IGNORE INTO SequelizeMeta (name) VALUES ('${migration.name.replace(/'/g, "''")}')`
            );
            continue;
          }
          // Se for erro de coluna/campo duplicado, apenas avisar e continuar
          if (error.name === 'SequelizeDatabaseError' && 
              (error.original && (error.original.code === 'ER_DUP_FIELDNAME' || error.original.errno === 1060))) {
            console.log(`⚠️  ${migration.name}: Campo já existe (${error.original.sqlMessage || error.message}). Pulando...`);
            // Registrar como executada mesmo que tenha dado erro de campo duplicado
            await sequelize.query(
              `INSERT IGNORE INTO SequelizeMeta (name) VALUES ('${migration.name.replace(/'/g, "''")}')`
            );
            continue;
          }
          // Se for erro de índice/chave duplicado, apenas avisar e continuar
          if (error.name === 'SequelizeDatabaseError' && 
              (error.original && (error.original.code === 'ER_DUP_KEYNAME' || error.original.errno === 1061))) {
            console.log(`⚠️  ${migration.name}: Índice/chave já existe (${error.original.sqlMessage || error.message}). Pulando...`);
            // Registrar como executada mesmo que tenha dado erro de índice duplicado
            await sequelize.query(
              `INSERT IGNORE INTO SequelizeMeta (name) VALUES ('${migration.name.replace(/'/g, "''")}')`
            );
            continue;
          }
          // Se for erro de tabela duplicada, apenas avisar e continuar
          if (error.name === 'SequelizeDatabaseError' && 
              (error.original && (error.original.code === 'ER_TABLE_EXISTS_ERROR' || error.original.errno === 1050))) {
            console.log(`⚠️  ${migration.name}: Tabela já existe (${error.original.sqlMessage || error.message}). Pulando...`);
            // Registrar como executada mesmo que tenha dado erro de tabela duplicada
            await sequelize.query(
              `INSERT IGNORE INTO SequelizeMeta (name) VALUES ('${migration.name.replace(/'/g, "''")}')`
            );
            continue;
          }
          throw error;
        }
      }
    }

    if (executedCount === 0) {
      console.log('\n✅ Nenhuma migration pendente.');
    } else {
      console.log(`\n✅ ${executedCount} migration(s) executada(s) com sucesso.`);
    }

    await sequelize.close();
    // process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    await sequelize.close();
    process.exit(1);
  }
}

// Exportar função para uso como módulo
module.exports = runMigrations;

// Executar apenas quando chamado diretamente (não quando importado)
if (require.main === module) {
  runMigrations();
}

