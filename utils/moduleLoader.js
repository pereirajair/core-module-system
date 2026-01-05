'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

// PATCH: Permitir que módulos fora do backend encontrem dependências do backend
const originalNodeModulePaths = Module._nodeModulePaths;
Module._nodeModulePaths = function(from) {
    const paths = originalNodeModulePaths.call(this, from);
    // Adiciona o node_modules do backend
    // __dirname = .../modules/system/utils
    // ../../../ = .../
    // ../../../backend/node_modules = .../backend/node_modules
    const backendNodeModules = path.resolve(__dirname, '../../../backend/node_modules');
    // Adicionar apenas se o caminho realmente existir e não estiver duplicado
    if (fs.existsSync(backendNodeModules) && !paths.includes(backendNodeModules)) {
        paths.push(backendNodeModules);
    }
    return paths;
};

/**
 * Carrega todos os módulos disponíveis

const fs = require('fs');
const path = require('path');

/**
 * Carrega todos os módulos disponíveis
 * Procura em:
 * 1. backend/src/modules (módulos locais)
 * 2. node_modules/@gestor/* (módulos npm)
 * @returns {Array} Array de objetos com informações dos módulos
 */
function loadModules() {
  const modules = [];
  
  // Determinar caminho base: se estamos em node_modules/@gestor/system, usar caminho relativo ao projeto
  // Se estamos em backend/src/modules/system, usar caminho relativo ao backend
  const isNpmModule = __dirname.includes('node_modules/@gestor/system');
  const basePath = isNpmModule 
    ? path.join(__dirname, '../../../../backend/src') 
    : path.join(__dirname, '../../..');
  
  // 1. Carregar módulos locais de backend/src/modules
  const modulesPath = path.join(basePath, 'modules');
  if (fs.existsSync(modulesPath)) {
    const moduleDirs = fs.readdirSync(modulesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const moduleName of moduleDirs) {
      const modulePath = path.join(modulesPath, moduleName);
      const moduleJsonPath = path.join(modulePath, 'module.json');
      
      if (fs.existsSync(moduleJsonPath)) {
        try {
          const moduleInfo = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf8'));
          moduleInfo.path = modulePath;
          moduleInfo.name = moduleName;
          moduleInfo.source = 'local';
          modules.push(moduleInfo);
        } catch (error) {
          console.error(`Erro ao carregar módulo local ${moduleName}:`, error.message);
        }
      }
    }
  }
  
  // 2. Carregar módulos npm de node_modules/@gestor/*
  // Tentar diferentes caminhos possíveis para node_modules
  const possibleNodeModulesPaths = [
    path.join(basePath, 'backend', 'node_modules'), // {basePath}/backend/node_modules
    path.join(basePath, '../node_modules'), // Um nível acima do basePath
    path.join(basePath, '../../node_modules'), // Dois níveis acima
    path.join(process.cwd(), 'node_modules'), // Diretório atual de trabalho
    path.join(process.cwd(), '../../backend/node_modules'), // Relativo ao cwd quando executado de modules/system
    path.join(__dirname, '../../../../node_modules') // Se estiver em node_modules/@gestor/system
  ];
  
  let gestorModulesPath = null;
  for (const nodeModulesPath of possibleNodeModulesPaths) {
    const testPath = path.join(nodeModulesPath, '@gestor');
    if (fs.existsSync(testPath)) {
      gestorModulesPath = testPath;
      break;
    }
  }
  
  if (gestorModulesPath && fs.existsSync(gestorModulesPath)) {
    const npmModuleDirs = fs.readdirSync(gestorModulesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() || dirent.isSymbolicLink())
      .map(dirent => dirent.name);
    
    for (const moduleName of npmModuleDirs) {
      const modulePath = path.join(gestorModulesPath, moduleName);
      const packageJsonPath = path.join(modulePath, 'package.json');
      const moduleJsonPath = path.join(modulePath, 'module.json');
      const indexJsPath = path.join(modulePath, 'index.js');
      
      try {
        let moduleInfo = null;
        
        // Tentar carregar de module.json primeiro
        if (fs.existsSync(moduleJsonPath)) {
          moduleInfo = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf8'));
        }
        // Senão, tentar carregar de package.json (campo gestor)
        else if (fs.existsSync(packageJsonPath)) {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (pkg.gestor && pkg.gestor.module) {
            moduleInfo = pkg.gestor;
          }
        }
        // Senão, tentar carregar de index.js
        else if (fs.existsSync(indexJsPath)) {
          moduleInfo = require(indexJsPath);
        }
        
        if (moduleInfo) {
          moduleInfo.path = modulePath;
          // Extrair nome do módulo do nome do pacote (@gestor/pessoa -> pessoa)
          moduleInfo.name = moduleInfo.name || moduleName;
          moduleInfo.source = 'npm';
          
          // Normalizar dependências: converter @gestor/nome para nome
          if (moduleInfo.dependencies && Array.isArray(moduleInfo.dependencies)) {
            moduleInfo.dependencies = moduleInfo.dependencies.map(dep => {
              if (dep.startsWith('@gestor/')) {
                return dep.replace('@gestor/', '');
              }
              return dep;
            });
          }
          
          modules.push(moduleInfo);
        }
      } catch (error) {
        console.error(`Erro ao carregar módulo npm ${moduleName}:`, error.message);
      }
    }
  }
  
  return modules;
}

/**
 * Carrega models de todos os módulos
 * @param {Sequelize} sequelize - Instância do Sequelize
 * @param {Object} DataTypes - Tipos de dados do Sequelize
 * @returns {Object} Objeto com todos os models carregados
 */
