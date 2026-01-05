#!/usr/bin/env node

require('dotenv').config();
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');
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

async function runSeeders() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida.');

    // Carregar todos os seeders de todos os caminhos
    // Ordem: primeiro seeders padrão, depois módulos ordenados por dependências
    const allSeeders = [];
    
    // Carregar seeders padrão primeiro
    if (fs.existsSync(defaultSeedersPath)) {
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

      // Extrair nome do módulo do caminho: .../modules/[nome-do-modulo]/seeders
      const pathParts = seedersPath.split(path.sep);
      const modulesIndex = pathParts.indexOf('modules');
      const moduleName = modulesIndex >= 0 && modulesIndex < pathParts.length - 1 
        ? pathParts[modulesIndex + 1] 
        : 'unknown';

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

runSeeders();

