const fs = require('fs');
const path = require('path');

/**
 * Sistema de descoberta automática de controllers e métodos para MCP
 * Descobre automaticamente todos os métodos exportados pelos controllers
 * e os expõe via MCP sem duplicação de código
 */

// Cache de controllers descobertos
let discoveredControllers = null;
let discoveredRoutes = null;

/**
 * Descobre todos os controllers e seus métodos exportados
 * Agora busca controllers em todos os módulos
 */
function discoverControllers() {
  if (discoveredControllers) {
    return discoveredControllers;
  }

  const controllers = {};

  try {
    // Buscar controllers em todos os módulos
    const { loadModules } = require('./moduleLoader');
    const modules = loadModules();
    
    // Também verificar pasta padrão de controllers (se existir)
    const defaultControllersDir = path.join(__dirname, '../controllers');
    const controllersDirs = [];
    
    if (fs.existsSync(defaultControllersDir)) {
      controllersDirs.push({ path: defaultControllersDir, module: null });
    }
    
    // Adicionar diretórios de controllers de cada módulo
    modules.forEach(module => {
      if (module.enabled) {
        const moduleControllersDir = path.join(__dirname, '../modules', module.name, 'controllers');
        if (fs.existsSync(moduleControllersDir)) {
          controllersDirs.push({ path: moduleControllersDir, module: module.name });
        }
      }
    });
    
    // Processar cada diretório de controllers
    controllersDirs.forEach(({ path: controllersDir, module: moduleName }) => {
  try {
    const files = fs.readdirSync(controllersDir);
    
    files.forEach(file => {
      // Ignorar arquivos que não são controllers ou são especiais
      if (!file.endsWith('Controller.js') && !file.endsWith('controller.js')) {
        return;
      }
      
      // Ignorar controllers especiais que já têm tratamento manual
      const specialControllers = ['chatIAController', 'mcpController', 'dynamicCrudController'];
      const controllerName = file.replace(/Controller\.js$/i, '').replace(/controller\.js$/i, '');
      if (specialControllers.includes(controllerName)) {
        return;
      }

      try {
        const controllerPath = path.join(controllersDir, file);
        const controller = require(controllerPath);
        
        // Descobrir métodos exportados
        const methods = {};
        Object.keys(controller).forEach(key => {
          // Verificar se é uma função exportada
          if (typeof controller[key] === 'function' && key !== 'default') {
            methods[key] = {
              name: key,
              handler: controller[key],
              // Inferir tipo de operação pelo nome
              operation: inferOperation(key),
              // Inferir se precisa de ID pelo nome
              requiresId: inferRequiresId(key)
            };
          }
        });

        if (Object.keys(methods).length > 0) {
              // Usar nome único incluindo módulo se houver
              const uniqueName = moduleName ? `${moduleName}_${controllerName}` : controllerName;
              controllers[uniqueName] = {
            name: controllerName,
                module: moduleName,
            path: controllerPath,
            methods: methods
          };
        }
      } catch (error) {
            console.warn(`⚠️ Erro ao carregar controller ${file} do módulo ${moduleName || 'padrão'}:`, error.message);
          }
        });
      } catch (error) {
        // Ignorar erros de diretório não encontrado (pode não ter controllers)
        if (error.code !== 'ENOENT') {
          console.warn(`⚠️ Erro ao ler diretório de controllers ${controllersDir}:`, error.message);
        }
      }
    });
  } catch (error) {
    console.error('Erro ao descobrir controllers:', error);
  }

  discoveredControllers = controllers;
  return controllers;
}

/**
 * Descobre todas as rotas e mapeia para controllers
 */