function loadModuleModels(sequelize, DataTypes) {
  const db = {};
  const modules = loadModules();
  
  // Carregar models de cada módulo
  for (const module of modules) {
    if (!module.enabled) continue;
    
    const modelsPath = path.join(module.path, 'models');
    
    if (fs.existsSync(modelsPath)) {
      const modelFiles = fs.readdirSync(modelsPath)
        .filter(file => file.indexOf('.') !== 0 && file.slice(-3) === '.js');
      
      for (const file of modelFiles) {
        try {
          const model = require(path.join(modelsPath, file))(sequelize, DataTypes);
          db[model.name] = model;
        } catch (error) {
          console.error(`Erro ao carregar model ${file} do módulo ${module.name}:`, error.message);
        }
      }
    }
  }
  
  return db;
}

/**
 * Carrega routes de todos os módulos
 * @param {Express} app - Instância do Express
 */
function loadModuleRoutes(app) {
  const modules = loadModules();
  
  for (const module of modules) {
    if (!module.enabled) continue;
    
    const routesPath = path.join(module.path, 'routes');
    
    if (fs.existsSync(routesPath)) {
      const routeFiles = fs.readdirSync(routesPath)
        .filter(file => file.indexOf('.') !== 0 && file.slice(-3) === '.js');
      
      for (const file of routeFiles) {
        try {
          const routePath = path.join(routesPath, file);
          const router = require(routePath);
          
          let routeName = file.replace('.js', '');
          
          // Mapeamento de nomes de arquivo para nomes de rota (singular -> plural)
          const routeNameMap = {
            'user': 'users',
            'organization': 'organizations',
            'role': 'roles',
            'system': 'systems',
            'function': 'functions',
            'menu': 'menus'
          };
          
          // Usar nome mapeado se existir, senão usar o nome do arquivo
          routeName = routeNameMap[routeName] || routeName;
          const apiPath = `/api/${routeName}`;
          
          // Verificar se é um router do Express (tem propriedade 'stack')
          // ou se é uma função que aceita app como parâmetro
          if (router && typeof router === 'function' && router.stack !== undefined) {
            // É um router do Express - usar app.use
            app.use(apiPath, router);
            console.log(`[ModuleLoader] Rota carregada: ${apiPath} (módulo: ${module.name})`);
          } else if (typeof router === 'function' && router.length > 0) {
            // É uma função que aceita app como parâmetro
            router(app);
            console.log(`[ModuleLoader] Rota carregada via função: ${file} (módulo: ${module.name})`);
          } else if (router.default && typeof router.default === 'function') {
            router.default(app);
            console.log(`[ModuleLoader] Rota carregada via default: ${file} (módulo: ${module.name})`);
          } else {
            // Tentar usar como router do Express mesmo assim
            app.use(apiPath, router);
            console.log(`[ModuleLoader] Rota carregada (fallback): ${apiPath} (módulo: ${module.name})`);
          }
        } catch (error) {
          console.error(`Erro ao carregar route ${file} do módulo ${module.name}:`, error.message);
          console.error(error.stack);
        }
      }
    }
  }
}

/**
 * Ordena módulos por dependências (topological sort)
 * @param {Array} modules - Array de módulos
 * @returns {Array} Array de módulos ordenados
 */
function sortModulesByDependencies(modules) {
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();
  
  function visit(module) {
    if (visiting.has(module.name)) {
      console.warn(`⚠️  Dependência circular detectada envolvendo o módulo: ${module.name}`);
      return;
    }
    
    if (visited.has(module.name)) {
      return;
    }
    
    visiting.add(module.name);
    
    // Processar dependências primeiro
    if (module.dependencies && Array.isArray(module.dependencies)) {
      for (const depName of module.dependencies) {
        const dep = modules.find(m => m.name === depName);
        if (dep && !visited.has(depName)) {
          visit(dep);
        }
      }
    }
    
    visiting.delete(module.name);
    visited.add(module.name);
    sorted.push(module);
  }
  
  // Sempre processar 'system' primeiro se existir
  const systemModule = modules.find(m => m.name === 'system');
  if (systemModule) {
    visit(systemModule);
  }
  
  // Processar os demais módulos
  for (const module of modules) {
    if (!visited.has(module.name)) {
      visit(module);
    }
  }
  
  return sorted;
}

/**
 * Retorna o caminho das migrations de todos os módulos ordenados por dependências
 * @returns {Array} Array de caminhos de migrations ordenados
 */
function getModuleMigrationsPaths() {
  const modules = loadModules();
  const sortedModules = sortModulesByDependencies(modules);
  const paths = [];
  
  for (const module of sortedModules) {
    if (!module.enabled) continue;
    
    const migrationsPath = path.join(module.path, 'migrations');
    
    if (fs.existsSync(migrationsPath)) {
      paths.push(migrationsPath);
    }
  }
  
  return paths;
}

/**
 * Retorna o caminho dos seeders de todos os módulos ordenados por dependências
 * @returns {Array} Array de caminhos de seeders ordenados
 */
function getModuleSeedersPaths() {
  const modules = loadModules();
  const sortedModules = sortModulesByDependencies(modules);
  const paths = [];
  
  for (const module of sortedModules) {
    if (!module.enabled) continue;
    
    const seedersPath = path.join(module.path, 'seeders');
    
    if (fs.existsSync(seedersPath)) {
      paths.push(seedersPath);
    }
  }
  
  return paths;
}

/**
 * Retorna informações de um módulo específico
 * @param {string} moduleName - Nome do módulo
 * @returns {Object|null} Informações do módulo ou null se não encontrado
 */
function getModule(moduleName) {
  const modules = loadModules();
  return modules.find(m => m.name === moduleName) || null;
}

module.exports = {
  loadModules,
  loadModuleModels,
  loadModuleRoutes,
  getModuleMigrationsPaths,
  getModuleSeedersPaths,
  getModule
};

