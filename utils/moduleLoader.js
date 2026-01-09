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
    const backendNodeModules = path.resolve(__dirname, '../../node_modules');
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
  const modulePaths = new Set(); // Usar Set para evitar duplicatas baseado no caminho real
  
  // Função auxiliar para resolver caminho real (resolver links simbólicos)
  function resolveRealPath(modulePath) {
    try {
      return fs.realpathSync(modulePath);
    } catch (error) {
      return modulePath;
    }
  }
  
  // Função auxiliar para verificar se o módulo já foi adicionado
  function isModuleAlreadyAdded(modulePath) {
    const realPath = resolveRealPath(modulePath);
    if (modulePaths.has(realPath)) {
      return true;
    }
    modulePaths.add(realPath);
    return false;
  }
  
  // IMPORTANTE: Carregar APENAS módulos de node_modules/@gestor/*
  // As pastas mod/, old/ e outras são apenas para desenvolvimento local
  // Em produção/execução, todos os módulos devem estar instalados via npm em node_modules/@gestor/*
  
  // Tentar diferentes caminhos possíveis para node_modules/@gestor/*
  // IMPORTANTE: Usa caminhos relativos dinâmicos, não hardcoded "frontend/"
  // Quando executado de dentro de node_modules/@gestor/system ou mod/system, precisa subir até encontrar o node_modules raiz
  
  // Função auxiliar para encontrar o node_modules raiz recursivamente
  function findRootNodeModules(startPath) {
    let currentPath = startPath;
    const maxDepth = 20; // Limitar profundidade para evitar loop infinito
    
    for (let i = 0; i < maxDepth; i++) {
      // Se estamos dentro de node_modules/@gestor/system, subir até encontrar o node_modules raiz
      if (currentPath.includes('node_modules') && currentPath.includes('@gestor')) {
        // Dividir o caminho em partes
        const parts = currentPath.split(path.sep);
        const nodeModulesIndex = parts.lastIndexOf('node_modules');
        if (nodeModulesIndex >= 0) {
          // Construir caminho até node_modules
          const rootNodeModules = parts.slice(0, nodeModulesIndex + 1).join(path.sep);
          const gestorPath = path.join(rootNodeModules, '@gestor');
          if (fs.existsSync(gestorPath)) {
            return rootNodeModules;
          }
        }
      }
      
      // Verificar se existe node_modules/@gestor no diretório atual
      const testPath = path.join(currentPath, 'node_modules', '@gestor');
      if (fs.existsSync(testPath)) {
        return path.join(currentPath, 'node_modules');
      }
      
      // Subir um nível
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) break; // Chegamos na raiz do sistema de arquivos
      currentPath = parentPath;
    }
    
    return null;
  }
  
  // Coletar todos os caminhos possíveis
  const possibleNodeModulesPaths = new Set(); // Usar Set para evitar duplicatas
  
  // 1. process.cwd() e seus parentes (subir até encontrar node_modules/@gestor)
  let cwdPath = process.cwd();
  for (let i = 0; i < 10; i++) {
    const testPath = path.join(cwdPath, 'node_modules', '@gestor');
    if (fs.existsSync(testPath)) {
      possibleNodeModulesPaths.add(path.join(cwdPath, 'node_modules'));
      break;
    }
    const parent = path.dirname(cwdPath);
    if (parent === cwdPath) break;
    cwdPath = parent;
  }
  
  // 2. __dirname e seus parentes (mais importante quando executado de dentro de node_modules ou mod/)
  const rootFromDirname = findRootNodeModules(__dirname);
  if (rootFromDirname) {
    possibleNodeModulesPaths.add(rootFromDirname);
  }
  
  // 3. process.cwd() recursivo
  const rootFromCwd = findRootNodeModules(process.cwd());
  if (rootFromCwd) {
    possibleNodeModulesPaths.add(rootFromCwd);
  }
  
  // 4. Tentar caminhos relativos comuns
  // Se estamos em mod/system, tentar ../frontend/node_modules
  if (__dirname.includes('mod/system') || process.cwd().includes('mod/system')) {
    const frontendNodeModules = path.resolve(__dirname, '../../../frontend/node_modules');
    if (fs.existsSync(path.join(frontendNodeModules, '@gestor'))) {
      possibleNodeModulesPaths.add(frontendNodeModules);
    }
  }
  
  // Se estamos em node_modules/@gestor/system, tentar ../../../
  if (__dirname.includes('node_modules/@gestor/system') || process.cwd().includes('node_modules/@gestor/system')) {
    const rootNodeModules = path.resolve(__dirname, '../../../../node_modules');
    if (fs.existsSync(path.join(rootNodeModules, '@gestor'))) {
      possibleNodeModulesPaths.add(rootNodeModules);
    }
  }
  
  const pathsArray = Array.from(possibleNodeModulesPaths);
  
  let gestorModulesPath = null;
  for (const nodeModulesPath of pathsArray) {
    const testPath = path.join(nodeModulesPath, '@gestor');
    if (fs.existsSync(testPath)) {
      gestorModulesPath = testPath;
      break;
    }
  }
  
  if (!gestorModulesPath) {
    console.log(`[moduleLoader] ❌ Não foi possível encontrar node_modules/@gestor`);
    console.log(`   __dirname: ${__dirname}`);
    console.log(`   process.cwd(): ${process.cwd()}`);
    console.log(`   Caminhos testados: ${pathsArray.length}`);
    pathsArray.forEach((p, i) => {
      const gestorTest = path.join(p, '@gestor');
      console.log(`   ${i + 1}. ${p} (existe: ${fs.existsSync(p)}, @gestor: ${fs.existsSync(gestorTest)})`);
    });
  } else {
    console.log(`[moduleLoader] ✅ Encontrado node_modules/@gestor em: ${gestorModulesPath}`);
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
        // Verificar se já foi adicionado (evitar duplicatas)
        if (isModuleAlreadyAdded(modulePath)) {
          continue;
        }
        
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
  
  // Garantir que sequelize tenha acesso ao Sequelize
  if (!sequelize.Sequelize) {
    const Sequelize = require('sequelize');
    sequelize.Sequelize = Sequelize;
  }
  
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
          // Usar model.name (que vem do modelName definido no init) ou o nome do arquivo como fallback
          const modelName = model.name || model.constructor.name || file.replace('.js', '');
          db[modelName] = model;
          // Também registrar com o nome do arquivo (sem extensão) para compatibilidade
          if (modelName !== file.replace('.js', '')) {
            db[file.replace('.js', '')] = model;
          }
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
  
  console.log(`[moduleLoader] Carregando migrations de ${modules.length} módulo(s) (${sortedModules.filter(m => m.enabled).length} habilitado(s))`);
  
  for (const module of sortedModules) {
    if (!module.enabled) {
      console.log(`[moduleLoader] Pulando módulo ${module.name} (desabilitado)`);
      continue;
    }
    
    const migrationsPath = path.join(module.path, 'migrations');
    
    if (fs.existsSync(migrationsPath)) {
      paths.push(migrationsPath);
      console.log(`[moduleLoader] ✅ Adicionado caminho de migrations: ${migrationsPath}`);
    } else {
      console.log(`[moduleLoader] ⚠️  Caminho de migrations não encontrado para módulo ${module.name}: ${migrationsPath}`);
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
  
  console.log(`[moduleLoader] Carregando seeders de ${modules.length} módulo(s) (${sortedModules.filter(m => m.enabled).length} habilitado(s))`);
  
  for (const module of sortedModules) {
    if (!module.enabled) {
      console.log(`[moduleLoader] Pulando módulo ${module.name} (desabilitado)`);
      continue;
    }
    
    const seedersPath = path.join(module.path, 'seeders');
    
    if (fs.existsSync(seedersPath)) {
      paths.push(seedersPath);
      console.log(`[moduleLoader] ✅ Adicionado caminho de seeders: ${seedersPath}`);
    } else {
      console.log(`[moduleLoader] ⚠️  Caminho de seeders não encontrado para módulo ${module.name}: ${seedersPath}`);
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

/**
 * Resolve imports de @gestor/* para caminhos em node_modules/@gestor/*
 * IMPORTANTE: Usa APENAS node_modules/@gestor/*, ignorando mod/, old/ e outras pastas
 * Útil para seeders, migrations e controllers que precisam importar de outros módulos
 * @param {string} modulePath - Caminho do módulo (ex: '@gestor/system/utils/modelsLoader' ou '@gestor/pessoa/controllers/batchController')
 * @returns {string} Caminho resolvido
 */
function resolveGestorModule(modulePath) {
  if (!modulePath || !modulePath.startsWith('@gestor/')) {
    return modulePath;
  }
  
  // IMPORTANTE: Tentar usar require.resolve() primeiro (funciona com node_modules)
  // Isso garante que usamos apenas módulos instalados via npm
  try {
    return require.resolve(modulePath);
  } catch (e) {
    // Se não conseguir resolver, tentar caminhos relativos a partir de node_modules
    // Extrair nome do módulo e caminho relativo
    // @gestor/pessoa/controllers/batchController -> pessoa, controllers/batchController
    const match = modulePath.match(/@gestor\/([^\/]+)\/(.+)/);
    if (!match) {
      throw new Error(`Não foi possível resolver o módulo: ${modulePath}`);
    }
    
    const moduleName = match[1];
    const relativePath = match[2];
    
    // Se estamos tentando resolver um módulo do mesmo módulo que estamos (system/utils/modelsLoader quando estamos em system/utils)
    // e estamos em mod/system/utils ou node_modules/@gestor/system/utils, tentar o mesmo diretório primeiro
    const possiblePaths = [];
    
    // Caso especial: se estamos em system/utils e queremos system/utils/modelsLoader
    // O relativePath será "utils/modelsLoader", então precisamos pegar apenas "modelsLoader"
    if (moduleName === 'system' && __dirname.includes('system/utils')) {
      // Se o relativePath começa com "utils/", remover esse prefixo
      let targetPath = relativePath;
      if (relativePath.startsWith('utils/')) {
        targetPath = relativePath.replace('utils/', '');
      }
      // Tentar no mesmo diretório (modelsLoader.js está no mesmo diretório que moduleLoader.js)
      const sameDirPath = path.join(__dirname, targetPath);
      if (fs.existsSync(sameDirPath) || fs.existsSync(sameDirPath + '.js')) {
        possiblePaths.push(fs.existsSync(sameDirPath) ? sameDirPath : sameDirPath + '.js');
      }
    }
    
    // Tentar diferentes caminhos possíveis em node_modules/@gestor/*
    // IMPORTANTE: Usa caminhos relativos dinâmicos, não hardcoded "frontend/"
    possiblePaths.push(
      // Se estiver em node_modules/@gestor/system/utils, procurar em node_modules/@gestor/[moduleName]/
      path.resolve(__dirname, `../../../../${moduleName}`, relativePath),
      // Se estiver em mod/system/utils, procurar em mod/[moduleName]/
      path.resolve(__dirname, `../../${moduleName}`, relativePath),
      // Procurar recursivamente a partir de process.cwd()
      ...(() => {
        const paths = [];
        let currentPath = process.cwd();
        for (let i = 0; i < 5; i++) {
          const testPath = path.join(currentPath, 'node_modules', '@gestor', moduleName, relativePath);
          if (fs.existsSync(testPath) || fs.existsSync(testPath + '.js')) {
            paths.push(fs.existsSync(testPath) ? testPath : testPath + '.js');
            break;
          }
          const parentPath = path.dirname(currentPath);
          if (parentPath === currentPath) break;
          currentPath = parentPath;
        }
        return paths;
      })()
    );
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }
    
    // Se não encontrou, lançar erro
    throw new Error(`Não foi possível encontrar o módulo ${modulePath}. Certifique-se de que está instalado em node_modules/@gestor/${moduleName}`);
  }
}

/**
 * Resolve imports de @gestor/system para caminhos relativos quando necessário
 * Útil para seeders e migrations de outros módulos que precisam importar do system
 * @param {string} modulePath - Caminho do módulo (ex: '@gestor/system/utils/modelsLoader')
 * @returns {string} Caminho resolvido
 * @deprecated Use resolveGestorModule() instead
 */
function resolveSystemModule(modulePath) {
  return resolveGestorModule(modulePath);
}

module.exports = {
  loadModules,
  loadModuleModels,
  loadModuleRoutes,
  getModuleMigrationsPaths,
  getModuleSeedersPaths,
  getModule,
  resolveSystemModule,
  resolveGestorModule
};