function discoverRoutes() {
  if (discoveredRoutes) {
    return discoveredRoutes;
  }

  const routesDir = path.join(__dirname, '../routes');
  const routes = {};

  try {
    const files = fs.readdirSync(routesDir);
    
    files.forEach(file => {
      if (!file.endsWith('.js') || file === 'mcp.js' || file === 'chatIA.js') {
        return;
      }

      try {
        const routePath = path.join(routesDir, file);
        const routeModule = require(routePath);
        
        // Extrair nome do recurso do nome do arquivo
        const resourceName = file.replace('.js', '');
        
        // Tentar descobrir o controller associado
        const controllerName = resourceName.charAt(0).toUpperCase() + resourceName.slice(1) + 'Controller';
        // Buscar controller em todos os módulos
        const { loadModules } = require('./moduleLoader');
        const modules = loadModules();
        
        let controller = null;
        let controllerPath = null;
        
        // Primeiro tentar na pasta padrão (se existir)
        const defaultControllerPath = path.join(__dirname, '../controllers', `${resourceName}Controller.js`);
        if (fs.existsSync(defaultControllerPath)) {
          try {
            controller = require(defaultControllerPath);
            controllerPath = defaultControllerPath;
          } catch (error) {
            // Continuar procurando nos módulos
          }
        }
        
        // Se não encontrou, buscar nos módulos
        if (!controller) {
          for (const module of modules) {
            if (module.enabled) {
              const moduleControllerPath = path.join(__dirname, '../modules', module.name, 'controllers', `${resourceName}Controller.js`);
              if (fs.existsSync(moduleControllerPath)) {
                try {
                  controller = require(moduleControllerPath);
                  controllerPath = moduleControllerPath;
                  break;
                } catch (error) {
                  // Continuar procurando em outros módulos
                }
              }
            }
          }
        }

        routes[resourceName] = {
          name: resourceName,
          path: routePath,
          controller: controller,
          controllerName: controller ? resourceName : null
        };
      } catch (error) {
        console.warn(`⚠️ Erro ao carregar rota ${file}:`, error.message);
      }
    });
  } catch (error) {
    console.error('Erro ao descobrir rotas:', error);
  }

  discoveredRoutes = routes;
  return routes;
}

/**
 * Infere o tipo de operação pelo nome do método
 */
function inferOperation(methodName) {
  const lowerName = methodName.toLowerCase();
  
  if (lowerName.includes('getall') || lowerName.includes('list')) {
    return 'list';
  }
  if (lowerName.includes('getbyid') || lowerName.includes('get') || lowerName.includes('find')) {
    return 'get';
  }
  if (lowerName.includes('create') || lowerName.includes('add') || lowerName.includes('post')) {
    return 'create';
  }
  if (lowerName.includes('update') || lowerName.includes('edit') || lowerName.includes('put') || lowerName.includes('patch')) {
    return 'update';
  }
  if (lowerName.includes('delete') || lowerName.includes('remove')) {
    return 'delete';
  }
  
  return 'unknown';
}

/**
 * Infere se o método requer um ID
 */
function inferRequiresId(methodName) {
  const lowerName = methodName.toLowerCase();
  return lowerName.includes('byid') || 
         lowerName.includes('bypk') || 
         lowerName.includes('update') || 
         lowerName.includes('delete') ||
         lowerName.includes('edit');
}

/**
 * Gera nomes alternativos (aliases) para métodos comuns
 */
function generateMethodAliases(controllerName, methodName) {
  const aliases = [];
  const lowerMethod = methodName.toLowerCase();
  
  // Normalizar nome do controller (remover "Controller" se presente e capitalizar)
  let normalizedController = controllerName;
  if (normalizedController.toLowerCase().endsWith('controller')) {
    normalizedController = normalizedController.slice(0, -10);
  }
  // Capitalizar primeira letra
  normalizedController = normalizedController.charAt(0).toUpperCase() + normalizedController.slice(1);
  
  // Mapear nomes comuns para aliases mais amigáveis
  if (lowerMethod.includes('getall') || lowerMethod.includes('list')) {
    // getAllOrganizations -> getOrganizations, listOrganizations
    // O método já tem o plural no nome (getAllOrganizations), então extrair o plural
    const methodMatch = methodName.match(/getAll(\w+)/i) || methodName.match(/get(\w+)/i);
    if (methodMatch && methodMatch[1]) {
      // Se o método já tem plural no nome (ex: getAllOrganizations)
      const pluralName = methodMatch[1]; // "Organizations"
      aliases.push(`get${pluralName}`); // getOrganizations
      aliases.push(`list${pluralName}`); // listOrganizations
    } else {
      // Caso contrário, criar plural padrão
      const pluralName = normalizedController + 's';
      aliases.push(`get${pluralName}`);
      aliases.push(`list${pluralName}`);
    }
  }
  
  if (lowerMethod.includes('getbyid') || (lowerMethod.includes('get') && lowerMethod.includes('id'))) {
    // getOrganizationById -> getOrganization
    aliases.push(`get${normalizedController}`);
  }
  
  return aliases;
}

/**
 * Gera schema MCP para um método de controller
 */
