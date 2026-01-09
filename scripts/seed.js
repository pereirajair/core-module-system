#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Tentar carregar .env do diretório frontend (onde está o projeto principal)
// IMPORTANTE: O módulo deve estar instalado em node_modules/@gestor/system
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

// Limpar cache do moduleLoader para garantir que novos módulos sejam detectados
const moduleLoaderPath = require.resolve('../utils/moduleLoader');
if (require.cache[moduleLoaderPath]) {
  delete require.cache[moduleLoaderPath];
}

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
    const gestorIndex = parts.indexOf('@gestor');
    if (gestorIndex >= 0 && gestorIndex < parts.length - 1) {
      return parts[gestorIndex + 1];
    }
    return 'unknown';
  }).join(', '));
} else {
  console.log('⚠️  Nenhum módulo habilitado encontrado para seeders');
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
    console.log(`\n🔍 Processando ${moduleSeedersPaths.length} caminho(s) de seeders de módulos...`);
    for (let i = 0; i < moduleSeedersPaths.length; i++) {
      const seedersPath = moduleSeedersPaths[i];
      console.log(`\n📂 [${i + 1}/${moduleSeedersPaths.length}] Processando: ${seedersPath}`);
      
      if (!fs.existsSync(seedersPath)) {
        console.log(`❌ Caminho não encontrado: ${seedersPath}`);
        continue;
      }
      console.log(`✅ Caminho existe`);

      // Verificar se o caminho real já foi adicionado (evitar duplicatas)
      const realSeedersPath = resolveRealPath(seedersPath);
      console.log(`🔗 Caminho real resolvido: ${realSeedersPath}`);
      
      if (seederPathsAdded.has(realSeedersPath)) {
        console.log(`⏭️  Caminho de seeders já foi carregado (duplicata ignorada): ${seedersPath}`);
        continue;
      }
      seederPathsAdded.add(realSeedersPath);
      console.log(`✅ Caminho adicionado ao conjunto (não é duplicata)`);

      // Extrair nome do módulo do caminho
      // IMPORTANTE: Suporta APENAS .../node_modules/@gestor/[nome-do-modulo]/seeders
      const pathParts = seedersPath.split(path.sep);
      let moduleName = 'unknown';
      
      // Tentar encontrar em node_modules/@gestor/
      const gestorIndex = pathParts.indexOf('@gestor');
      if (gestorIndex >= 0 && gestorIndex < pathParts.length - 1) {
        moduleName = pathParts[gestorIndex + 1];
      }
      console.log(`📦 Nome do módulo extraído: ${moduleName}`);

      const files = fs.readdirSync(seedersPath)
        .filter(file => file.endsWith('.js'))
        .map(file => ({
          name: file,
          path: path.join(seedersPath, file),
          source: moduleName
        }));

      console.log(`📁 Carregando ${files.length} seeder(s) do módulo "${moduleName}":`);
      files.forEach((f, idx) => {
        console.log(`   ${idx + 1}. ${f.name} (${f.source})`);
      });
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
      const executedSeeders = await sequelize.query(
        "SELECT name FROM SequelizeData ORDER BY name",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      // Garantir que é um array
      const seedersArray = Array.isArray(executedSeeders) ? executedSeeders : [];
      
      console.log(`📋 Seeders já executados encontrados na tabela: ${seedersArray.length}`);
      if (seedersArray.length > 0) {
        console.log(`   Primeiros 5: ${seedersArray.slice(0, 5).map(s => {
          if (typeof s === 'string') return s;
          if (typeof s === 'object' && s !== null) return s.name || JSON.stringify(s);
          return String(s);
        }).join(', ')}`);
      }
      
      // Garantir que estamos mapeando corretamente (pode ser objeto ou string)
      executedNames = new Set(seedersArray.map(s => {
        if (typeof s === 'string') return s;
        if (typeof s === 'object' && s !== null) return s.name || s;
        return String(s);
      }));
      console.log(`✅ Set de seeders executados criado com ${executedNames.size} item(s)`);
    } catch (error) {
      console.log(`⚠️  Tabela SequelizeData não existe ou erro ao consultar: ${error.message}`);
      // Tabela não existe, criar
      try {
        await queryInterface.createTable('SequelizeData', {
          name: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true
          }
        });
        console.log('📋 Tabela SequelizeData criada.');
      } catch (createError) {
        console.log(`⚠️  Erro ao criar tabela SequelizeData: ${createError.message}`);
      }
      // Verificar novamente após criar a tabela (pode já ter dados)
      try {
        const executedSeeders = await sequelize.query(
          "SELECT name FROM SequelizeData ORDER BY name",
          { type: sequelize.QueryTypes.SELECT }
        );
        
        // Garantir que é um array
        const seedersArray = Array.isArray(executedSeeders) ? executedSeeders : [];
        
        executedNames = new Set(seedersArray.map(s => {
          if (typeof s === 'string') return s;
          if (typeof s === 'object' && s !== null) return s.name || s;
          return String(s);
        }));
        console.log(`✅ Set de seeders executados criado após criar tabela: ${executedNames.size} item(s)`);
      } catch (e) {
        console.log(`⚠️  Tabela vazia ou erro ao consultar após criar: ${e.message}`);
        // Tabela vazia, continuar
      }
    }

    let executedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    console.log(`\n🚀 Iniciando execução de ${allSeeders.length} seeder(s)...`);
    console.log(`📊 Status: ${executedNames.size} já executado(s), ${allSeeders.length - executedNames.size} pendente(s)\n`);
    
    for (const seeder of allSeeders) {
      // Verificar se o seeder já foi executado
      // O nome pode estar armazenado com ou sem extensão .js
      const seederName = seeder.name;
      const seederNameWithoutExt = seederName.replace(/\.js$/, '');
      
      const isExecuted = executedNames.has(seederName) || executedNames.has(seederNameWithoutExt);
      
      if (isExecuted) {
        console.log(`⏭️  [${seeder.source}] ${seeder.name} já executado`);
        skippedCount++;
        continue;
      }

      console.log(`🔄 [${seeder.source}] Executando: ${seeder.name}`);
      console.log(`   📂 Caminho: ${seeder.path}`);
      
      try {
        const seederModule = require(seeder.path);
        
        if (seederModule.up) {
          console.log(`   ✅ Função 'up' encontrada, executando...`);
          await seederModule.up(queryInterface, DataTypes);
          // Registrar o seeder na tabela SequelizeData
          // IMPORTANTE: Sequelize armazena o nome SEM a extensão .js
          const seederNameToStore = seeder.name.replace(/\.js$/, '');
          await sequelize.query(
            `INSERT IGNORE INTO SequelizeData (name) VALUES ('${seederNameToStore.replace(/'/g, "''")}')`
          );
          executedCount++;
          // Adicionar ao Set local para evitar re-execução na mesma rodada
          executedNames.add(seederNameToStore);
          executedNames.add(seeder.name); // Também adicionar com extensão para garantir
          console.log(`   ✅ ${seeder.name} executado com sucesso (registrado como: ${seederNameToStore})\n`);
        } else {
          console.log(`   ⚠️  Função 'up' não encontrada no módulo\n`);
        }
      } catch (error) {
        errorCount++;
        console.log(`   ❌ Erro ao executar ${seeder.name}:`);
        console.log(`      Tipo: ${error.name}`);
        console.log(`      Mensagem: ${error.message}`);
        if (error.original) {
          console.log(`      Erro original: ${error.original.code || error.original.errno} - ${error.original.sqlMessage || error.original.message}`);
        }
        if (error.stack) {
          console.log(`      Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
        }
        
        // Se já foi executado entre a verificação e a execução, apenas logar
        if (error.name === 'SequelizeUniqueConstraintError' || 
            (error.original && error.original.code === 'ER_DUP_ENTRY')) {
          console.log(`   ⏭️  ${seeder.name} já foi executado durante o processo\n`);
          continue;
        }
        console.log(`   ❌ Erro não tratado, continuando com próximo seeder...\n`);
        // Não lançar erro para não interromper a execução dos outros seeders
      }
    }

    console.log(`\n📊 Resumo da execução de seeders:`);
    console.log(`   ✅ Executados: ${executedCount}`);
    console.log(`   ⏭️  Já executados (pulados): ${skippedCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   📦 Total processados: ${allSeeders.length}`);
    
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

