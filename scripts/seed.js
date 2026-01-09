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
const { getModuleSeedersPaths } = require('../utils/moduleLoader');

const config = require('../config/database.js')[process.env.NODE_ENV || 'development'];

// Criar instância do Sequelize
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: false
});

// Caminho padrão de seeders
const defaultSeedersPath = path.join(__dirname, '../seeders');

// Obter caminhos de seeders dos módulos (já ordenados por dependências)
const moduleSeedersPaths = getModuleSeedersPaths();
console.log(`📦 Caminhos de seeders encontrados: ${moduleSeedersPaths.length}`);
if (moduleSeedersPaths.length > 0) {
  console.log('   Módulos:', moduleSeedersPaths.map(p => {
    const parts = p.split(path.sep);
    const modIndex = parts.indexOf('mod');
    return modIndex >= 0 && modIndex < parts.length - 1 ? parts[modIndex + 1] : 'unknown';
  }).join(', '));
}

async function runSeeders() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida.');

    // Carregar todos os seeders de todos os caminhos
    // Ordem: primeiro seeders padrão, depois módulos ordenados por dependências
    const allSeeders = [];
    const seederPathsAdded = new Set(); // Usar Set para evitar duplicatas baseado no caminho real
    
    // Função auxiliar para resolver caminho real (resolver links simbólicos)
    function resolveRealPath(filePath) {
      try {
        return fs.realpathSync(filePath);
      } catch (error) {
        return filePath;
      }
    }
    
    // Carregar seeders padrão primeiro
    if (fs.existsSync(defaultSeedersPath)) {
      const realDefaultPath = resolveRealPath(defaultSeedersPath);
      seederPathsAdded.add(realDefaultPath);
      
      const files = fs.readdirSync(defaultSeedersPath)
        .filter(file => file.endsWith('.js'))
        .map(file => ({
          name: file,
          path: path.join(defaultSeedersPath, file),
          source: 'default'
        }));
      console.log(`📁 Carregando ${files.length} seeder(s) padrão de: ${defaultSeedersPath}`);
      allSeeders.push(...files);
    }
    
    // Carregar seeders dos módulos na ordem de dependências
    for (const seedersPath of moduleSeedersPaths) {
      if (!fs.existsSync(seedersPath)) {
        console.log(`⚠️  Caminho não encontrado: ${seedersPath}`);
        continue;
      }

      // Verificar se o caminho real já foi adicionado (evitar duplicatas)
      const realSeedersPath = resolveRealPath(seedersPath);
      if (seederPathsAdded.has(realSeedersPath)) {
        console.log(`⏭️  Caminho de seeders já foi carregado (duplicata ignorada): ${seedersPath}`);
        continue;
      }
      seederPathsAdded.add(realSeedersPath);

      // Extrair nome do módulo do caminho
      // Suporta: .../mod/[nome-do-modulo]/seeders
      //          .../modules/[nome-do-modulo]/seeders
      //          .../node_modules/@gestor/[nome-do-modulo]/seeders
      const pathParts = seedersPath.split(path.sep);
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

      const files = fs.readdirSync(seedersPath)
        .filter(file => file.endsWith('.js'))
        .map(file => ({
          name: file,
          path: path.join(seedersPath, file),
          source: moduleName
        }));

      console.log(`📁 Carregando ${files.length} seeder(s) do módulo "${moduleName}": ${seedersPath}`);
      allSeeders.push(...files);
    }

    // Ordenar seeders por nome (timestamp)
    allSeeders.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`\n📦 Total de seeders encontrados: ${allSeeders.length}`);

    // Executar seeders pendentes
    const queryInterface = sequelize.getQueryInterface();
    
    // Verificar se a tabela SequelizeData existe, se não, criar
    let executedNames = new Set();
    try {
      const [executedSeeders] = await sequelize.query(
        "SELECT name FROM SequelizeData ORDER BY name",
        { type: sequelize.QueryTypes.SELECT }
      );
      executedNames = new Set(executedSeeders.map(s => s.name));
    } catch (error) {
      // Tabela não existe, criar
      await queryInterface.createTable('SequelizeData', {
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          primaryKey: true
        }
      });
      console.log('📋 Tabela SequelizeData criada.');
      // Verificar novamente após criar a tabela (pode já ter dados)
      try {
        const [executedSeeders] = await sequelize.query(
          "SELECT name FROM SequelizeData ORDER BY name",
          { type: sequelize.QueryTypes.SELECT }
        );
        executedNames = new Set(executedSeeders.map(s => s.name));
      } catch (e) {
        // Tabela vazia, continuar
      }
    }

    let executedCount = 0;
    for (const seeder of allSeeders) {
      if (executedNames.has(seeder.name)) {
        console.log(`⏭️  ${seeder.name} já executado`);
        continue;
      }

      console.log(`🔄 Executando: ${seeder.name}`);
      const seederModule = require(seeder.path);
      
      if (seederModule.up) {
        try {
          await seederModule.up(queryInterface, DataTypes);
          // Usar INSERT IGNORE ou verificar novamente antes de inserir
          await sequelize.query(
            `INSERT IGNORE INTO SequelizeData (name) VALUES ('${seeder.name.replace(/'/g, "''")}')`
          );
          executedCount++;
          console.log(`✅ ${seeder.name} executado com sucesso`);
        } catch (error) {
          // Se já foi executado entre a verificação e a execução, apenas logar
          if (error.name === 'SequelizeUniqueConstraintError' || 
              (error.original && error.original.code === 'ER_DUP_ENTRY')) {
            console.log(`⏭️  ${seeder.name} já foi executado durante o processo`);
            continue;
          }
          throw error;
        }
      }
    }

    if (executedCount === 0) {
      console.log('\n✅ Nenhum seeder pendente.');
    } else {
      console.log(`\n✅ ${executedCount} seeder(s) executado(s) com sucesso.`);
    }

    await sequelize.close();
    // process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar seeders:', error);
    await sequelize.close();
    process.exit(1);
  }
}

// Exportar função para uso como módulo
module.exports = runSeeders;

// Executar apenas quando chamado diretamente (não quando importado)
if (require.main === module) {
  runSeeders();
}

