const fs = require('fs');
const pathResolver = require('../utils/pathResolver');
const backendPath = pathResolver.getBackendPath();
const path = require('path');
const { Sequelize, DataTypes } = require(backendPath + '/node_modules/sequelize');
const { loadModules } = require('../utils/moduleLoader');
const db = require(pathResolver.resolveModelsPath());

const modulesPath = path.join(__dirname, '../../../modules');

// Listar todos os módulos
async function getAllModules(req, res) {
  try {
    const modules = loadModules();
    res.json(modules);
  } catch (error) {
    console.error('Erro ao listar módulos:', error);
    res.status(500).json({ message: 'Erro ao listar módulos', error: error.message });
  }
}

// Obter um módulo específico
async function getModule(req, res) {
  try {
    const { name } = req.params;
    const modules = loadModules();
    const module = modules.find(m => m.name === name);
    
    if (!module) {
      return res.status(404).json({ message: 'Módulo não encontrado' });
    }
    
    res.json(module);
  } catch (error) {
    console.error('Erro ao obter módulo:', error);
    res.status(500).json({ message: 'Erro ao obter módulo', error: error.message });
  }
}

// Função auxiliar interna para criar módulo (sem depender de req/res)
async function createModuleInternal(params) {
  const { name, title, description, version = '1.0.0', isSystem = false } = params;
  
  if (!name || !title) {
    throw new Error('Nome e título do módulo são obrigatórios');
  }
  
  // Validar nome do módulo (apenas letras, números, hífens e underscores)
  if (!/^[a-z0-9_-]+$/.test(name)) {
    throw new Error('Nome do módulo deve conter apenas letras minúsculas, números, hífens e underscores');
  }
  
  // Verificar se o módulo já existe
  const modules = loadModules();
  if (modules.find(m => m.name === name)) {
    throw new Error('Módulo com este nome já existe');
  }
  
  // Criar estrutura de pastas do módulo
  const modulePath = path.join(modulesPath, name);
  const dirs = ['models', 'migrations', 'seeders', 'routes', 'controllers'];
  
  // Criar diretório principal
  if (!fs.existsSync(modulePath)) {
    fs.mkdirSync(modulePath, { recursive: true });
  }
  
  // Criar subdiretórios
  dirs.forEach(dir => {
    const dirPath = path.join(modulePath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  // Criar arquivo module.json
  const moduleJson = {
    name: name,
    title: title,
    description: description || '',
    version: version,
    enabled: true,
    isSystem: isSystem
  };
  
  const moduleJsonPath = path.join(modulePath, 'module.json');
  fs.writeFileSync(moduleJsonPath, JSON.stringify(moduleJson, null, 2), 'utf8');
  
  // Criar arquivo README.md básico
  const readmePath = path.join(modulePath, 'README.md');
  const readmeContent = `# ${title}

${description || 'Módulo criado automaticamente'}

## Estrutura

- \`models/\` - Models do módulo
- \`migrations/\` - Migrations do módulo
- \`seeders/\` - Seeders do módulo
- \`routes/\` - Routes do módulo
- \`controllers/\` - Controllers do módulo
`;
  fs.writeFileSync(readmePath, readmeContent, 'utf8');
  
  return {
    message: 'Módulo criado com sucesso',
    module: {
      ...moduleJson,
      path: modulePath
    }
  };
}

// Criar um novo módulo (versão Express)
async function createModule(req, res) {
  try {
    const result = await createModuleInternal(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Erro ao criar módulo:', error);
    const statusCode = error.message.includes('já existe') ? 409 : 
                      error.message.includes('obrigatórios') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Erro ao criar módulo', error: error.message });
  }
}

// Atualizar um módulo
async function updateModule(req, res) {
  try {
    const { name } = req.params;
    const { title, description, version, enabled } = req.body;
    
    const modulePath = path.join(modulesPath, name);
    const moduleJsonPath = path.join(modulePath, 'module.json');
    
    if (!fs.existsSync(moduleJsonPath)) {
      return res.status(404).json({ message: 'Módulo não encontrado' });
    }
    
    // Ler configuração atual
    const currentConfig = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf8'));
    
    // Atualizar apenas campos fornecidos
    if (title !== undefined) currentConfig.title = title;
    if (description !== undefined) currentConfig.description = description;
    if (version !== undefined) currentConfig.version = version;
    if (enabled !== undefined) currentConfig.enabled = enabled;
    
    // Não permitir alterar isSystem via API (proteção)
    
    // Salvar configuração atualizada
    fs.writeFileSync(moduleJsonPath, JSON.stringify(currentConfig, null, 2), 'utf8');
    
    res.json({
      message: 'Módulo atualizado com sucesso',
      module: {
        ...currentConfig,
        path: modulePath
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar módulo:', error);
    res.status(500).json({ message: 'Erro ao atualizar módulo', error: error.message });
  }
}

// Deletar um módulo
async function deleteModule(req, res) {
  try {
    const { name } = req.params;
    
    // Verificar se é módulo de sistema
    const modules = loadModules();
    const module = modules.find(m => m.name === name);
    
    if (module && module.isSystem) {
      return res.status(403).json({ message: 'Não é possível excluir módulos de sistema' });
    }
    
    const modulePath = path.join(modulesPath, name);
    
    if (!fs.existsSync(modulePath)) {
      return res.status(404).json({ message: 'Módulo não encontrado' });
    }
    
    // Remover diretório do módulo
    fs.rmSync(modulePath, { recursive: true, force: true });
    
    res.json({ message: 'Módulo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir módulo:', error);
    res.status(500).json({ message: 'Erro ao excluir módulo', error: error.message });
  }
}

// Verificar dependências de um módulo
function checkDependencies(moduleName) {
  // Recarregar módulos para garantir que temos os dados mais recentes
  const modules = loadModules();
  const module = modules.find(m => m.name === moduleName);
  
  if (!module) {
    throw new Error(`Módulo ${moduleName} não encontrado`);
  }
  
  if (!module.dependencies || !Array.isArray(module.dependencies) || module.dependencies.length === 0) {
    return { missing: [], allInstalled: true, dependencies: [] };
  }
  
  const missing = [];
  const checked = [];
  
  for (const depName of module.dependencies) {
    const depModule = modules.find(m => m.name === depName);
    
    const isEnabled = depModule && depModule.enabled === true;
    
    checked.push({
      name: depName,
      found: !!depModule,
      enabled: depModule ? depModule.enabled : false,
      enabledType: depModule ? typeof depModule.enabled : 'undefined',
      isEnabled: isEnabled
    });
    
    // Verificar se o módulo existe e está habilitado explicitamente como true
    if (!depModule) {
      missing.push(depName);
    } else if (depModule.enabled !== true) {
      // Se enabled não é explicitamente true, considera como faltando
      missing.push(depName);
    }
  }
  
  const result = {
    missing,
    allInstalled: missing.length === 0,
    dependencies: module.dependencies,
    checked: checked // Para debug
  };
  
  // Log para debug
  if (missing.length > 0) {
    console.log(`[checkDependencies] Módulo ${moduleName} tem dependências faltando:`, missing);
    console.log(`[checkDependencies] Status das dependências:`, checked);
  }
  
  return result;
}

// Encontrar seeder de instalação de um módulo
function findInstallSeeder(moduleName) {
  const modulePath = path.join(modulesPath, moduleName);
  const seedersPath = path.join(modulePath, 'seeders');
  
  if (!fs.existsSync(seedersPath)) {
    return null;
  }
  
  const seederFiles = fs.readdirSync(seedersPath)
    .filter(file => file.endsWith('.js'))
    .sort();
  
  // Procurar por seeders com "install" no nome ou que exportem função install
  for (const file of seederFiles) {
    const filePath = path.join(seedersPath, file);
    if (file.toLowerCase().includes('install')) {
      return filePath;
    }
    
    // Verificar se o seeder exporta uma função install
    try {
      const seederModule = require(filePath);
      if (seederModule.installPessoaModule || seederModule.installModule || 
          (typeof seederModule === 'function' && seederModule.name && seederModule.name.includes('install'))) {
        return filePath;
      }
    } catch (error) {
      // Ignorar erros ao carregar o módulo
    }
  }
  
  return null;
}

// Encontrar seeder de desinstalação de um módulo
function findUninstallSeeder(moduleName) {
  const modulePath = path.join(modulesPath, moduleName);
  const seedersPath = path.join(modulePath, 'seeders');
  
  if (!fs.existsSync(seedersPath)) {
    return null;
  }
  
  const seederFiles = fs.readdirSync(seedersPath)
    .filter(file => file.endsWith('.js'))
    .sort()
    .reverse(); // Começar pelos mais recentes
  
  // Procurar pelo seeder de instalação e usar seu método down
  for (const file of seederFiles) {
    const filePath = path.join(seedersPath, file);
    if (file.toLowerCase().includes('install')) {
      return filePath;
    }
  }
  
  return null;
}

// Instalar um módulo
async function installModule(req, res) {
  try {
    const { name } = req.params;
    const modules = loadModules();
    const module = modules.find(m => m.name === name);
    
    if (!module) {
      return res.status(404).json({ message: 'Módulo não encontrado' });
    }
    
    if (module.enabled) {
      return res.status(400).json({ message: 'Módulo já está instalado e habilitado' });
    }
    
    // Verificar dependências (recarregar módulos antes de verificar)
    const depCheck = checkDependencies(name);
    
    console.log(`[installModule] Verificando dependências para ${name}:`, {
      allInstalled: depCheck.allInstalled,
      missing: depCheck.missing,
      checked: depCheck.checked
    });
    
    if (!depCheck.allInstalled) {
      return res.status(400).json({
        message: 'Dependências não atendidas',
        missingDependencies: depCheck.missing,
        dependencies: depCheck.dependencies,
        checked: depCheck.checked // Incluir informações de debug
      });
    }
    
    // Instalar dependências recursivamente
    if (depCheck.dependencies && depCheck.dependencies.length > 0) {
      for (const depName of depCheck.dependencies) {
        const depModule = modules.find(m => m.name === depName);
        if (depModule && !depModule.enabled) {
          await installModuleInternal(depName);
        }
      }
    }
    
    // Instalar o módulo
    const result = await installModuleInternal(name);
    
    res.json({
      message: 'Módulo instalado com sucesso',
      module: result.module,
      installedDependencies: depCheck.dependencies || []
    });
  } catch (error) {
    console.error('Erro ao instalar módulo:', error);
    res.status(500).json({ message: 'Erro ao instalar módulo', error: error.message });
  }
}

// Função interna para instalar módulo
async function installModuleInternal(moduleName) {
  const modules = loadModules();
  const module = modules.find(m => m.name === moduleName);
  
  if (!module) {
    throw new Error(`Módulo ${moduleName} não encontrado`);
  }
  
  // Habilitar módulo primeiro
  const modulePath = path.join(modulesPath, moduleName);
  const moduleJsonPath = path.join(modulePath, 'module.json');
  const currentConfig = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf8'));
  currentConfig.enabled = true;
  fs.writeFileSync(moduleJsonPath, JSON.stringify(currentConfig, null, 2), 'utf8');
  
  // Encontrar e executar seeder de instalação
  const installSeederPath = findInstallSeeder(moduleName);
  if (installSeederPath) {
    const queryInterface = db.sequelize.getQueryInterface();
    const seederModule = require(installSeederPath);
    
    // Tentar diferentes formas de executar a instalação
    // Procurar por funções de instalação específicas do módulo (ex: installPessoaModule)
    const installFunctionName = `install${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module`;
    if (seederModule[installFunctionName]) {
      await seederModule[installFunctionName]();
    } else if (seederModule.installModule) {
      await seederModule.installModule();
    } else if (seederModule.up) {
      await seederModule.up(queryInterface, DataTypes);
    } else if (typeof seederModule === 'function') {
      await seederModule();
    }
  }
  
  return {
    module: {
      ...currentConfig,
      path: modulePath
    }
  };
}

// Desinstalar um módulo
async function uninstallModule(req, res) {
  try {
    const { name } = req.params;
    const modules = loadModules();
    const module = modules.find(m => m.name === name);
    
    if (!module) {
      return res.status(404).json({ message: 'Módulo não encontrado' });
    }
    
    if (module.isSystem) {
      return res.status(403).json({ message: 'Não é possível desinstalar módulos de sistema' });
    }
    
    if (!module.enabled) {
      return res.status(400).json({ message: 'Módulo já está desinstalado' });
    }
    
    // Verificar se outros módulos dependem deste
    const dependents = modules.filter(m => 
      m.enabled && 
      m.dependencies && 
      Array.isArray(m.dependencies) && 
      m.dependencies.includes(name)
    );
    
    if (dependents.length > 0) {
      return res.status(400).json({
        message: 'Não é possível desinstalar módulo com dependentes',
        dependents: dependents.map(m => m.name)
      });
    }
    
    // Executar seeder de desinstalação
    const uninstallSeederPath = findUninstallSeeder(name);
    if (uninstallSeederPath) {
      const queryInterface = db.sequelize.getQueryInterface();
      const seederModule = require(uninstallSeederPath);
      
      if (seederModule.down) {
        await seederModule.down(queryInterface, DataTypes);
      }
    }
    
    // Desabilitar módulo
    const modulePath = path.join(modulesPath, name);
    const moduleJsonPath = path.join(modulePath, 'module.json');
    const currentConfig = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf8'));
    currentConfig.enabled = false;
    fs.writeFileSync(moduleJsonPath, JSON.stringify(currentConfig, null, 2), 'utf8');
    
    res.json({
      message: 'Módulo desinstalado com sucesso',
      module: {
        ...currentConfig,
        path: modulePath
      }
    });
  } catch (error) {
    console.error('Erro ao desinstalar módulo:', error);
    res.status(500).json({ message: 'Erro ao desinstalar módulo', error: error.message });
  }
}

module.exports = {
  getAllModules,
  getModule,
  createModule,
  createModuleInternal, // Exportar função interna para uso pelo ChatIA
  updateModule,
  deleteModule,
  installModule,
  uninstallModule,
  checkDependencies
};