function generateMCPSchemaForMethod(controllerName, methodName, methodInfo) {
  // Capitalizar primeira letra do controller para consistência
  const capitalizedController = controllerName.charAt(0).toUpperCase() + controllerName.slice(1);
  const mcpName = `${capitalizedController}_${methodName}`;
  
  // Gerar aliases para nomes mais amigáveis (usando controller capitalizado)
  const aliases = generateMethodAliases(capitalizedController, methodName);
  
  // Gerar descrição baseada no nome do método
  const descriptions = {
    getAll: `Lista todos os ${controllerName}`,
    getById: `Obtém um ${controllerName} por ID`,
    create: `Cria um novo ${controllerName}`,
    update: `Atualiza um ${controllerName}`,
    delete: `Exclui um ${controllerName}`
  };
  
  const description = descriptions[methodName] || `Executa ${methodName} no controller ${controllerName}`;
  
  // Gerar schema de entrada baseado no tipo de operação
  let inputSchema = {
    type: 'object',
    properties: {},
    required: []
  };

  if (methodInfo.requiresId) {
    inputSchema.properties.id = {
      type: 'integer',
      description: `ID do ${controllerName}`
    };
    inputSchema.required.push('id');
  }

  // Para create e update, adicionar propriedades genéricas
  if (methodInfo.operation === 'create' || methodInfo.operation === 'update') {
    inputSchema.properties.data = {
      type: 'object',
      description: `Dados do ${controllerName}`,
      additionalProperties: true
    };
    if (methodInfo.operation === 'create') {
      inputSchema.required.push('data');
    } else {
      inputSchema.required.push('id', 'data');
    }
  }

  const schema = {
    name: mcpName,
    description: description,
    inputSchema: inputSchema,
    aliases: aliases // Adicionar aliases ao schema
  };
  
  return schema;
}

/**
 * Gera todos os schemas MCP para controllers descobertos
 */
function generateAllMCPSchemas() {
  const controllers = discoverControllers();
  const schemas = [];

  Object.keys(controllers).forEach(controllerName => {
    const controller = controllers[controllerName];
    
    Object.keys(controller.methods).forEach(methodName => {
      const methodInfo = controller.methods[methodName];
      const schema = generateMCPSchemaForMethod(controllerName, methodName, methodInfo);
      schemas.push(schema);
    });
  });

  console.log(controllers);

  return schemas;
}

/**
 * Cria um wrapper MCP para um método de controller
 * O wrapper adapta a chamada MCP para o formato esperado pelo controller Express
 */
function createMCPWrapper(controllerName, methodName, handler) {
  return async (args) => {
    return new Promise((resolve, reject) => {
      // Criar objetos req e res mockados para o handler do Express
      const req = {
        params: {},
        query: {},
        body: {},
        user: args.user || null // Permitir passar usuário se necessário
      };

      let responseData = null;
      let statusCode = 200;
      let responseSent = false;

      const res = {
        status: function(code) {
          statusCode = code;
          return this;
        },
        json: function(data) {
          if (!responseSent) {
            responseData = data;
            responseSent = true;
            resolve({
              success: statusCode >= 200 && statusCode < 300,
              data: responseData,
              statusCode: statusCode
            });
          }
          return this;
        },
        send: function(data) {
          if (!responseSent) {
            responseData = data;
            responseSent = true;
            resolve({
              success: statusCode >= 200 && statusCode < 300,
              data: responseData,
              statusCode: statusCode
            });
          }
          return this;
        }
      };

      // Preparar dados baseado no tipo de operação
      const methodLower = methodName.toLowerCase();
      
      if (methodLower.includes('getall') || methodLower.includes('list')) {
        // Operação de listagem
        req.query = args.query || args || {};
      } else if (methodLower.includes('getbyid') || methodLower.includes('get')) {
        // Operação de busca por ID
        req.params.id = args.id || args;
        req.query = args.query || {};
      } else if (methodLower.includes('create')) {
        // Operação de criação
        req.body = args.data || args || {};
      } else if (methodLower.includes('update') || methodLower.includes('edit')) {
        // Operação de atualização
        req.params.id = args.id;
        req.body = args.data || args || {};
      } else if (methodLower.includes('delete')) {
        // Operação de exclusão
        req.params.id = args.id || args;
      } else {
        // Método genérico - passar todos os args
        Object.assign(req.body, args || {});
      }

      try {
        // Chamar o handler do controller
        const result = handler(req, res);
        
        // Se retornou uma Promise, aguardar
        if (result && typeof result.then === 'function') {
          result.catch(error => {
            if (!responseSent) {
              responseSent = true;
              reject({
                success: false,
                error: error.message,
                statusCode: 500
              });
            }
          });
        } else if (!responseSent) {
          // Se não retornou Promise e não enviou resposta, assumir sucesso
          setTimeout(() => {
            if (!responseSent) {
              responseSent = true;
              resolve({
                success: true,
                data: result || responseData,
                statusCode: statusCode
              });
            }
          }, 100);
        }
      } catch (error) {
        if (!responseSent) {
          responseSent = true;
          reject({
            success: false,
            error: error.message,
            statusCode: 500
          });
        }
      }
    });
  };
}

