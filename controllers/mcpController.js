
const modelController = require('./modelController');
const dynamicReload = require('../utils/dynamicReload');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Importar funções do chatIA
const chatIAFunctions = require('./chatIAController');

// Importar sistema de descoberta automática de MCP
const autoMCP = require('../utils/autoMCP');

// Schema MCP das ferramentas disponíveis
function getMCPSchema() {
  // Obter schemas automáticos dos controllers
  const autoSchemas = autoMCP.generateAllMCPSchemas();

// Lazy load db para evitar problemas de ordem de carregamento
function getDb() {
  const modelsLoader = require('../utils/modelsLoader');
  return modelsLoader.loadModels();
}

  console.log('autoSchemas');
  console.log(autoSchemas);
  
  // Schemas manuais (funções especiais do chatIA)
  const manualSchemas = [
      {
        name: 'createCrud',
        description: 'Cria uma nova Interface (CRUD dinâmico) na plataforma',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome da Interface (ex: usuarios)' },
            title: { type: 'string', description: 'Título da Interface (ex: Usuários)' },
            icon: { type: 'string', description: 'Ícone da Interface (ex: people)' },
            resource: { type: 'string', description: 'Nome do recurso (ex: users)' },
            endpoint: { type: 'string', description: 'Endpoint da API (ex: /api/users)' },
            config: {
              type: 'object',
              description: 'Configuração completa da Interface (columns, fields, relations)',
              properties: {
                title: { type: 'string' },
                icon: { type: 'string' },
                resource: { type: 'string' },
                endpoint: { type: 'string' },
                rowKey: { type: 'string', default: 'id' },
                createRoute: { type: 'string' },
                editRoute: { type: 'string' },
                columns: { type: 'array' },
                fields: { type: 'array' },
                layouts: { type: 'array' },
                relations: { type: 'array' }
              },
              required: ['title']
            }
          },
          required: ['name', 'title', 'resource', 'endpoint', 'config']
        }
      },
      {
        name: 'getCruds',
        description: 'Lista todas as Interfaces (CRUDs) disponíveis no sistema',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'getCrud',
        description: 'Obtém detalhes de uma Interface (CRUD) específica incluindo configuração completa',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID da Interface' },
            name: { type: 'string', description: 'Nome da Interface' }
          },
          anyOf: [
            { required: ['id'] },
            { required: ['name'] }
          ]
        }
      },
      {
        name: 'updateCrud',
        description: 'Atualiza uma Interface (CRUD) existente. Pode adicionar/remover campos, colunas, relações, etc. Faz merge com configuração existente.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID da Interface' },
            name: { type: 'string', description: 'Nome da Interface' },
            title: { type: 'string', description: 'Título da Interface' },
            icon: { type: 'string', description: 'Ícone da Interface' },
            resource: { type: 'string', description: 'Nome do recurso' },
            endpoint: { type: 'string', description: 'Endpoint da API' },
            active: { type: 'boolean', description: 'Se a Interface está ativa' },
            config: {
              type: 'object',
              description: 'Configuração da Interface. Faz merge com configuração existente, então você pode enviar apenas os campos que deseja atualizar (columns, fields, layouts, relations)',
              properties: {
                title: { type: 'string' },
                icon: { type: 'string' },
                resource: { type: 'string' },
                endpoint: { type: 'string' },
                rowKey: { type: 'string' },
                createRoute: { type: 'string' },
                editRoute: { type: 'string' },
                columns: { type: 'array', description: 'Array de colunas da tabela' },
                fields: { type: 'array', description: 'Array de campos do formulário' },
                layouts: { type: 'array', description: 'Array de layouts do formulário' },
                relations: { type: 'array', description: 'Array de relações (many-to-many)' }
              }
            }
          },
          anyOf: [
            { required: ['id'] },
            { required: ['name'] }
          ]
        }
      },
      {
        name: 'createFunction',
        description: 'Cria uma nova função/permissão no sistema',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome da função (ex: user.manter_usuarios)' },
            title: { type: 'string', description: 'Título da função (ex: Manter Usuários)' }
          },
          required: ['name', 'title']
        }
      },
      {
        name: 'createMenu',
        description: 'Cria um novo menu no sistema',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome do menu' },
            id_system: { type: 'integer', description: 'ID do sistema' },
            id_organization: { type: 'integer', description: 'ID da organização (opcional)' }
          },
          required: ['name', 'id_system']
        }
      },
      {
        name: 'createMenuItem',
        description: 'Cria um novo item de menu',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome do item' },
            icon: { type: 'string', description: 'Ícone do item' },
            route: { type: 'string', description: 'Rota do item (ex: /crud/users)' },
            target_blank: { type: 'boolean', default: false },
            id_menu: { type: 'integer', description: 'ID do menu' },
            id_system: { type: 'integer', description: 'ID do sistema' },
            id_organization: { type: 'integer' },
            id_role: { type: 'integer' },
            order: { type: 'integer', default: 0 }
          },
          required: ['name', 'route', 'id_menu', 'id_system']
        }
      },
      {
        name: 'createModel',
        description: 'Cria uma nova model Sequelize no backend',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome da model (ex: pessoa)' },
            className: { type: 'string', description: 'Nome da classe (ex: Pessoa)' },
            module: { type: 'string', description: 'Nome do módulo onde a model será criada (ex: enderecos). Se não especificado, será criada na pasta padrão. Se o módulo não existir, será criado automaticamente.' },
            fields: {
              type: 'array',
              description: 'Array de campos da model',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['INTEGER', 'STRING', 'TEXT', 'BOOLEAN', 'DATE', 'DATEONLY', 'ENUM'] },
                  primaryKey: { type: 'boolean' },
                  autoIncrement: { type: 'boolean' },
                  allowNull: { type: 'boolean' },
                  defaultValue: { type: 'string' },
                  values: { type: 'array', items: { type: 'string' } }
                }
              }
            },
            associations: {
              type: 'array',
              description: 'Array de associações da model',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['belongsTo', 'hasMany', 'hasOne', 'belongsToMany'] },
                  target: { type: 'string' },
                  foreignKey: { type: 'string' },
                  through: { type: 'string' },
                  otherKey: { type: 'string' }
                }
              }
            },
            options: {
              type: 'object',
              properties: {
                tableName: { type: 'string' }
              }
            },
            module: { type: 'string', description: 'Nome do módulo onde a model será criada (ex: enderecos, produtos). Se não especificado, será criada na pasta padrão' }
          },
          required: ['name', 'className', 'fields']
        }
      },
      {
        name: 'updateModel',
        description: 'Atualiza uma model Sequelize existente',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            className: { type: 'string' },
            fields: { type: 'array' },
            associations: { type: 'array' },
            options: { type: 'object' }
          },
          required: ['name', 'className', 'fields']
        }
      },
      {
        name: 'createMigration',
        description: 'Cria uma migration Sequelize para criar ou modificar uma tabela',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            className: { type: 'string' },
            fields: { type: 'array' },
            associations: { type: 'array' },
            options: { type: 'object' },
            isNew: { type: 'boolean', description: 'true para criar nova tabela, false para modificar' },
            module: { type: 'string', description: 'Nome do módulo onde a migration será criada (ex: enderecos, produtos). Se não especificado, será criada na pasta padrão' }
          },
          required: ['name', 'className', 'fields', 'isNew']
        }
      },
      {
        name: 'runMigration',
        description: 'Executa as migrations pendentes no banco de dados',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'generateSeeder',
        description: 'Gera um seeder Sequelize para popular uma tabela com dados iniciais',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome da model (ex: pessoa)' },
            data: { 
              type: 'array', 
              description: 'Array de objetos com os dados a serem inseridos',
              items: { type: 'object' }
            },
            module: { type: 'string', description: 'Nome do módulo onde o seeder será criado (ex: enderecos, produtos). Se não especificado, será criado na pasta padrão' },
            className: { type: 'string', description: 'Nome da classe da model (opcional, usado para determinar nome da tabela)' },
            tableName: { type: 'string', description: 'Nome da tabela (opcional, se não fornecido será gerado automaticamente)' }
          },
          required: ['name', 'data']
        }
      },
      {
        name: 'createSeeder',
        description: 'Cria um seeder Sequelize para popular uma tabela com dados iniciais (alias para generateSeeder)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome da model (ex: pessoa)' },
            data: { 
              type: 'array', 
              description: 'Array de objetos com os dados a serem inseridos',
              items: { type: 'object' }
            },
            module: { type: 'string', description: 'Nome do módulo onde o seeder será criado (ex: enderecos, produtos). Se não especificado, será criado na pasta padrão' },
            className: { type: 'string', description: 'Nome da classe da model (opcional, usado para determinar nome da tabela)' },
            tableName: { type: 'string', description: 'Nome da tabela (opcional, se não fornecido será gerado automaticamente)' }
          },
          required: ['name', 'data']
        }
      },
      {
        name: 'runSeeder',
        description: 'Executa os seeders pendentes no banco de dados',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'reloadDynamicRoutes',
        description: 'Recarrega e atualiza as rotas dinâmicas da API',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'assignPermissionsToRole',
        description: 'Atribui permissões (functions) a uma role',
        inputSchema: {
          type: 'object',
          properties: {
            roleId: { type: 'integer', description: 'ID da role' },
            functionIds: {
              type: 'array',
              description: 'Array de IDs das funções',
              items: { type: 'integer' }
            }
          },
          required: ['roleId', 'functionIds']
        }
      },
      {
        name: 'getModels',
        description: 'Lista todos os models disponíveis no sistema',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'getModel',
        description: 'Obtém detalhes de uma model específica incluindo campos e associações',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome da model (ex: pessoa)' }
          },
          required: ['name']
        }
      },
      {
        name: 'createModule',
        description: 'Cria um novo módulo no sistema. Módulos organizam models, migrations, seeders, routes e controllers',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome do módulo (ex: enderecos, produtos). Deve conter apenas letras minúsculas, números, hífens e underscores' },
            title: { type: 'string', description: 'Título do módulo (ex: Endereços, Produtos)' },
            description: { type: 'string', description: 'Descrição do módulo' },
            version: { type: 'string', description: 'Versão do módulo (padrão: 1.0.0)' },
            isSystem: { type: 'boolean', description: 'Se é um módulo de sistema (padrão: false)' }
          },
          required: ['name', 'title']
        }
      },
      {
        name: 'getModules',
        description: 'Lista todos os módulos disponíveis no sistema',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'getSystems',
        description: 'Lista todos os sistemas disponíveis',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'getRoles',
        description: 'Lista todas as roles disponíveis',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'deleteModel',
        description: 'Exclui uma model do sistema',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome da model a excluir' }
          },
          required: ['name']
        }
      }
    ];
  
  // Expandir schemas automáticos para incluir aliases
  const expandedAutoSchemas = [];
  autoSchemas.forEach(schema => {
    // Adicionar schema principal
    expandedAutoSchemas.push({
      name: schema.name,
      description: schema.description,
      inputSchema: schema.inputSchema
    });
    
    // Adicionar schemas para cada alias
    if (schema.aliases && schema.aliases.length > 0) {
      schema.aliases.forEach(alias => {
        expandedAutoSchemas.push({
          name: alias,
          description: schema.description,
          inputSchema: schema.inputSchema
        });
      });
    }
  });
  
  // Combinar schemas manuais com schemas automáticos expandidos
  return {
    tools: [...manualSchemas, ...expandedAutoSchemas]
  };
}

// Handler MCP para listar ferramentas
async function handleMCPListTools(req, res) {
  try {
    const schema = getMCPSchema();
    res.json({
      jsonrpc: '2.0',
      result: schema,
      id: req.body.id || null
    });
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      },
      id: req.body.id || null
    });
  }
}

// Handler MCP para chamar ferramentas
async function handleMCPCallTool(req, res) {
  try {
    const { name, arguments: args } = req.body.params;
    
    if (!name) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: 'Invalid params: tool name is required'
        },
        id: req.body.id || null
      });
    }

    // Primeiro, tentar funções do chatIA (manuais)
    const chatIAFunctionsMap = chatIAFunctions.getAvailableFunctions();
    
    // Depois, tentar wrappers automáticos dos controllers
    const autoWrappers = autoMCP.getAllMCPWrappers();
    
    // Combinar ambos
    const allFunctions = {
      ...chatIAFunctionsMap,
      ...autoWrappers
    };
    
    if (!allFunctions[name]) {
      return res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Tool "${name}" not found`
        },
        id: req.body.id || null
      });
    }

    // Executar função (pode ser do chatIA ou wrapper automático)
    const result = await allFunctions[name](args || {});
    
    res.json({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ],
        isError: !result.success
      },
      id: req.body.id || null
    });
  } catch (error) {
    console.error('Erro ao executar ferramenta MCP:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      },
      id: req.body.id || null
    });
  }
}

// Handler principal MCP
async function handleMCP(req, res) {
  try {
    const { method, params, id } = req.body;

    if (!method) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request: method is required'
        },
        id: id || null
      });
    }

    switch (method) {
      case 'tools/list':
        return await handleMCPListTools(req, res);
      
      case 'tools/call':
        return await handleMCPCallTool(req, res);
      
      case 'initialize':
        return res.json({
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'mychat-mcp-server',
              version: '1.0.0'
            }
          },
          id: id || null
        });
      
      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method "${method}" not found`
          },
          id: id || null
        });
    }
  } catch (error) {
    console.error('Erro no handler MCP:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      },
      id: req.body.id || null
    });
  }
}

module.exports = {
  handleMCP,
  handleMCPListTools,
  handleMCPCallTool,
  getMCPSchema
};