/**
 * Obtém todos os wrappers MCP para controllers descobertos
 */
function getAllMCPWrappers() {
  const controllers = discoverControllers();
  const wrappers = {};

  Object.keys(controllers).forEach(controllerName => {
    const controller = controllers[controllerName];
    
    Object.keys(controller.methods).forEach(methodName => {
      const methodInfo = controller.methods[methodName];
      
      // Gerar nome MCP: capitalizar primeira letra do controller
      const capitalizedController = controllerName.charAt(0).toUpperCase() + controllerName.slice(1);
      const mcpName = `${capitalizedController}_${methodName}`;
      
      // Também criar versão com nome original (minúsculo) para compatibilidade
      const mcpNameLower = `${controllerName}_${methodName}`;
      
      const wrapper = createMCPWrapper(controllerName, methodName, methodInfo.handler);
      
      // Adicionar wrapper com o nome principal (capitalizado)
      wrappers[mcpName] = wrapper;
      
      // Adicionar também versão minúscula para compatibilidade
      wrappers[mcpNameLower] = wrapper;
      
      // Adicionar aliases para nomes mais amigáveis (usando controller capitalizado)
      const aliases = generateMethodAliases(capitalizedController, methodName);
      aliases.forEach(alias => {
        wrappers[alias] = wrapper;
      });
    });
  });

  return wrappers;
}

/**
 * Limpa o cache de descoberta (útil para desenvolvimento)
 */
function clearCache() {
  discoveredControllers = null;
  discoveredRoutes = null;
}

/**
 * Lista todos os nomes de funções MCP disponíveis (incluindo aliases)
 */
function listAvailableFunctionNames() {
  const wrappers = getAllMCPWrappers();
  return Object.keys(wrappers).sort();
}

/**
 * Inicializa o sistema de descoberta automática
 * Deve ser chamado na inicialização da aplicação
 */
function initialize() {
  console.log('🔍 Inicializando sistema de descoberta automática de MCP...');
  try {
    const controllers = discoverControllers();
    const routes = discoverRoutes();
    const schemas = generateAllMCPSchemas();
    const wrappers = getAllMCPWrappers();
    
    console.log(`✅ Sistema MCP inicializado:`);
    console.log(`   - ${Object.keys(controllers).length} controllers descobertos`);
    console.log(`   - ${Object.keys(routes).length} rotas descobertas`);
    console.log(`   - ${schemas.length} schemas MCP gerados`);
    console.log(`   - ${Object.keys(wrappers).length} wrappers MCP criados (incluindo aliases)`);
    
    // Listar controllers descobertos com métodos e aliases
    Object.keys(controllers).forEach(controllerName => {
      const controller = controllers[controllerName];
      const methodNames = Object.keys(controller.methods);
      const capitalizedController = controllerName.charAt(0).toUpperCase() + controllerName.slice(1);
      console.log(`\n   📦 ${controllerName}:`);
      methodNames.forEach(methodName => {
        const mcpName = `${capitalizedController}_${methodName}`;
        const mcpNameLower = `${controllerName}_${methodName}`;
        const aliases = generateMethodAliases(capitalizedController, methodName);
        const allNames = [mcpName, mcpNameLower, ...aliases];
        console.log(`      • ${methodName}`);
        console.log(`        Nomes MCP disponíveis: ${allNames.join(', ')}`);
      });
    });
    
    // Listar todas as funções disponíveis (útil para debug)
    const allFunctionNames = listAvailableFunctionNames();
    console.log(`\n   📋 Total de ${allFunctionNames.length} funções disponíveis via MCP:`);
    console.log(`      ${allFunctionNames.slice(0, 20).join(', ')}${allFunctionNames.length > 20 ? '...' : ''}`);
    
    return {
      controllers: Object.keys(controllers).length,
      routes: Object.keys(routes).length,
      schemas: schemas.length,
      wrappers: Object.keys(wrappers).length,
      functionNames: allFunctionNames
    };
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema MCP:', error);
    throw error;
  }
}

module.exports = {
  discoverControllers,
  discoverRoutes,
  generateAllMCPSchemas,
  getAllMCPWrappers,
  clearCache,
  inferOperation,
  inferRequiresId,
  initialize,
  listAvailableFunctionNames
};

