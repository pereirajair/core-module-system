const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Lazy load db para evitar problemas de ordem de carregamento
function getDb() {
  const modelsLoader = require('../utils/modelsLoader');
  return modelsLoader.loadModels();
}

const modelController = require('./modelController');
const dynamicReload = require('../utils/dynamicReload');

// Variável global de debug do chat (controlada por variável de ambiente)
const CHAT_DEBUG = process.env.CHAT_DEBUG === 'true' || process.env.CHAT_DEBUG === '1';

// Função helper para logs condicionais
function chatLog(...args) {
  if (CHAT_DEBUG) {
    console.log(...args);
  }
}

// Armazenamento de sessões de conversa em memória
// Estrutura: { userId: [{ role: 'user'|'assistant', content: string, timestamp: Date }] }
const conversationSessions = new Map();

// Limpar sessões antigas periodicamente (mais de 24 horas)
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 horas
  for (const [userId, messages] of conversationSessions.entries()) {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (now - lastMessage.timestamp > maxAge) {
        conversationSessions.delete(userId);
      }
    }
  }
}, 60 * 60 * 1000); // Verificar a cada hora

// Carregar SYSTEM_PROMPT.md
function loadSystemPrompt() {
  try {
    const promptPath = path.join(__dirname, '../SYSTEM_PROMPT.md');
    return fs.readFileSync(promptPath, 'utf8');
  } catch (error) {
    console.error('Erro ao carregar SYSTEM_PROMPT.md:', error);
    return 'Você é um assistente de IA especializado em desenvolvimento de software.';
  }
}

// Função auxiliar para criar seeder (reutilizada por generateSeeder e createSeeder)
async function createSeederInternal(params) {
  const { name, data, module, className, tableName } = params;
  
  if (!name) {
    return { success: false, message: 'Nome da model é obrigatório' };
  }

    try {
      // Buscar informações da model para validar tableName e campos
      const modelController = require('./modelController');
      const { ModelDefinition } = db;
      const normalizedName = modelController.normalizeModelName(name);
      let modelInfo = null;
      let finalTableName = tableName;
      let modelFields = [];
      
      try {
        // Tentar buscar a model do banco de dados primeiro
        const modelDef = await ModelDefinition.findOne({ where: { name: normalizedName } });
        
        if (modelDef && modelDef.definition) {
          const definitionData = typeof modelDef.definition === 'string' 
            ? JSON.parse(modelDef.definition) 
            : modelDef.definition;
          
          modelInfo = {
            name: normalizedName,
            className: modelDef.className,
            fields: definitionData.fields || [],
            options: definitionData.options || {},
            filePath: null
          };
          
          // Obter tableName das options da model
          if (modelInfo.options && modelInfo.options.tableName) {
            finalTableName = modelInfo.options.tableName;
          }
          
          // Obter campos da model para validação
          if (modelInfo.fields && Array.isArray(modelInfo.fields)) {
            modelFields = modelInfo.fields.filter(f => f.name !== 'createdAt' && f.name !== 'updatedAt');
          }
        }
        
        // Sempre tentar buscar do arquivo para garantir tableName correto (mesmo se já tem do banco)
        const fileInfo = modelController.findModelFilePath(normalizedName);
        if (fileInfo && fs.existsSync(fileInfo.path)) {
          const modelContent = fs.readFileSync(fileInfo.path, 'utf8');
          
          // Buscar tableName do arquivo (sempre usar este se encontrado, pois é mais confiável)
          const tableNameMatch = modelContent.match(/tableName:\s*['"]([\w]+)['"]/);
          if (tableNameMatch) {
            finalTableName = tableNameMatch[1];
            console.log(`[createSeeder] tableName encontrado no arquivo da model: "${finalTableName}"`);
          }
          
          // Se não tinha modelInfo do banco, tentar parsear do arquivo
          if (!modelInfo) {
            try {
              const parsedModel = modelController.parseModelFile(modelContent);
              if (parsedModel) {
                modelInfo = {
                  name: normalizedName,
                  className: parsedModel.className || className,
                  fields: parsedModel.fields || [],
                  options: parsedModel.options || {},
                  filePath: fileInfo.path
                };
                modelFields = (parsedModel.fields || []).filter(f => f.name !== 'createdAt' && f.name !== 'updatedAt');
                
                // Se não tinha tableName ainda, usar das options parseadas
                if (!finalTableName && parsedModel.options && parsedModel.options.tableName) {
                  finalTableName = parsedModel.options.tableName;
                }
              }
            } catch (parseError) {
              console.warn(`[createSeeder] Erro ao parsear arquivo da model:`, parseError.message);
            }
          } else {
            // Se já tinha modelInfo do banco mas não tinha tableName, tentar parsear do arquivo também
            if (!finalTableName) {
              try {
                const parsedModel = modelController.parseModelFile(modelContent);
                if (parsedModel && parsedModel.options && parsedModel.options.tableName) {
                  finalTableName = parsedModel.options.tableName;
                  console.log(`[createSeeder] tableName encontrado nas options parseadas: "${finalTableName}"`);
                }
              } catch (parseError) {
                console.warn(`[createSeeder] Erro ao parsear arquivo da model para tableName:`, parseError.message);
              }
            }
          }
        }
      } catch (modelError) {
        console.warn(`[createSeeder] Não foi possível buscar informações da model "${name}":`, modelError.message);
        // Continuar sem validação se não conseguir buscar a model
      }
    
    // Se ainda não tem tableName, usar lógica padrão
    if (!finalTableName) {
      if (className) {
        finalTableName = className.endsWith('s') || className.endsWith('es') ? className : `${className}s`;
      } else {
        finalTableName = `${name.charAt(0).toUpperCase() + name.slice(1)}s`;
      }
    }
    
    // Validar campos do data contra os campos da model (se disponível)
    if (modelFields.length > 0 && data && Array.isArray(data) && data.length > 0) {
      const modelFieldMap = new Map();
      modelFields.forEach(f => {
        modelFieldMap.set(f.name.toLowerCase(), f);
      });
      
      const warnings = [];
      const suggestions = [];
      
      data.forEach((item, index) => {
        Object.keys(item).forEach(key => {
          const keyLower = key.toLowerCase();
          const fieldInfo = modelFieldMap.get(keyLower);
          
          // Verificar se o campo existe na model (ignorar createdAt, updatedAt que são automáticos)
          if (!['createdat', 'updatedat'].includes(keyLower)) {
            if (!fieldInfo) {
              warnings.push(`Item ${index + 1}: campo "${key}" não encontrado na model. Campos disponíveis: ${Array.from(modelFieldMap.keys()).join(', ')}`);
            } else {
              // Validar tipo de dado
              const value = item[key];
              const fieldType = (fieldInfo.type || 'STRING').toUpperCase();
              
              // Verificações básicas de tipo
              if (fieldType === 'INTEGER' && typeof value !== 'number') {
                warnings.push(`Item ${index + 1}: campo "${key}" deve ser INTEGER (número), mas recebeu: ${typeof value}`);
              } else if (fieldType === 'BOOLEAN' && typeof value !== 'boolean') {
                warnings.push(`Item ${index + 1}: campo "${key}" deve ser BOOLEAN (true/false), mas recebeu: ${typeof value}`);
              } else if (fieldType === 'DATE' || fieldType === 'DATEONLY') {
                // Validar formato de data (aceitar string ISO ou Date)
                if (typeof value !== 'string' && !(value instanceof Date)) {
                  warnings.push(`Item ${index + 1}: campo "${key}" deve ser DATE (string ISO ou Date), mas recebeu: ${typeof value}`);
                }
              }
              
              // Verificar se campo obrigatório está presente
              if (fieldInfo.allowNull === false && (value === null || value === undefined || value === '')) {
                warnings.push(`Item ${index + 1}: campo "${key}" é obrigatório (allowNull: false) mas está vazio`);
              }
            }
          }
        });
        
        // Verificar campos obrigatórios que estão faltando
        modelFields.forEach(field => {
          if (field.allowNull === false && field.name !== 'id' && !item.hasOwnProperty(field.name)) {
            const keyLower = field.name.toLowerCase();
            if (!['createdat', 'updatedat'].includes(keyLower)) {
              suggestions.push(`Item ${index + 1}: campo obrigatório "${field.name}" (${field.type || 'STRING'}) não foi fornecido`);
            }
          }
        });
      });
      
      if (warnings.length > 0) {
        console.warn(`[createSeeder] Avisos de validação:`, warnings);
      }
      if (suggestions.length > 0) {
        console.info(`[createSeeder] Sugestões:`, suggestions);
      }
    }
    
    // Determinar caminho baseado no módulo
    let seedersPath;
    if (module) {
      const { loadModules } = require('../utils/moduleLoader');
      const modules = loadModules();
      const moduleExists = modules.find(m => m.name === module && m.enabled);
      
      if (!moduleExists) {
        return { success: false, message: `Módulo "${module}" não existe ou não está habilitado` };
      }
      
      seedersPath = path.join(__dirname, '../../../modules', module, 'seeders');
      // Criar diretório se não existir
      if (!fs.existsSync(seedersPath)) {
        fs.mkdirSync(seedersPath, { recursive: true });
      }
    } else {
      seedersPath = path.join(__dirname, '../../../seeders');
      // Criar diretório se não existir
      if (!fs.existsSync(seedersPath)) {
        fs.mkdirSync(seedersPath, { recursive: true });
      }
    }
    
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '');
    const seederName = `${timestamp}-${name.toLowerCase()}.js`;
    const seederPath = path.join(seedersPath, seederName);
    
    let seederContent = `'use strict';\n\n`;
    seederContent += `/** @type {import('sequelize-cli').Migration} */\n`;
    seederContent += `module.exports = {\n`;
    seederContent += `  async up (queryInterface, Sequelize) {\n`;
    seederContent += `    await queryInterface.bulkInsert('${finalTableName}', [\n`;
    
    if (data && data.length > 0) {
      data.forEach((item, index) => {
        seederContent += `      ${JSON.stringify(item)}`;
        if (index < data.length - 1) seederContent += `,`;
        seederContent += `\n`;
      });
    }
    
    seederContent += `    ], {});\n`;
    seederContent += `  },\n\n`;
    seederContent += `  async down (queryInterface, Sequelize) {\n`;
    seederContent += `    await queryInterface.bulkDelete('${finalTableName}', null, {});\n`;
    seederContent += `  }\n`;
    seederContent += `};\n`;
    
    fs.writeFileSync(seederPath, seederContent, 'utf8');
    
    return { 
      success: true, 
      data: { 
        file: seederName,
        path: seederPath,
        tableName: finalTableName,
        modelValidated: !!modelInfo,
        fieldsCount: modelFields.length
      },
      message: `Seeder para "${name}" criado com sucesso! Tabela: "${finalTableName}"${modelInfo ? ` (validado com model)` : ' (tableName inferido)'}` 
    };
  } catch (error) {
    console.error('Erro ao criar seeder:', error);
    return { success: false, message: `Erro ao criar seeder: ${error.message}` };
  }
}

// Funções que a IA pode executar
const availableFunctions = {
  createCrud: async (params) => {
    try {
      const { name, title, icon, resource, endpoint, config, isSystem } = params;
      
      // Validar campos obrigatórios
      if (!name) {
        return { success: false, message: 'Campo "name" é obrigatório' };
      }
      if (!title) {
        return { success: false, message: 'Campo "title" é obrigatório' };
      }
      if (!resource) {
        return { success: false, message: 'Campo "resource" é obrigatório' };
      }
      if (!endpoint) {
        return { success: false, message: 'Campo "endpoint" é obrigatório' };
      }
      if (!config) {
        return { success: false, message: 'Campo "config" é obrigatório' };
      }
      
      // Processar config (pode ser string JSON ou objeto)
      let configObj;
      try {
        configObj = typeof config === 'string' ? JSON.parse(config) : config;
      } catch (parseError) {
        console.error('[createCrud] Erro ao parsear config:', parseError);
        return { success: false, message: `Erro ao processar config: ${parseError.message}` };
      }
      
      // Se não houver relations no config, tentar buscar da model e popular automaticamente
      if (!configObj.relations || !Array.isArray(configObj.relations) || configObj.relations.length === 0) {
        try {
          // Buscar a model para obter associações
          const modelResult = await availableFunctions.getModel({ name: resource.toLowerCase() });
          if (modelResult.success && modelResult.data && modelResult.data.associations) {
            const associations = modelResult.data.associations;
            
            // Converter associações para relations
            const relations = [];
            associations.forEach(assoc => {
              const targetModelName = assoc.target.toLowerCase();
              const targetModelNamePlural = targetModelName.endsWith('s') ? targetModelName : `${targetModelName}s`;
              const targetModelCapitalized = assoc.target; // Ex: "Country", "State"
              
              // Função helper para formatar label
              const formatLabel = (modelName) => {
                return modelName.charAt(0).toUpperCase() + modelName.slice(1).replace(/([A-Z])/g, ' $1').trim();
              };
              
              if (assoc.type === 'belongsTo') {
                // Para belongsTo, criar relation select
                const foreignKey = assoc.foreignKey || `${targetModelName}_id`;
                const alias = assoc.as || targetModelCapitalized; // Usar alias da associação ou o nome capitalizado
                
                relations.push({
                  type: 'select',
                  modelName: targetModelNamePlural, // Nome da model relacionada (plural, lowercase)
                  label: formatLabel(assoc.target),
                  endpoint: `/api/${targetModelNamePlural}`,
                  field: alias, // Campo no response (ex: "Country", "Organization")
                  itemLabel: 'name',
                  itemValue: 'id',
                  payloadField: foreignKey, // Campo no payload (ex: "country_id", "id_organization")
                  as: alias
                });
                
                console.log(`[createCrud] Relação select adicionada para ${assoc.target} (foreignKey: ${foreignKey}, alias: ${alias}, modelName: ${targetModelNamePlural})`);
              } else if (assoc.type === 'hasMany') {
                // Para hasMany, criar relation inline
                relations.push({
                  type: 'inline',
                  modelName: targetModelNamePlural,
                  label: formatLabel(assoc.target) + 's',
                  field: assoc.target + 's', // Campo no response (ex: "Cities")
                  addLabel: `Adicionar ${formatLabel(assoc.target)}`,
                  payloadField: targetModelNamePlural, // Campo no payload (ex: "cities")
                  fields: [] // Será preenchido quando necessário
                });
                
                console.log(`[createCrud] Relação inline adicionada para ${assoc.target}`);
              } else if (assoc.type === 'belongsToMany') {
                // Para belongsToMany, criar relation multiselect
                relations.push({
                  type: 'multiselect',
                  modelName: targetModelNamePlural,
                  label: formatLabel(assoc.target) + 's',
                  endpoint: `/api/${targetModelNamePlural}`,
                  field: assoc.target + 's', // Campo no response (ex: "Roles")
                  itemLabel: 'name',
                  itemValue: 'id',
                  payloadField: `${targetModelName}Ids`, // Campo no payload (ex: "roleIds")
                  availableLabel: 'Disponíveis',
                  selectedLabel: 'Selecionados'
                });
                
                console.log(`[createCrud] Relação multiselect adicionada para ${assoc.target}`);
              }
            });
            
            if (relations.length > 0) {
              configObj.relations = relations;
              console.log(`[createCrud] ${relations.length} relação(ões) adicionada(s) automaticamente baseada(s) nas associações da model`);
            }
          }
        } catch (modelError) {
          console.warn(`[createCrud] Não foi possível buscar associações da model ${resource}:`, modelError.message);
          // Continuar mesmo se não conseguir buscar a model
        }
      }
      
      // Verificar se já existe um CRUD com o mesmo name
      const existingCrud = await Crud.findOne({ where: { name } });
      if (existingCrud) {
        return { success: false, message: `Já existe uma Interface com o nome "${name}"` };
      }
      
      console.log('[createCrud] Criando CRUD com dados:', {
        name,
        title,
        icon: icon || 'settings',
        resource,
        endpoint,
        configKeys: configObj ? Object.keys(configObj) : [],
        active: true,
        isSystem: false
      });
      
      const crud = await Crud.create({
        name,
        title,
        icon: icon || 'settings',
        resource,
        endpoint,
        config: configObj,
        active: true,
        isSystem: false // Sempre false para novos CRUDs criados pela IA
      });
      
      console.log('[createCrud] CRUD criado com sucesso, ID:', crud.id);
      
      return { success: true, data: crud, message: `Interface "${title}" criada com sucesso!` };
    } catch (error) {
      console.error('[createCrud] Erro ao criar CRUD:', error);
      console.error('[createCrud] Stack trace:', error.stack);
      
      // Verificar se é erro de constraint única
      if (error.name === 'SequelizeUniqueConstraintError') {
        return { success: false, message: `Já existe uma Interface com o nome "${params.name}"` };
      }
      
      // Verificar se é erro de validação
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(e => e.message).join(', ');
        return { success: false, message: `Erro de validação: ${validationErrors}` };
      }
      
      return { success: false, message: `Erro ao criar Interface: ${error.message}` };
    }
  },

  getCruds: async () => {
    try {
      const cruds = await Crud.findAll({
        where: { active: true },
        order: [['title', 'ASC']],
        attributes: ['id', 'name', 'title', 'icon', 'resource', 'endpoint', 'active']
      });
      return { success: true, data: cruds, message: `${cruds.length} Interface(s) encontrada(s)` };
    } catch (error) {
      return { success: false, message: `Erro ao listar Interfaces: ${error.message}` };
    }
  },

  getCrud: async (params) => {
    try {
      const { id, name } = params;
      
      console.log('[getCrud] Parâmetros recebidos:', { id, name });
      
      if (!id && !name) {
        return { success: false, message: 'ID ou nome da Interface é obrigatório' };
      }

      let crud;
      if (id) {
        console.log('[getCrud] Buscando por ID:', id);
        crud = await Crud.findByPk(id);
      } else {
        console.log('[getCrud] Buscando por nome:', name);
        crud = await Crud.findOne({
          where: { name, active: true }
        });
      }
      
      if (!crud) {
        console.log('[getCrud] Interface não encontrada');
        return { success: false, message: `Interface não encontrada${name ? ` com nome "${name}"` : id ? ` com ID ${id}` : ''}` };
      }
      
      // Garantir que isSystem seja sempre boolean
      const crudData = crud.toJSON();
      crudData.isSystem = Boolean(crudData.isSystem === true || crudData.isSystem === 1);

      console.log('[getCrud] Interface encontrada:', crudData.name);
      
      return { 
        success: true, 
        data: crudData, 
        message: `Interface "${crudData.title}" encontrada com sucesso!` 
      };
    } catch (error) {
      console.error('[getCrud] Erro ao buscar Interface:', error);
      console.error('[getCrud] Stack trace:', error.stack);
      return { 
        success: false, 
        message: `Erro ao buscar Interface: ${error.message || error.toString() || 'Erro desconhecido'}` 
      };
    }
  },

  updateCrud: async (params) => {
    const { id, name, title, icon, resource, endpoint, config, active } = params;
    
    if (!id && !name) {
      return { success: false, message: 'ID ou nome da Interface é obrigatório' };
    }

    try {
      // Buscar CRUD por ID ou nome
      let crud;
      if (id) {
        crud = await Crud.findByPk(id);
      } else {
        crud = await Crud.findOne({ where: { name, active: true } });
      }

      if (!crud) {
        return { success: false, message: 'Interface não encontrada' };
      }

      // Verificar se é uma interface de sistema
      const isSystem = Boolean(crud.isSystem === true || crud.isSystem === 1);
      if (isSystem) {
        return { 
          success: false, 
          message: `Não é possível editar a Interface "${crud.title}" pois ela é uma interface de sistema` 
        };
      }

      // Atualizar campos básicos se fornecidos
      if (title !== undefined) crud.title = title;
      if (icon !== undefined) crud.icon = icon;
      if (resource !== undefined) crud.resource = resource;
      if (endpoint !== undefined) crud.endpoint = endpoint;
      if (active !== undefined) crud.active = active;
      if (name !== undefined && name !== crud.name) {
        // Verificar se o novo nome já existe
        const existingCrud = await Crud.findOne({ where: { name } });
        if (existingCrud && existingCrud.id !== crud.id) {
          return { success: false, message: 'Já existe uma Interface com este nome' };
        }
        crud.name = name;
      }

      // Atualizar config se fornecido
      if (config !== undefined) {
        try {
          const configObj = typeof config === 'string' ? JSON.parse(config) : config;
          // Fazer merge com config existente para preservar campos não mencionados
          // Arrays (columns, layouts, relations) são substituídos completamente se fornecidos
          const currentConfig = crud.config || {};
          crud.config = {
            ...currentConfig,
            ...configObj,
            // Se arrays são fornecidos, substituir completamente (não fazer merge)
            ...(configObj.columns !== undefined && { columns: configObj.columns }),
            ...(configObj.layouts !== undefined && { layouts: configObj.layouts }),
            ...(configObj.fields !== undefined && { fields: configObj.fields }),
            ...(configObj.relations !== undefined && { relations: configObj.relations })
          };
        } catch (e) {
          return { success: false, message: 'Config deve ser um JSON válido' };
        }
      }

      await crud.save();
      
      return { 
        success: true, 
        data: crud, 
        message: `Interface "${crud.title}" atualizada com sucesso!` 
      };
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return { success: false, message: 'Já existe uma Interface com este nome' };
      }
      return { success: false, message: `Erro ao atualizar Interface: ${error.message}` };
    }
  },

  createFunction: async (params) => {
    const { name, title } = params;
    const func = await Function.create({ name, title });
    return { success: true, data: func, message: `Função "${title}" criada com sucesso!` };
  },

  createMenu: async (params) => {
    const { name, id_system, id_organization } = params;
    const menu = await Menu.create({
      name,
      id_system,
      id_organization: id_organization || null
    });
    return { success: true, data: menu, message: `Menu "${name}" criado com sucesso!` };
  },

  createMenuItem: async (params) => {
    const { name, icon, route, target_blank, id_menu, id_system, id_organization, id_role, order } = params;
    const menuItem = await MenuItems.create({
      name,
      icon: icon || null,
      route,
      target_blank: target_blank || false,
      id_menu,
      id_system,
      id_organization: id_organization || null,
      id_role: id_role || null,
      order: order || 0
    });
    return { success: true, data: menuItem, message: `Item de menu "${name}" criado com sucesso!` };
  },

  createMigration: async (params) => {
    const { name, className, fields, associations, options, isNew, module } = params;
    
    if (!name) {
      return { success: false, message: 'Nome da model é obrigatório' };
    }

    // Função helper para buscar o nome da tabela relacionada dinamicamente via Sequelize
    const getRelatedTableName = (targetModel, moduleName) => {
      // Preparar variações do nome do modelo
      const modelLower = targetModel.toLowerCase();
      const modelPlural = modelLower.endsWith('s') ? modelLower : `${modelLower}s`;
      const modelSingular = modelLower.endsWith('s') ? modelLower.slice(0, -1) : modelLower;
      
      try {
        // Buscar o modelo no Sequelize pelo nome exato
        if (db.sequelize && db.sequelize.models) {
          const models = db.sequelize.models;
          
          // Tentar nome exato primeiro
          if (models[targetModel]) {
            const tableName = models[targetModel].tableName;
            console.log(`[createMigration] Tabela encontrada via Sequelize para ${targetModel}: ${tableName}`);
            return tableName;
          }
          
          // Tentar com primeira letra maiúscula
          const modelCapitalized = targetModel.charAt(0).toUpperCase() + targetModel.slice(1);
          const modelPluralCapitalized = modelPlural.charAt(0).toUpperCase() + modelPlural.slice(1);
          const modelSingularCapitalized = modelSingular.charAt(0).toUpperCase() + modelSingular.slice(1);
          
          // Lista de variações para tentar
          const variations = [
            modelCapitalized,
            modelPluralCapitalized,
            modelSingularCapitalized,
            targetModel,
            modelPlural,
            modelSingular
          ];
          
          // Tentar cada variação pelo nome do modelo
          for (const variation of variations) {
            if (models[variation]) {
              const tableName = models[variation].tableName;
              console.log(`[createMigration] Tabela encontrada via Sequelize para ${targetModel} (variação: ${variation}): ${tableName}`);
              return tableName;
            }
          }
          
          // Buscar também pelo tableName diretamente (caso o modelName seja diferente)
          // Ex: procurar por 'sys_organizations' quando targetModel é 'Organization'
          for (const [modelName, model] of Object.entries(models)) {
            if (model.tableName) {
              const tableNameLower = model.tableName.toLowerCase();
              // Verificar se o tableName corresponde ao targetModel (sem prefixo)
              const tableNameWithoutPrefix = tableNameLower.replace(/^(sys_|loc_|per_|[a-z]{3}_)/, '');
              if (tableNameWithoutPrefix === modelLower || tableNameWithoutPrefix === modelPlural || tableNameWithoutPrefix === modelSingular) {
                console.log(`[createMigration] Tabela encontrada via tableName para ${targetModel}: ${model.tableName}`);
                return model.tableName;
              }
            }
          }
          
          // Se não encontrou pelo nome do modelo, buscar pelo tableName
          // Varrer todos os modelos e verificar se o tableName (sem prefixo) corresponde
          for (const [modelName, model] of Object.entries(models)) {
            if (model.tableName) {
              const tableName = model.tableName.toLowerCase();
              // Remover prefixos conhecidos (sys_, loc_, per_, ou qualquer prefixo de 3 letras + _)
              const tableNameWithoutPrefix = tableName.replace(/^(sys_|loc_|per_|[a-z]{3}_)/, '');
              
              // Verificar se o nome da tabela (sem prefixo) corresponde ao targetModel
              if (tableNameWithoutPrefix === modelLower || tableNameWithoutPrefix === modelPlural || tableNameWithoutPrefix === modelSingular) {
                // Retornar o tableName completo encontrado
                console.log(`[createMigration] Tabela encontrada dinamicamente pelo tableName para ${targetModel}: ${model.tableName}`);
                return model.tableName;
              }
            }
          }
          
          // Se não encontrou correspondência exata, tentar inferir pelo prefixo conhecido
          // Verificar se existe algum modelo do sistema que corresponda
          for (const [modelName, model] of Object.entries(models)) {
            if (model.tableName && model.tableName.toLowerCase().startsWith('sys_')) {
              const tableNameWithoutPrefix = model.tableName.toLowerCase().replace(/^sys_/, '');
              if (tableNameWithoutPrefix === modelLower || tableNameWithoutPrefix === modelPlural || tableNameWithoutPrefix === modelSingular) {
                console.log(`[createMigration] Tabela do sistema encontrada dinamicamente para ${targetModel}: ${model.tableName}`);
                return model.tableName;
              }
            }
          }
          
          // Verificar se existe algum modelo de locations que corresponda
          for (const [modelName, model] of Object.entries(models)) {
            if (model.tableName && model.tableName.toLowerCase().startsWith('loc_')) {
              const tableNameWithoutPrefix = model.tableName.toLowerCase().replace(/^loc_/, '');
              if (tableNameWithoutPrefix === modelLower || tableNameWithoutPrefix === modelPlural || tableNameWithoutPrefix === modelSingular) {
                console.log(`[createMigration] Tabela de locations encontrada dinamicamente para ${targetModel}: ${model.tableName}`);
                return model.tableName;
              }
            }
          }
          
          // Se não encontrou correspondência exata, verificar se há modelos com prefixos sys_ ou loc_
          // para inferir que pode ser uma dessas categorias
          let hasSystemTables = false;
          let hasLocationTables = false;
          
          for (const model of Object.values(models)) {
            if (model.tableName) {
              const tableName = model.tableName.toLowerCase();
              if (tableName.startsWith('sys_')) {
                hasSystemTables = true;
              } else if (tableName.startsWith('loc_')) {
                hasLocationTables = true;
              }
            }
          }
          
          // Tentar inferir pelo contexto: se há tabelas sys_ e o nome parece ser do sistema
          if (hasSystemTables) {
            // Verificar se algum modelo sys_ tem nome similar
            for (const model of Object.values(models)) {
              if (model.tableName && model.tableName.toLowerCase().startsWith('sys_')) {
                const tableNameWithoutPrefix = model.tableName.toLowerCase().replace(/^sys_/, '');
                // Verificar similaridade (pode ser plural/singular)
                if (tableNameWithoutPrefix.includes(modelLower) || modelLower.includes(tableNameWithoutPrefix)) {
                  // Verificar se modelPlural já tem prefixo sys_ antes de adicionar
                  const modelPluralLower = modelPlural.toLowerCase();
                  let possibleSystemTable;
                  if (modelPluralLower.startsWith('sys_')) {
                    // Já tem prefixo sys_, usar diretamente
                    possibleSystemTable = modelPlural;
                  } else {
                    // Adicionar prefixo sys_
                    possibleSystemTable = 'sys_' + modelPlural;
                  }
                  console.log(`[createMigration] Inferindo tabela do sistema para ${targetModel}: ${possibleSystemTable}`);
                  return possibleSystemTable;
                }
              }
            }
          }
          
          // Tentar inferir pelo contexto: se há tabelas loc_ e o nome parece ser de locations
          if (hasLocationTables) {
            // Verificar se algum modelo loc_ tem nome similar
            for (const model of Object.values(models)) {
              if (model.tableName && model.tableName.toLowerCase().startsWith('loc_')) {
                const tableNameWithoutPrefix = model.tableName.toLowerCase().replace(/^loc_/, '');
                // Verificar similaridade (pode ser plural/singular)
                if (tableNameWithoutPrefix.includes(modelLower) || modelLower.includes(tableNameWithoutPrefix)) {
                  // Verificar se modelPlural já tem prefixo loc_ antes de adicionar
                  const modelPluralLower = modelPlural.toLowerCase();
                  let possibleLocationTable;
                  if (modelPluralLower.startsWith('loc_')) {
                    // Já tem prefixo loc_, usar diretamente
                    possibleLocationTable = modelPlural;
                  } else {
                    // Adicionar prefixo loc_
                    possibleLocationTable = 'loc_' + modelPlural;
                  }
                  console.log(`[createMigration] Inferindo tabela de locations para ${targetModel}: ${possibleLocationTable}`);
                  return possibleLocationTable;
                }
              }
            }
          }
          
          // Se não encontrou, listar todos os modelos disponíveis para debug
          const availableModels = Object.keys(models).join(', ');
          console.warn(`[createMigration] Modelo ${targetModel} não encontrado no Sequelize. Modelos disponíveis: ${availableModels}`);
        } else {
          console.warn(`[createMigration] db.sequelize.models não disponível`);
        }
      } catch (error) {
        console.error(`[createMigration] Erro ao buscar tabela relacionada para ${targetModel}:`, error.message);
      }
      
      // Antes de usar fallback, verificar se o nome já tem prefixo conhecido
      const modelPluralLower = modelPlural.toLowerCase();
      if (modelPluralLower.startsWith('sys_') || modelPluralLower.startsWith('loc_')) {
        // Já tem prefixo conhecido, retornar diretamente
        console.log(`[createMigration] Nome já tem prefixo conhecido para ${targetModel}: ${modelPlural}`);
        return modelPlural;
      }
      
      // Se não for sistema nem locations, usar prefixo do módulo se disponível
      if (moduleName) {
        const modulePrefix = moduleName.substring(0, 3).toLowerCase() + '_';
        // Verificar se já tem o prefixo do módulo antes de adicionar
        if (!modelPluralLower.startsWith(modulePrefix)) {
          const fallbackTableName = modulePrefix + modelPlural;
          console.log(`[createMigration] Usando fallback com prefixo do módulo para ${targetModel}: ${fallbackTableName}`);
          return fallbackTableName;
        } else {
          console.log(`[createMigration] Nome já tem prefixo do módulo para ${targetModel}: ${modelPlural}`);
          return modelPlural;
        }
      }
      
      // Último fallback: retornar plural sem prefixo
      console.warn(`[createMigration] Usando fallback sem prefixo para ${targetModel}: ${modelPlural}`);
      return modelPlural;
    };

    try {
      // Determinar caminho baseado no módulo
      let migrationsPath;
      if (module) {
        const { loadModules } = require('../utils/moduleLoader');
        const modules = loadModules();
        const moduleExists = modules.find(m => m.name === module && m.enabled);
        
        if (!moduleExists) {
          return { success: false, message: `Módulo "${module}" não existe ou não está habilitado` };
        }
        
        migrationsPath = path.join(__dirname, '../../../modules', module, 'migrations');
        if (!fs.existsSync(migrationsPath)) {
          // Criar diretório se não existir
          fs.mkdirSync(migrationsPath, { recursive: true });
          console.log(`[createMigration] Diretório de migrations criado para o módulo "${module}": ${migrationsPath}`);
        }
      } else {
        migrationsPath = path.join(__dirname, '../../../migrations');
      }
      
      // Tentar buscar o modelo existente para obter o tableName correto
      let tableName = options?.tableName;
      
      if (!tableName) {
        // Tentar buscar do arquivo do modelo (buscar em todos os módulos)
        const modelController = require('./modelController');
        const normalizedName = modelController.normalizeModelName(name);
        const fileInfo = modelController.findModelFilePath(normalizedName);
        
        if (fileInfo && fs.existsSync(fileInfo.path)) {
          const modelContent = fs.readFileSync(fileInfo.path, 'utf8');
          // Procurar por tableName no arquivo
          const tableNameMatch = modelContent.match(/tableName:\s*['"]([\w]+)['"]/);
          if (tableNameMatch) {
            tableName = tableNameMatch[1];
            console.log(`[createMigration] tableName encontrado no modelo: ${tableName}`);
          }
        }
        
        // Se ainda não encontrou, usar a mesma lógica do generateModelFile
        if (!tableName) {
          const modelName = className || name.charAt(0).toUpperCase() + name.slice(1);
          let tableNameBase = modelName.toLowerCase();
          // Verificar se já está no plural (termina com 's' ou 'es')
          if (!tableNameBase.endsWith('s') && !tableNameBase.endsWith('es')) {
            tableNameBase = `${tableNameBase}s`;
          }
          
          // Adicionar prefixo do módulo se fornecido
          if (module) {
            const modulePrefix = module.substring(0, 3).toLowerCase() + '_';
            tableName = modulePrefix + tableNameBase;
          } else {
            tableName = tableNameBase;
          }
          console.log(`[createMigration] tableName gerado: ${tableName}`);
        }
      }
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '');
      const migrationName = isNew 
        ? `${timestamp}-create-${name.toLowerCase()}.js`
        : `${timestamp}-modify-${name.toLowerCase()}.js`;
      
      const migrationPath = path.join(migrationsPath, migrationName);
      
      let migrationContent = `'use strict';\n`;
      migrationContent += `/** @type {import('sequelize-cli').Migration} */\n`;
      migrationContent += `module.exports = {\n`;
      migrationContent += `  async up(queryInterface, Sequelize) {\n`;
      
      if (isNew) {
        migrationContent += `    await queryInterface.createTable('${tableName}', {\n`;
        
        // Adicionar todos os campos
        const allFields = [...(fields || [])];
        
        // Normalizar referências em campos existentes - corrigir model para usar tableName
        allFields.forEach(field => {
          if (field.references && field.references.model) {
            const originalModel = field.references.model;
            const correctTableName = getRelatedTableName(originalModel, module);
            if (correctTableName !== originalModel) {
              console.log(`[createMigration] Corrigindo referência de campo "${field.name}": "${originalModel}" → "${correctTableName}"`);
              field.references.model = correctTableName;
            }
          }
        });
        
        // Adicionar campos foreign key para associações belongsTo que não estão em fields
        if (associations && associations.length > 0) {
          const belongsToAssociations = associations.filter(a => a.type === 'belongsTo');
          belongsToAssociations.forEach(assoc => {
            const foreignKey = assoc.foreignKey || `${assoc.target.toLowerCase()}_id`;
            // Verificar se o campo já está em allFields
            const fieldExists = allFields.some(f => f.name === foreignKey);
            if (!fieldExists) {
              const relatedTableName = getRelatedTableName(assoc.target, module);
              
              // Adicionar campo foreign key
              allFields.push({
                name: foreignKey,
                type: 'INTEGER',
                allowNull: assoc.allowNull !== false,
                references: {
                  model: relatedTableName,
                  key: 'id'
                }
              });
              console.log(`[createMigration] Campo foreign key "${foreignKey}" adicionado automaticamente para associação belongsTo com ${assoc.target} (tabela: ${relatedTableName})`);
            } else {
              // Campo já existe, mas garantir que a referência está correta
              const existingField = allFields.find(f => f.name === foreignKey);
              if (existingField && existingField.references) {
                const originalModel = existingField.references.model || assoc.target;
                const correctTableName = getRelatedTableName(originalModel, module);
                if (correctTableName !== originalModel) {
                  console.log(`[createMigration] Corrigindo referência de campo existente "${foreignKey}": "${originalModel}" → "${correctTableName}"`);
                  existingField.references.model = correctTableName;
                }
              } else if (existingField && !existingField.references) {
                // Campo existe mas não tem referência, adicionar
                const relatedTableName = getRelatedTableName(assoc.target, module);
                existingField.references = {
                  model: relatedTableName,
                  key: 'id'
                };
                console.log(`[createMigration] Referência adicionada ao campo existente "${foreignKey}" (tabela: ${relatedTableName})`);
              }
            }
          });
        }
        
        // Filtrar createdAt e updatedAt de allFields para evitar duplicação (serão adicionados depois)
        const fieldsWithoutTimestamps = allFields.filter(f => 
          f.name !== 'createdAt' && f.name !== 'updatedAt'
        );
        
        fieldsWithoutTimestamps.forEach((field, index) => {
          migrationContent += `      ${field.name}: {\n`;
          migrationContent += `        type: Sequelize.${field.type.toUpperCase()}`;
          
          // Adicionar valores para ENUM se existirem
          if (field.type.toUpperCase() === 'ENUM' && field.values && Array.isArray(field.values)) {
            migrationContent += `(${field.values.map(v => `'${v}'`).join(', ')})`;
          }
          
          if (field.allowNull === false) migrationContent += `,\n        allowNull: false`;
          if (field.primaryKey) migrationContent += `,\n        primaryKey: true`;
          if (field.autoIncrement) migrationContent += `,\n        autoIncrement: true`;
          if (field.defaultValue !== undefined && field.defaultValue !== null) {
            if (typeof field.defaultValue === 'string') {
              migrationContent += `,\n        defaultValue: '${field.defaultValue}'`;
            } else {
              migrationContent += `,\n        defaultValue: ${field.defaultValue}`;
            }
          }
          if (field.references) {
            migrationContent += `,\n        references: {\n`;
            migrationContent += `          model: '${field.references.model}',\n`;
            migrationContent += `          key: '${field.references.key}'\n`;
            migrationContent += `        }`;
          }
          migrationContent += `\n      }`;
          // Sempre adicionar vírgula após cada campo (antes de createdAt/updatedAt também precisa)
          migrationContent += `,`;
          migrationContent += `\n`;
        });
        
        // Adicionar createdAt e updatedAt (com vírgula antes)
        migrationContent += `      createdAt: {\n`;
        migrationContent += `        allowNull: false,\n`;
        migrationContent += `        type: Sequelize.DATE,\n`;
        migrationContent += `        defaultValue: queryInterface.sequelize.literal('CURRENT_TIMESTAMP')\n`;
        migrationContent += `      },\n`;
        migrationContent += `      updatedAt: {\n`;
        migrationContent += `        allowNull: false,\n`;
        migrationContent += `        type: Sequelize.DATE,\n`;
        migrationContent += `        defaultValue: queryInterface.sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')\n`;
        migrationContent += `      }\n`;
        
        migrationContent += `    });\n`;
      } else {
        // Modificar tabela existente - adicionar campos novos
        // Processar associações belongsTo para adicionar campos de foreign key
        const belongsToAssociations = (associations || []).filter(a => a.type === 'belongsTo');
        
        // Adicionar campos novos que não existem na tabela
        // Ignorar apenas campos que sempre existem (id, createdAt, updatedAt)
        const fieldsToAdd = (fields || []).filter(field => {
          if (!field.name || !field.type) {
            return false; // Ignorar campos inválidos
          }
          // Ignorar campos que sempre existem (id, createdAt, updatedAt)
          if (field.name === 'id' || field.name === 'createdAt' || field.name === 'updatedAt') {
            return false;
          }
          return true; // Adicionar todos os outros campos (incluindo pais_id se estiver em fields)
        });
        
        // Normalizar referências em campos existentes antes de adicionar novos
        fieldsToAdd.forEach(field => {
          if (field.references && field.references.model) {
            const originalModel = field.references.model;
            const correctTableName = getRelatedTableName(originalModel, module);
            if (correctTableName !== originalModel) {
              console.log(`[createMigration] Corrigindo referência de campo "${field.name}": "${originalModel}" → "${correctTableName}"`);
              field.references.model = correctTableName;
            }
          }
        });
        
        // Adicionar campos de foreign key de associações belongsTo que não estão em fields
        belongsToAssociations.forEach(assoc => {
          const foreignKey = assoc.foreignKey || `${assoc.target.toLowerCase()}_id`;
          // Verificar se o campo já está em fieldsToAdd (já foi adicionado)
          const alreadyAdded = fieldsToAdd.some(f => f.name === foreignKey);
          if (!alreadyAdded) {
            // Verificar também se está em fields original
            const fieldExists = (fields || []).some(f => f.name === foreignKey);
            if (!fieldExists) {
              const relatedTableName = getRelatedTableName(assoc.target, module);
              
              // Adicionar campo de foreign key
              fieldsToAdd.push({
                name: foreignKey,
                type: 'INTEGER',
                allowNull: assoc.allowNull !== false,
                references: {
                  model: relatedTableName,
                  key: 'id'
                }
              });
              console.log(`[createMigration] Campo foreign key "${foreignKey}" adicionado para associação belongsTo com ${assoc.target} (tabela: ${relatedTableName})`);
            } else {
              // Campo existe em fields original, normalizar sua referência se tiver
              const existingField = (fields || []).find(f => f.name === foreignKey);
              if (existingField && existingField.references) {
                const originalModel = existingField.references.model || assoc.target;
                const correctTableName = getRelatedTableName(originalModel, module);
                // Adicionar campo com referência corrigida
                fieldsToAdd.push({
                  name: foreignKey,
                  type: existingField.type || 'INTEGER',
                  allowNull: existingField.allowNull !== false,
                  references: {
                    model: correctTableName,
                    key: existingField.references.key || 'id'
                  }
                });
                console.log(`[createMigration] Campo foreign key "${foreignKey}" adicionado com referência corrigida: "${originalModel}" → "${correctTableName}"`);
              }
            }
          }
        });
        
        // Log para debug
        console.log(`[createMigration] Modificando tabela ${tableName}`);
        console.log(`[createMigration] Campos recebidos:`, (fields || []).map(f => f.name).join(', '));
        console.log(`[createMigration] Associações belongsTo:`, belongsToAssociations.map(a => `${a.target} (${a.foreignKey || `${a.target.toLowerCase()}_id`})`).join(', '));
        console.log(`[createMigration] Campos a adicionar:`, fieldsToAdd.map(f => f.name).join(', '));
        
        // Gerar comandos para adicionar cada campo
        if (fieldsToAdd.length > 0) {
          fieldsToAdd.forEach((field) => {
            if (!field.name || !field.type) {
              console.warn(`[createMigration] Campo inválido ignorado:`, field);
              return;
            }
            
            migrationContent += `    await queryInterface.addColumn('${tableName}', '${field.name}', {\n`;
            migrationContent += `      type: Sequelize.${String(field.type).toUpperCase()}`;
            
            if (field.type.toUpperCase() === 'ENUM' && field.values && Array.isArray(field.values)) {
              migrationContent += `(${field.values.map(v => `'${v}'`).join(', ')})`;
            }
            
            if (field.allowNull === false) {
              migrationContent += `,\n      allowNull: false`;
            }
            
            if (field.defaultValue !== undefined && field.defaultValue !== null) {
              if (typeof field.defaultValue === 'string') {
                migrationContent += `,\n      defaultValue: '${field.defaultValue}'`;
              } else {
                migrationContent += `,\n      defaultValue: ${field.defaultValue}`;
              }
            }
            
            if (field.references) {
              migrationContent += `,\n      references: {\n`;
              migrationContent += `        model: '${field.references.model}',\n`;
              migrationContent += `        key: '${field.references.key}'\n`;
              migrationContent += `      }`;
            }
            
            migrationContent += `\n    });\n`;
          });
        } else {
          migrationContent += `    // Nenhum campo novo para adicionar\n`;
        }
      }
      
      migrationContent += `  },\n`;
      migrationContent += `  async down(queryInterface, Sequelize) {\n`;
      
      if (isNew) {
        migrationContent += `    await queryInterface.dropTable('${tableName}');\n`;
      } else {
        // Rollback: remover campos adicionados
        const belongsToAssociations = (associations || []).filter(a => a.type === 'belongsTo');
        
        const fieldsToRemove = (fields || []).filter(field => {
          if (field.name === 'id' || field.name === 'createdAt' || field.name === 'updatedAt') {
            return false;
          }
          return true;
        });
        
        // Adicionar campos de foreign key de associações belongsTo
        belongsToAssociations.forEach(assoc => {
          const foreignKey = assoc.foreignKey || `${assoc.target.toLowerCase()}_id`;
          const fieldExists = (fields || []).some(f => f.name === foreignKey);
          if (!fieldExists) {
            fieldsToRemove.push({ name: foreignKey });
          }
        });
        
        // Gerar comandos para remover cada campo (em ordem reversa)
        if (fieldsToRemove.length > 0) {
          fieldsToRemove.reverse().forEach(field => {
            migrationContent += `    await queryInterface.removeColumn('${tableName}', '${field.name}');\n`;
          });
        } else {
          migrationContent += `    // Nenhum campo para remover\n`;
        }
      }
      
      migrationContent += `  }\n`;
      migrationContent += `};\n`;
      
      fs.writeFileSync(migrationPath, migrationContent, 'utf8');
      
      // Log para debug (sempre exibir criação de migration)
      console.log(`[createMigration] Migration criada: ${migrationPath}`);
      console.log(`[createMigration] Tabela: ${tableName}, Campos: ${fields?.length || 0}`);
      
      return { 
        success: true, 
        data: { 
          file: migrationName,
          path: migrationPath,
          tableName: tableName
        },
        message: `Migration para "${className || name}" criada com sucesso!` 
      };
    } catch (error) {
      console.error('Erro ao criar migration:', error);
      return { success: false, message: `Erro ao criar migration: ${error.message}` };
    }
  },

  runMigration: async (params) => {
    try {
      const { execSync } = require('child_process');
      // Executar no diretório do módulo system onde está o package.json
      const systemPath = path.join(__dirname, '..');
      const result = execSync('npm run db:migrate', { 
        cwd: systemPath,
        encoding: 'utf8'
      });
      return { 
        success: true, 
        data: { output: result },
        message: 'Migrations executadas com sucesso!' 
      };
    } catch (error) {
      console.error('Erro ao executar migrations:', error);
      return { 
        success: false, 
        message: `Erro ao executar migrations: ${error.message}`,
        data: { output: error.stdout || error.stderr || error.message }
      };
    }
  },

  reloadDynamicRoutes: async (params) => {
    try {
      const result = await dynamicReload.reloadDynamicRoutes();
      return result;
    } catch (error) {
      console.error('Erro ao recarregar rotas dinâmicas:', error);
      return { 
        success: false, 
        message: `Erro ao recarregar rotas dinâmicas: ${error.message}` 
      };
    }
  },

  assignPermissionsToRole: async (params) => {
    const { roleId, functionIds } = params;
    
    // Validar que functionIds é um array de números
    if (!Array.isArray(functionIds)) {
      return { success: false, message: 'functionIds deve ser um array de números' };
    }
    
    // Validar que todos os IDs são números válidos
    const invalidIds = functionIds.filter(id => typeof id !== 'number' || isNaN(id) || id <= 0);
    if (invalidIds.length > 0) {
      console.error('[assignPermissionsToRole] IDs inválidos recebidos:', invalidIds);
      return { 
        success: false, 
        message: `IDs inválidos recebidos: ${invalidIds.join(', ')}. Os IDs devem ser números válidos extraídos dos resultados de createFunction (campo data.id).` 
      };
    }
    
    const role = await Role.findByPk(roleId);
    if (!role) {
      return { success: false, message: 'Role não encontrada' };
    }
    
    // Verificar se as funções existem no banco de dados
    const functions = await Function.findAll({ where: { id: functionIds } });
    const foundFunctionIds = functions.map(f => f.id);
    const missingIds = functionIds.filter(id => !foundFunctionIds.includes(id));
    
    if (missingIds.length > 0) {
      console.error('[assignPermissionsToRole] Funções não encontradas:', missingIds);
      return { 
        success: false, 
        message: `Funções com IDs ${missingIds.join(', ')} não foram encontradas no banco de dados. Certifique-se de usar os IDs reais retornados por createFunction.` 
      };
    }
    
    // Buscar funções existentes da role
    const existingFunctions = await role.getFunctions();
    const existingFunctionIds = existingFunctions.map(f => f.id);
    
    // Filtrar apenas as novas funções que ainda não estão associadas
    const newFunctionIds = functionIds.filter(id => !existingFunctionIds.includes(id));
    
    // Adicionar apenas as novas funções sem remover as existentes
    if (newFunctionIds.length > 0) {
      await role.addFunctions(newFunctionIds);
      return { 
        success: true, 
        message: `${newFunctionIds.length} nova(s) permissão(ões) adicionada(s) à role com sucesso!` 
      };
    } else {
      return { 
        success: true, 
        message: `Todas as permissões já estavam associadas à role.` 
      };
    }
  },

  getModels: async () => {
    const models = await db.sequelize.models;
    const modelList = Object.keys(models).map(key => ({
      name: key,
      className: key,
      tableName: models[key].tableName
    }));
    console.log(modelList);
    return { success: true, data: modelList, message: 'Models listados com sucesso' };
  },

  // Função auxiliar para normalizar nome de model (singular/plural)
  normalizeModelName: async (name) => {
    if (!name) return null;
    
    const nameLower = name.toLowerCase();
    
    // Lista de models disponíveis (buscar do banco ou arquivos)
    const modelsPath = path.join(__dirname, '../../../models');
    const files = fs.readdirSync(modelsPath)
      .filter(file => file !== 'index.js' && file.endsWith('.js'))
      .map(file => file.replace('.js', '').toLowerCase());
    
    // Tentar nome exato primeiro
    if (files.includes(nameLower)) {
      return files.find(f => f === nameLower);
    }
    
    // Tentar plural (adicionar 's' ou 'es')
    const plural1 = nameLower + 's';
    if (files.includes(plural1)) {
      return files.find(f => f === plural1);
    }
    
    const plural2 = nameLower + 'es';
    if (files.includes(plural2)) {
      return files.find(f => f === plural2);
    }
    
    // Tentar singular (remover 's' ou 'es')
    if (nameLower.endsWith('es') && nameLower.length > 2) {
      const singular1 = nameLower.slice(0, -2);
      if (files.includes(singular1)) {
        return files.find(f => f === singular1);
      }
    }
    
    if (nameLower.endsWith('s') && nameLower.length > 1) {
      const singular2 = nameLower.slice(0, -1);
      if (files.includes(singular2)) {
        return files.find(f => f === singular2);
      }
    }
    
    // Casos especiais
    const specialCases = {
      'pessoa': 'pessoas',
      'pessoas': 'pessoas',
      'endereco': 'enderecos',
      'enderecos': 'enderecos'
    };
    
    if (specialCases[nameLower]) {
      const normalized = specialCases[nameLower];
      if (files.includes(normalized)) {
        return files.find(f => f === normalized);
      }
    }
    
    // Se não encontrou, retornar o nome original
    return nameLower;
  },

  getModel: async (params) => {
    const { name } = params;
    
    if (!name) {
      return { success: false, message: 'Nome da model é obrigatório' };
    }

    // Normalizar nome da model (singular/plural)
    // Usar função auxiliar local (não async, apenas síncrona)
    const modelsPath = path.join(__dirname, '../../../models');
    const files = fs.readdirSync(modelsPath)
      .filter(file => file !== 'index.js' && file.endsWith('.js'))
      .map(file => file.replace('.js', '').toLowerCase());
    
    const nameLower = name.toLowerCase();
    let normalizedName = nameLower;
    
    // Tentar nome exato primeiro
    if (files.includes(nameLower)) {
      normalizedName = files.find(f => f === nameLower);
    } else {
      // Tentar plural (adicionar 's' ou 'es')
      const plural1 = nameLower + 's';
      if (files.includes(plural1)) {
        normalizedName = files.find(f => f === plural1);
      } else {
        const plural2 = nameLower + 'es';
        if (files.includes(plural2)) {
          normalizedName = files.find(f => f === plural2);
        } else {
          // Tentar singular (remover 's' ou 'es')
          if (nameLower.endsWith('es') && nameLower.length > 2) {
            const singular1 = nameLower.slice(0, -2);
            if (files.includes(singular1)) {
              normalizedName = files.find(f => f === singular1);
            }
          } else if (nameLower.endsWith('s') && nameLower.length > 1) {
            const singular2 = nameLower.slice(0, -1);
            if (files.includes(singular2)) {
              normalizedName = files.find(f => f === singular2);
            }
          }
          
          // Casos especiais
          const specialCases = {
            'pessoa': 'pessoas',
            'pessoas': 'pessoas',
            'endereco': 'enderecos',
            'enderecos': 'enderecos'
          };
          
          if (specialCases[nameLower] && files.includes(specialCases[nameLower])) {
            normalizedName = files.find(f => f === specialCases[nameLower]);
          }
        }
      }
    }
    
    if (!normalizedName) {
      return { success: false, message: `Model "${name}" não encontrada. Verifique se o nome está correto (singular ou plural).` };
    }

    try {
      // Buscar do banco de dados primeiro usando o nome normalizado
      const modelDef = await ModelDefinition.findOne({ where: { name: normalizedName } });
      
      if (modelDef) {
        // Verificar se definition é válido
        let definitionData;
        try {
          // Se já foi parseado pelo getter, usar diretamente
          definitionData = modelDef.definition;
          
          // Verificar se é um objeto válido
          if (!definitionData || typeof definitionData !== 'object') {
            console.error(`[getModel] Definition inválido para "${name}":`, typeof definitionData, definitionData);
            // Tentar parsear manualmente do raw data
            const rawValue = modelDef.getDataValue('definition');
            if (rawValue) {
              definitionData = JSON.parse(rawValue);
            } else {
              throw new Error('Definition está vazio');
            }
          }
        } catch (parseError) {
          console.error(`[getModel] Erro ao parsear definition para "${name}":`, parseError.message);
          console.error(`[getModel] Raw definition value:`, modelDef.getDataValue('definition')?.substring(0, 200));
          // Fallback para arquivo
          throw new Error('Definition inválido no banco, usando fallback para arquivo');
        }
        
        // Filtrar campos createdAt e updatedAt
        const fields = (definitionData.fields || []).filter(f => 
          f.name !== 'createdAt' && f.name !== 'updatedAt'
        );
        
        // Log para debug
        console.log(`[getModel] Model "${normalizedName}" encontrada no banco com ${fields.length} campos:`, fields.map(f => `${f.name}(${f.type || 'STRING'})`).join(', '));
        
        // Garantir que os dados retornados são serializáveis e válidos
        const responseData = {
          name: normalizedName, // Retornar o nome normalizado
          originalName: name, // Manter o nome original para referência
          className: modelDef.className,
          isSystem: modelDef.isSystem,
          fields: fields.map(f => ({
            name: f.name,
            type: (f.type || 'STRING').toUpperCase()
          })),
          associations: (definitionData.associations || []).map(a => ({
            type: a.type,
            target: a.target || a.model, // Usar target (do parseAssociations) ou model (fallback)
            foreignKey: a.foreignKey,
            through: a.through || null,
            otherKey: a.otherKey || null
          }))
        };
        
        // Validar que o JSON é serializável antes de retornar
        try {
          const testSerialization = JSON.stringify(responseData);
          console.log(`[getModel] Dados serializados com sucesso (${testSerialization.length} chars)`);
        } catch (serializeError) {
          console.error(`[getModel] Erro ao serializar dados da model "${normalizedName}":`, serializeError.message);
          throw new Error(`Erro ao serializar dados da model: ${serializeError.message}`);
        }
        
        return {
          success: true,
          data: responseData,
          message: `Model "${normalizedName}" encontrada com ${fields.length} campos${name !== normalizedName ? ` (normalizada de "${name}")` : ''}`
        };
      }
      
      // Fallback: buscar do arquivo usando o nome normalizado em todos os módulos
      // Usar a função findModelFilePath do modelController se disponível
      let filePath = null;
      let fileInfo = null;
      
      try {
        // Tentar usar findModelFilePath do modelController
        const modelController = require('./modelController');
        if (modelController.findModelFilePath) {
          fileInfo = modelController.findModelFilePath(normalizedName);
          if (fileInfo) {
            filePath = fileInfo.path;
          }
        }
      } catch (e) {
        // Se não disponível, buscar manualmente
        const { loadModules } = require('../utils/moduleLoader');
        const modules = loadModules();
        const modelsPath = path.join(__dirname, '../../../models');
        
        // Buscar na pasta padrão primeiro
        const defaultPath = path.join(modelsPath, `${normalizedName}.js`);
        if (fs.existsSync(defaultPath)) {
          filePath = defaultPath;
        } else {
          // Buscar em cada módulo
          for (const module of modules) {
            if (!module.enabled) continue;
            const moduleModelsPath = path.join(module.path, 'models');
            const moduleFilePath = path.join(moduleModelsPath, `${normalizedName}.js`);
            if (fs.existsSync(moduleFilePath)) {
              filePath = moduleFilePath;
              fileInfo = { path: filePath, module: module.name };
              break;
            }
          }
        }
      }
      
      if (!filePath || !fs.existsSync(filePath)) {
        return { 
          success: false, 
          message: `Model "${name}" não encontrada em nenhum módulo.` 
        };
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Usar parseModelFile do modelController
      const modelInfo = modelController.parseModelFile(content);
      
      // Filtrar campos createdAt e updatedAt
      const fields = (modelInfo.fields || []).filter(f => 
        f.name !== 'createdAt' && f.name !== 'updatedAt'
      );
      
      // Verificar se é model de sistema
      const systemModels = ['user', 'permission', 'organization', 'role', 'system', 'crud', 'function', 'menu', 'menu_items', 'model_definition'];
      const isSystem = systemModels.includes(normalizedName.toLowerCase()) || 
                       content.includes('// SYSTEM MODEL') || 
                       content.includes('/* SYSTEM MODEL */');
      
      // Log para debug
      console.log(`[getModel] Model "${normalizedName}" encontrada no arquivo com ${fields.length} campos:`, fields.map(f => `${f.name}(${f.type || 'STRING'})`).join(', '));
      
      return {
        success: true,
        data: {
          name: normalizedName, // Retornar o nome normalizado
          originalName: name, // Manter o nome original para referência
          className: modelInfo.className,
          isSystem,
          filePath,
          fields: fields.map(f => ({
            name: f.name,
            type: (f.type || 'STRING').toUpperCase()
          })),
          associations: modelInfo.associations || []
        },
        message: `Model "${normalizedName}" encontrada com ${fields.length} campos${name !== normalizedName ? ` (normalizada de "${name}")` : ''}`
      };
    } catch (error) {
      console.error(`[getModel] Erro ao ler model "${normalizedName}":`, error);
      
      // Tentar listar models disponíveis para ajudar no erro
      try {
        const modelsPath = path.join(__dirname, '../../../models');
        const availableModels = fs.readdirSync(modelsPath)
          .filter(file => file !== 'index.js' && file.endsWith('.js'))
          .map(file => file.replace('.js', ''));
        
        return { 
          success: false, 
          message: `Erro ao ler model "${name}": ${error.message}. Modelos disponíveis: ${availableModels.join(', ')}` 
        };
      } catch (listError) {
        return { success: false, message: `Erro ao ler model: ${error.message}` };
      }
    }
  },

  getSystems: async () => {
    const systems = await System.findAll({ attributes: ['id', 'name', 'sigla'] });
    return { success: true, data: systems, message: 'Sistemas listados com sucesso' };
  },

  getRoles: async (params) => {
    const { id_system } = params || {};
    const where = id_system ? { id_system } : {};
    const roles = await Role.findAll({ where, attributes: ['id', 'name', 'id_system'] });
    return { success: true, data: roles, message: 'Roles listadas com sucesso' };
  },

  createModule: async (params) => {
    try {
      const moduleController = require('./moduleController');
      const result = await moduleController.createModuleInternal(params);
      
      return { 
        success: true, 
        data: result.module, 
        message: result.message || 'Módulo criado com sucesso!' 
      };
    } catch (error) {
      console.error('[createModule] Erro:', error);
      return { 
        success: false, 
        message: error.message || 'Erro ao criar módulo' 
      };
    }
  },

  getModules: async () => {
    try {
      const moduleController = require('./moduleController');
      const modules = await moduleController.getAllModules({}, {
        json: (data) => data
      });
      
      return { 
        success: true, 
        data: modules, 
        message: `${modules.length} módulo(s) encontrado(s)` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Erro ao listar módulos: ${error.message}` 
      };
    }
  },

  createModel: async (params) => {
    const { name, className, fields, associations, options, module } = params;
    
    if (!name || !className) {
      return { success: false, message: 'Nome e className são obrigatórios' };
    }
    
    // Se módulo especificado, verificar se existe ou criar
    let targetModule = module;
    if (module) {
      const { loadModules } = require('../utils/moduleLoader');
      const modules = loadModules();
      const moduleExists = modules.find(m => m.name === module && m.enabled);
      
      if (!moduleExists) {
        // Tentar criar o módulo automaticamente
        const createModuleResult = await availableFunctions.createModule({
          name: module,
          title: module.charAt(0).toUpperCase() + module.slice(1).replace(/_/g, ' '),
          description: `Módulo criado automaticamente para a model ${className}`,
          version: '1.0.0',
          isSystem: false
        });
        
        if (!createModuleResult.success) {
          return { 
            success: false, 
            message: `Módulo "${module}" não existe e não foi possível criá-lo: ${createModuleResult.message}` 
          };
        }
      }
    }

    // Determinar caminho baseado no módulo
    let modelsPath, filePath;
    if (targetModule) {
      const modulePath = path.join(__dirname, '../../../modules', targetModule);
      const modelsDirPath = path.join(modulePath, 'models');
      
      // Criar diretório models se não existir
      if (!fs.existsSync(modelsDirPath)) {
        try {
          fs.mkdirSync(modelsDirPath, { recursive: true });
          console.log(`[createModel] Diretório models criado para o módulo "${targetModule}"`);
        } catch (error) {
          return { 
            success: false, 
            message: `Erro ao criar diretório de models do módulo "${targetModule}": ${error.message}` 
          };
      }
      }
      
      modelsPath = modelsDirPath;
      filePath = path.join(modelsDirPath, `${name}.js`);
    } else {
      modelsPath = path.join(__dirname, '../../../models');
      // Criar diretório models padrão se não existir
      if (!fs.existsSync(modelsPath)) {
        try {
          fs.mkdirSync(modelsPath, { recursive: true });
          console.log(`[createModel] Diretório models padrão criado`);
        } catch (error) {
          return { 
            success: false, 
            message: `Erro ao criar diretório de models padrão: ${error.message}` 
          };
        }
      }
      filePath = path.join(modelsPath, `${name}.js`);
    }
    
    if (fs.existsSync(filePath)) {
      return { success: false, message: 'Model já existe' };
    }

    // Filtrar campos válidos - remover campos que são associações ou tipos inválidos
    const validFieldTypes = ['STRING', 'INTEGER', 'BIGINT', 'FLOAT', 'DOUBLE', 'DECIMAL', 'BOOLEAN', 
                             'DATE', 'DATEONLY', 'TIME', 'TEXT', 'UUID', 'JSON', 'JSONB', 'ENUM', 
                             'BLOB', 'GEOMETRY', 'ARRAY'];
    const filteredFields = (fields || []).filter(field => {
      if (!field || !field.name || !field.type) return false;
      const fieldTypeUpper = String(field.type).toUpperCase();
      // Rejeitar tipos que são associações
      if (['HASMANY', 'BELONGSTO', 'BELONGSTOMANY', 'HASONE'].includes(fieldTypeUpper)) {
        console.warn(`[createModel] Campo "${field.name}" rejeitado: tipo "${field.type}" é uma associação, não um campo`);
        return false;
      }
      // Aceitar apenas tipos válidos do Sequelize
      return validFieldTypes.includes(fieldTypeUpper);
    });
    
    // Adicionar campos foreign key para associações belongsTo que não estão em fields
    if (associations && associations.length > 0) {
      const belongsToAssociations = associations.filter(a => a.type === 'belongsTo');
      belongsToAssociations.forEach(assoc => {
        const foreignKey = assoc.foreignKey || `${assoc.target.toLowerCase()}_id`;
        // Verificar se o campo já existe em filteredFields
        const fieldExists = filteredFields.some(f => f.name === foreignKey);
        if (!fieldExists) {
          // Verificar também se está em fields original
          const fieldExistsOriginal = (fields || []).some(f => f.name === foreignKey);
          if (!fieldExistsOriginal) {
            // Adicionar campo de foreign key
            filteredFields.push({
              name: foreignKey,
              type: 'INTEGER',
              allowNull: assoc.allowNull !== false,
              references: {
                model: assoc.target,
                key: 'id'
              }
            });
            console.log(`[createModel] Campo foreign key "${foreignKey}" adicionado automaticamente para associação belongsTo com ${assoc.target}`);
          }
        }
      });
    }

    // Gerar tableName com prefixo do módulo se fornecido
    let finalOptions = { ...options };
    if (targetModule && !finalOptions.tableName) {
      // Gerar prefixo do módulo (primeiras 3 letras + _)
      const modulePrefix = targetModule.substring(0, 3).toLowerCase() + '_';
      const modelName = className || name.charAt(0).toUpperCase() + name.slice(1);
      let tableName = modelName.toLowerCase();
      // Verificar se já está no plural
      if (!tableName.endsWith('s') && !tableName.endsWith('es')) {
        tableName = `${tableName}s`;
      }
      finalOptions.tableName = modulePrefix + tableName;
    }
    
    // Usar generateModelFile do modelController com campos filtrados
    const content = modelController.generateModelFile(name, className, filteredFields, associations || [], finalOptions, targetModule);
    
    // Salvar arquivo no módulo correto
    fs.writeFileSync(filePath, content, 'utf8');
    
    // Salvar definição no banco de dados
    try {
      await ModelDefinition.upsert({
        name: name,
        className: className,
        definition: {
          fields: fields || [],
          associations: associations || [],
          options: options || {}
        },
        isSystem: false
      });
    } catch (dbError) {
      console.error('Erro ao salvar definição no banco:', dbError);
      // Não falhar a criação se o banco não estiver disponível
    }
    
    // Criar migration automaticamente após criar a model
    let migrationResult = null;
    try {
      console.log(`[createModel] Criando migration automaticamente para ${name}...`);
      migrationResult = await availableFunctions.createMigration({
        name,
        className,
        fields: filteredFields, // Usar campos filtrados (incluindo foreign keys adicionados)
        associations: associations || [],
        options: finalOptions,
        isNew: true,
        module: targetModule
      });
      
      if (migrationResult.success) {
        console.log(`[createModel] Migration criada com sucesso: ${migrationResult.message}`);
      } else {
        console.warn(`[createModel] Erro ao criar migration: ${migrationResult.message}`);
      }
    } catch (migrationError) {
      console.error(`[createModel] Erro ao criar migration automaticamente:`, migrationError.message);
      // Não falhar a criação da model se a migration falhar
    }
    
    // Criar seeder automaticamente após criar a model
    let seederResult = null;
    try {
      console.log(`[createModel] Criando seeder automaticamente para ${name}...`);
      
      // Gerar dados de exemplo baseados nos campos da model
      const sampleData = [];
      const fieldNames = filteredFields
        .filter(f => !f.primaryKey && f.name !== 'createdAt' && f.name !== 'updatedAt' && !f.name.includes('_id'))
        .map(f => f.name);
      
      // Criar 2-3 registros de exemplo
      for (let i = 1; i <= 3; i++) {
        const record = {};
        fieldNames.forEach(fieldName => {
          const field = filteredFields.find(f => f.name === fieldName);
          if (field) {
            if (field.type.toUpperCase() === 'STRING' || field.type.toUpperCase() === 'TEXT') {
              record[fieldName] = `Exemplo ${i}`;
            } else if (field.type.toUpperCase() === 'INTEGER' || field.type.toUpperCase() === 'BIGINT') {
              record[fieldName] = i;
            } else if (field.type.toUpperCase() === 'BOOLEAN') {
              record[fieldName] = i % 2 === 0;
            } else if (field.type.toUpperCase() === 'DATE' || field.type.toUpperCase() === 'DATEONLY') {
              record[fieldName] = new Date().toISOString().split('T')[0];
            } else {
              record[fieldName] = null;
            }
          }
        });
        if (Object.keys(record).length > 0) {
          sampleData.push(record);
        }
      }
      
      if (sampleData.length > 0) {
        seederResult = await createSeederInternal({
          name,
          className,
          module: targetModule,
          tableName: finalOptions.tableName,
          data: sampleData
        });
        
        if (seederResult.success) {
          console.log(`[createModel] Seeder criado com sucesso: ${seederResult.message}`);
        } else {
          console.warn(`[createModel] Erro ao criar seeder: ${seederResult.message}`);
        }
      } else {
        console.log(`[createModel] Seeder não criado: nenhum campo válido para dados de exemplo`);
      }
    } catch (seederError) {
      console.error(`[createModel] Erro ao criar seeder automaticamente:`, seederError.message);
      // Não falhar a criação da model se o seeder falhar
    }
    
    const messages = [`Model "${className}" criada com sucesso!`];
    if (migrationResult && migrationResult.success) {
      messages.push(`Migration criada automaticamente.`);
    }
    if (seederResult && seederResult.success) {
      messages.push(`Seeder criado automaticamente com dados de exemplo.`);
    }
    
    return { 
      success: true, 
      data: { 
        name, 
        className, 
        filePath,
        migration: migrationResult,
        seeder: seederResult
      }, 
      message: messages.join(' ') 
    };
  },

  updateModel: async (params) => {
    const { name, className, fields, associations, options } = params;
    
    if (!name || !className) {
      return { success: false, message: 'Nome e className são obrigatórios' };
    }

    // Normalizar nome da model (singular/plural) - priorizar arquivo existente
    const modelsPath = path.join(__dirname, '../../../models');
    const files = fs.readdirSync(modelsPath)
      .filter(file => file !== 'index.js' && file.endsWith('.js'))
      .map(file => file.replace('.js', '').toLowerCase());
    
    const nameLower = name.toLowerCase();
    let normalizedName = null;
    
    // Tentar nome exato primeiro
    if (files.includes(nameLower)) {
      normalizedName = files.find(f => f === nameLower);
    } else {
      // Tentar plural (adicionar 's' ou 'es')
      const plural1 = nameLower + 's';
      if (files.includes(plural1)) {
        normalizedName = files.find(f => f === plural1);
      } else {
        const plural2 = nameLower + 'es';
        if (files.includes(plural2)) {
          normalizedName = files.find(f => f === plural2);
        } else {
          // Tentar singular (remover 's' ou 'es')
          if (nameLower.endsWith('es') && nameLower.length > 2) {
            const singular1 = nameLower.slice(0, -2);
            if (files.includes(singular1)) {
              normalizedName = files.find(f => f === singular1);
            }
          } else if (nameLower.endsWith('s') && nameLower.length > 1) {
            const singular2 = nameLower.slice(0, -1);
            if (files.includes(singular2)) {
              normalizedName = files.find(f => f === singular2);
            }
          }
        }
      }
    }
    
    // Se não encontrou, tentar casos especiais (mas verificar ambos os lados)
    if (!normalizedName) {
      const specialCasesMap = {
        'pessoa': ['pessoas', 'pessoa'],
        'pessoas': ['pessoa', 'pessoas'],
        'endereco': ['enderecos', 'endereco'],
        'enderecos': ['endereco', 'enderecos']
      };
      
      const casesToTry = specialCasesMap[nameLower] || [nameLower];
      for (const caseName of casesToTry) {
        if (files.includes(caseName)) {
          normalizedName = files.find(f => f === caseName);
          break;
        }
      }
    }
    
    // Se ainda não encontrou, usar o nome original
    if (!normalizedName) {
      normalizedName = nameLower;
    }

    const filePath = path.join(modelsPath, `${normalizedName}.js`);
    
    console.log(`[updateModel] Nome original: "${name}", Normalizado: "${normalizedName}", Arquivo: "${filePath}"`);
    console.log(`[updateModel] Arquivos disponíveis:`, files);
    
    if (!fs.existsSync(filePath)) {
      return { 
        success: false, 
        message: `Model "${name}" não encontrada. Arquivo esperado: "${filePath}". Modelos disponíveis: ${files.map(f => f).join(', ')}` 
      };
    }

    // Verificar se é uma model de sistema (usar normalizedName)
    const content = fs.readFileSync(filePath, 'utf8');
    const systemModels = ['user', 'permission', 'organization', 'role', 'system', 'crud', 'function', 'menu', 'menu_items', 'model_definition'];
    if (systemModels.includes(normalizedName.toLowerCase()) || 
        content.includes('// SYSTEM MODEL') || 
        content.includes('/* SYSTEM MODEL */')) {
      return { 
        success: false, 
        message: `Não é possível editar a model "${name}" pois ela é uma model de sistema` 
      };
    }

    // Buscar model atual para fazer merge inteligente
    let existingFields = [];
    let existingAssociations = [];
    let existingOptions = {};
    
    try {
      // Tentar buscar do banco primeiro
      const modelDef = await ModelDefinition.findOne({ where: { name: normalizedName } });
      if (modelDef && modelDef.definition) {
        existingFields = modelDef.definition.fields || [];
        existingAssociations = modelDef.definition.associations || [];
        existingOptions = modelDef.definition.options || {};
      } else {
        // Fallback: parsear do arquivo
        const modelInfo = modelController.parseModelFile(content);
        existingFields = modelInfo.fields || [];
        existingAssociations = modelInfo.associations || [];
        existingOptions = modelInfo.options || {};
      }
    } catch (error) {
      console.log(`[updateModel] Erro ao buscar model existente, usando apenas novos dados: ${error.message}`);
    }

    // Função auxiliar para verificar se duas relações são equivalentes
    function areAssociationsEqual(assoc1, assoc2) {
      return assoc1.type === assoc2.type && 
             assoc1.target === assoc2.target && 
             assoc1.foreignKey === assoc2.foreignKey;
    }

    // Função auxiliar para verificar se duas relações conflitam
    function doAssociationsConflict(assoc1, assoc2) {
      // Conflito se têm mesmo tipo e target mas foreignKey diferente
      if (assoc1.type === assoc2.type && assoc1.target === assoc2.target) {
        return assoc1.foreignKey !== assoc2.foreignKey;
      }
      // Conflito se têm mesmo foreignKey mas target diferente
      if (assoc1.foreignKey && assoc2.foreignKey && assoc1.foreignKey === assoc2.foreignKey) {
        return assoc1.target !== assoc2.target;
      }
      return false;
    }

    // Filtrar campos válidos - remover campos que são associações ou tipos inválidos
    const validFieldTypes = ['STRING', 'INTEGER', 'BIGINT', 'FLOAT', 'DOUBLE', 'DECIMAL', 'BOOLEAN', 
                             'DATE', 'DATEONLY', 'TIME', 'TEXT', 'UUID', 'JSON', 'JSONB', 'ENUM', 
                             'BLOB', 'GEOMETRY', 'ARRAY'];
    
    // Filtrar campos novos antes de mesclar
    const filteredNewFields = (fields || []).filter(field => {
      if (!field || !field.name || !field.type) return false;
      const fieldTypeUpper = String(field.type).toUpperCase();
      // Rejeitar tipos que são associações
      if (['HASMANY', 'BELONGSTO', 'BELONGSTOMANY', 'HASONE'].includes(fieldTypeUpper)) {
        console.warn(`[updateModel] Campo "${field.name}" rejeitado: tipo "${field.type}" é uma associação, não um campo`);
        return false;
      }
      // Aceitar apenas tipos válidos do Sequelize
      return validFieldTypes.includes(fieldTypeUpper);
    });
    
    // Mesclar campos: manter campos existentes que não foram fornecidos novamente
    const mergedFields = [];
    const newFieldNames = new Set(filteredNewFields.map(f => f.name));
    
    // Adicionar campos existentes que não foram substituídos
    for (const existingField of existingFields) {
      if (!newFieldNames.has(existingField.name)) {
        mergedFields.push(existingField);
      }
    }
    
    // Adicionar/atualizar campos novos ou modificados (já filtrados)
    if (filteredNewFields.length > 0) {
      mergedFields.push(...filteredNewFields);
    }

    // Mesclar associações: manter associações existentes que não conflitem
    const mergedAssociations = [];
    const newAssociations = associations || [];
    
    // Adicionar associações existentes que não conflitem com as novas
    for (const existingAssoc of existingAssociations) {
      let hasConflict = false;
      let isReplaced = false;
      
      for (const newAssoc of newAssociations) {
        if (areAssociationsEqual(existingAssoc, newAssoc)) {
          // Mesma associação, usar a nova (pode ter sido atualizada)
          isReplaced = true;
          break;
        }
        if (doAssociationsConflict(existingAssoc, newAssoc)) {
          // Conflito detectado, não manter a existente
          hasConflict = true;
          break;
        }
      }
      
      if (!hasConflict && !isReplaced) {
        mergedAssociations.push(existingAssoc);
      }
    }
    
    // Adicionar novas associações
    mergedAssociations.push(...newAssociations);

    // Mesclar options: manter opções existentes, atualizar com novas
    const mergedOptions = {
      ...existingOptions,
      ...(options || {})
    };

    // Usar generateModelFile do modelController com dados mesclados
    console.log(`[updateModel] Gerando arquivo com ${mergedFields.length} campos e ${mergedAssociations.length} associações`);
    console.log(`[updateModel] Campos:`, mergedFields.map(f => f.name).join(', '));
    console.log(`[updateModel] Associações:`, mergedAssociations.map(a => `${a.type}(${a.target})`).join(', '));
    
    const newContent = modelController.generateModelFile(normalizedName, className, mergedFields, mergedAssociations, mergedOptions);
    
    // Salvar arquivo
    try {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`[updateModel] Arquivo "${filePath}" atualizado com sucesso (${newContent.length} bytes)`);
      
      // Verificar se o arquivo foi realmente escrito
      const verifyContent = fs.readFileSync(filePath, 'utf8');
      const verifyParsed = modelController.parseModelFile(verifyContent);
      console.log(`[updateModel] Verificação: arquivo tem ${verifyParsed.fields.length} campos e ${verifyParsed.associations.length} associações`);
    } catch (writeError) {
      console.error(`[updateModel] Erro ao escrever arquivo "${filePath}":`, writeError);
      return { 
        success: false, 
        message: `Erro ao salvar arquivo: ${writeError.message}` 
      };
    }
    
    // Atualizar definição no banco de dados (usar normalizedName e dados mesclados)
    try {
      await ModelDefinition.upsert({
        name: normalizedName,
        className: className,
        definition: {
          fields: mergedFields,
          associations: mergedAssociations,
          options: mergedOptions
        },
        isSystem: false
      });
      console.log(`[updateModel] Definição no banco atualizada para "${normalizedName}" (${mergedFields.length} campos, ${mergedAssociations.length} associações)`);
    } catch (dbError) {
      console.error('[updateModel] Erro ao atualizar definição no banco:', dbError);
      // Não falhar a atualização se o banco não estiver disponível
    }
    
    return { 
      success: true, 
      data: { name: normalizedName, originalName: name, className, filePath },
      message: `Model "${className}" atualizada com sucesso${name !== normalizedName ? ` (normalizada de "${name}")` : ''}!` 
    };
  },

  deleteModel: async (params) => {
    const { name } = params;
    
    if (!name) {
      return { success: false, message: 'Nome da model é obrigatório' };
    }

    const modelsPath = path.join(__dirname, '../../../models');
    const filePath = path.join(modelsPath, `${name}.js`);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, message: 'Model não encontrada' };
    }
    
    // Verificar se é uma model de sistema
    const systemModels = ['user', 'permission', 'organization', 'role', 'system', 'crud', 'function', 'menu', 'menu_items', 'model_definition'];
    if (systemModels.includes(name.toLowerCase())) {
      return { success: false, message: 'Não é possível excluir models de sistema' };
    }
    
    // Ler o conteúdo para verificar se tem indicador de sistema
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('// SYSTEM MODEL') || content.includes('/* SYSTEM MODEL */')) {
      return { success: false, message: 'Não é possível excluir models de sistema' };
    }
    
    // Excluir arquivo
    fs.unlinkSync(filePath);
    
    // Excluir definição do banco de dados
    try {
      await ModelDefinition.destroy({ where: { name } });
    } catch (dbError) {
      console.error('Erro ao excluir definição do banco:', dbError);
      // Não falhar se o banco não estiver disponível
    }
    
    return { 
      success: true, 
      message: `Model "${name}" excluída com sucesso!` 
    };
  },

  generateSeeder: async (params) => {
    return await createSeederInternal(params);
  },

  // Alias para generateSeeder (compatibilidade)
  createSeeder: async (params) => {
    return await createSeederInternal(params);
  },

  runSeeder: async (params) => {
    try {
      const { execSync } = require('child_process');
      // Executar no diretório do módulo system onde está o package.json
      const systemPath = path.join(__dirname, '..');
      const result = execSync('npm run db:seed', { 
        cwd: systemPath,
        encoding: 'utf8'
      });
      return { 
        success: true, 
        data: { output: result },
        message: 'Seeders executados com sucesso!' 
      };
    } catch (error) {
      console.error('Erro ao executar seeders:', error);
      return { 
        success: false, 
        message: `Erro ao executar seeders: ${error.message}`,
        data: { output: error.stdout || error.stderr || error.message }
      };
    }
  }
};

// Chamar função disponível
async function callFunction(functionName, params) {
  const allFunctions = getAvailableFunctions();
  
  // Log para debug
  if (!allFunctions[functionName]) {
    console.log(`[callFunction] Função "${functionName}" não encontrada`);
    console.log(`[callFunction] Funções disponíveis (primeiras 20):`, Object.keys(allFunctions).slice(0, 20));
    // Tentar encontrar função com nome similar (case-insensitive)
    const foundFunction = Object.keys(allFunctions).find(name => 
      name.toLowerCase() === functionName.toLowerCase()
    );
    if (foundFunction) {
      console.log(`[callFunction] Função similar encontrada: "${foundFunction}"`);
      return await allFunctions[foundFunction](params);
    }
    return { success: false, message: `Função "${functionName}" não encontrada` };
  }
  
  // Log detalhado para createCrud
  if (functionName === 'createCrud') {
    console.log(`[callFunction] Executando ${functionName} com params:`, {
      name: params.name,
      title: params.title,
      resource: params.resource,
      endpoint: params.endpoint,
      hasConfig: !!params.config,
      configType: typeof params.config,
      configKeys: params.config && typeof params.config === 'object' ? Object.keys(params.config) : 'N/A'
    });
  }
  
  try {
    const result = await allFunctions[functionName](params);
    
    // Validar que o resultado tem a estrutura esperada
    if (!result || typeof result !== 'object') {
      console.error(`[callFunction] Resultado inválido da função ${functionName}:`, result);
      return { success: false, message: `Função ${functionName} retornou resultado inválido` };
    }
    
    // Garantir que sempre tenha success e message
    if (typeof result.success !== 'boolean') {
      console.error(`[callFunction] Resultado sem campo 'success' da função ${functionName}:`, result);
      return { success: false, message: result.message || `Função ${functionName} retornou resultado sem campo 'success'` };
    }
    
    // Log do resultado para createCrud
    if (functionName === 'createCrud') {
      console.log(`[callFunction] Resultado de ${functionName}:`, {
        success: result.success,
        message: result.message,
        hasData: !!result.data,
        dataId: result.data?.id
      });
    }
    
    return result;
  } catch (error) {
    console.error(`[callFunction] Erro ao executar função ${functionName}:`, error);
    console.error(`[callFunction] Tipo do erro:`, typeof error);
    console.error(`[callFunction] Erro completo:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
    if (error.stack) {
      console.error(`[callFunction] Stack trace:`, error.stack);
    }
    if (functionName === 'createCrud' || functionName === 'getCrud') {
      console.error(`[callFunction] Params recebidos:`, JSON.stringify(params, null, 2));
    }
    
    // Garantir que sempre retorne uma mensagem válida
    const errorMessage = error?.message || error?.toString() || String(error) || 'Erro desconhecido';
    return { success: false, message: `Erro ao executar ${functionName}: ${errorMessage}` };
  }
}

// Chat com API de IA (OpenAI ou DeepSeek)
async function chatIA(req, res) {
  // Verificar se o cliente quer streaming (via header ou query param)
  const useStreaming = req.headers.accept === 'text/event-stream' || req.query.stream === 'true';
  
  if (useStreaming) {
    // Configurar headers para SSE e CORS
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Desabilitar buffering do nginx
    
    // Função auxiliar para enviar eventos SSE
    const sendEvent = (type, data) => {
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    try {
      await chatIAWithStreaming(req, res, sendEvent);
    } catch (error) {
      sendEvent('error', { message: error.message });
      res.end();
    }
    return;
  }
  
  // Código original sem streaming
  try {
    const { message, conversation: frontendConversation } = req.body;
    // Obter ID do usuário do token JWT (o token contém { id, name, email, roles, functions })
    const userId = String(req.user?.id || 'anonymous');
    
    // Configuração do provedor de IA
    const AI_PROVIDER = process.env.AI_PROVIDER || 'openai'; // 'openai' ou 'deepseek'
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    
    // URLs e modelos padrão para cada provedor
    const AI_CONFIG = {
      openai: {
        apiKey: OPENAI_API_KEY,
        apiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
      },
      deepseek: {
        apiKey: DEEPSEEK_API_KEY,
        apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
      }
    };
    
    const provider = AI_PROVIDER.toLowerCase();
    const config = AI_CONFIG[provider];
    
    if (!config) {
      return res.status(500).json({ 
        message: `Provedor de IA "${provider}" não suportado. Use "openai" ou "deepseek".` 
      });
    }
    
    if (!config.apiKey) {
      return res.status(500).json({ 
        message: `${provider.toUpperCase()}_API_KEY não configurada no ambiente` 
      });
    }

    const systemPrompt = loadSystemPrompt();

    // Usar histórico do frontend se fornecido, senão usar sessão em memória
    let conversation;
    if (frontendConversation && Array.isArray(frontendConversation) && frontendConversation.length > 0) {
      // Usar histórico do frontend (inclui functionCalls)
      conversation = [...frontendConversation];
    } else {
      // Obter ou criar sessão de conversa para o usuário
      if (!conversationSessions.has(userId)) {
        conversationSessions.set(userId, []);
      }
      conversation = conversationSessions.get(userId);
    }

    // Adicionar mensagem do usuário à sessão
    conversation.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // Função auxiliar para formatar resultados de funções para a IA
    function formatFunctionResults(functionCalls) {
      if (!functionCalls || functionCalls.length === 0) return '';
      
      let formatted = '\n\n**Resultados das funções executadas:**\n';
      functionCalls.forEach((fc, idx) => {
        formatted += `\n${idx + 1}. Função: ${fc.function}\n`;
        formatted += `   Parâmetros: ${JSON.stringify(fc.params, null, 2)}\n`;
        formatted += `   Resultado: ${fc.result.success ? '✅ Sucesso' : '❌ Erro'}\n`;
        formatted += `   Mensagem: ${fc.result.message || 'N/A'}\n`;
        // Incluir dados retornados para que a IA possa usá-los
        if (fc.result.success && fc.result.data) {
          try {
            // Tentar serializar os dados de forma segura
            const serializedData = JSON.stringify(fc.result.data, null, 2);
            formatted += `   Dados retornados: ${serializedData}\n`;
          } catch (serializeError) {
            console.error(`[formatFunctionResults] Erro ao serializar dados da função ${fc.function}:`, serializeError.message);
            formatted += `   Dados retornados: [Erro ao serializar: ${serializeError.message}]\n`;
          }
        }
        
        // Se houver dados retornados, incluir de forma resumida (apenas se não foi incluído acima)
        if (fc.result.data && !fc.result.success) {
          try {
            if (Array.isArray(fc.result.data)) {
              formatted += `   Dados retornados: Array com ${fc.result.data.length} itens\n`;
              if (fc.result.data.length > 0 && fc.result.data.length <= 10) {
                formatted += `   Conteúdo: ${JSON.stringify(fc.result.data, null, 2)}\n`;
              } else if (fc.result.data.length > 0) {
                formatted += `   Primeiros itens: ${JSON.stringify(fc.result.data.slice(0, 3), null, 2)}...\n`;
              }
            } else if (typeof fc.result.data === 'object') {
              formatted += `   Dados retornados: ${JSON.stringify(fc.result.data, null, 2)}\n`;
            } else {
              formatted += `   Dados retornados: ${fc.result.data}\n`;
            }
          } catch (serializeError) {
            console.error(`[formatFunctionResults] Erro ao serializar dados da função ${fc.function}:`, serializeError.message);
            formatted += `   Dados retornados: [Erro ao serializar]\n`;
          }
        }
      });
      formatted += '\n';
      
      return formatted;
    }

    // Construir mensagens para a API (incluindo histórico com resultados de funções)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation.map(msg => {
        let content = msg.content;
        // Se a mensagem tiver resultados de funções, adicionar ao conteúdo
        if (msg.functionCalls && msg.functionCalls.length > 0) {
          content += formatFunctionResults(msg.functionCalls);
        }
        return { role: msg.role, content: content };
      })
    ];

    // Chamar API de IA usando https/http nativo
    const url = new URL(config.apiUrl);
    const requestData = JSON.stringify({
      model: config.model,
      messages: messages,
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      stream: false  // Streaming será implementado em versão futura
    });

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Length': Buffer.byteLength(requestData)
        }
    };

    const apiResponse = await new Promise((resolve, reject) => {
      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Erro ao parsear resposta da API ${provider}: ${e.message}`));
            }
          } else {
            reject(new Error(`${provider.toUpperCase()} API retornou status ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(requestData);
      req.end();
    });

    const aiResponse = apiResponse.choices[0]?.message?.content || 'Sem resposta da IA';

    // Verificar se a resposta contém chamadas de função
    // Suporta múltiplos formatos: ```json {...} ``` ou apenas {...}
    const functionCalls = [];
    
    // Função auxiliar para extrair e parsear JSON usando contagem de chaves
    // Função auxiliar para encontrar JSON completo
    function findCompleteJSON(str) {
      let startIdx = str.indexOf('{');
      if (startIdx === -1) return null;
      
      let braceCount = 0;
      let bracketCount = 0; // Para arrays dentro do JSON
      let inString = false;
      let escapeNext = false;
      
      for (let i = startIdx; i < str.length; i++) {
        const char = str[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') braceCount++;
          if (char === '}') {
            braceCount--;
            if (braceCount === 0 && bracketCount === 0) {
              return str.substring(startIdx, i + 1);
            }
          }
          if (char === '[') bracketCount++;
          if (char === ']') bracketCount--;
        }
      }
      
      return null;
    }
    
    function extractAndParseJSON(text) {
      if (!text || typeof text !== 'string') {
        return null;
      }
      
      // Limpar o texto primeiro
      let cleaned = text.trim();
      
      // Remover backticks que possam ter sobrado
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/g, '');
      
      // Tentar encontrar JSON completo
      const completeJSON = findCompleteJSON(cleaned);
      if (completeJSON) {
        // Verificar se o JSON está completo (termina com })
        if (!completeJSON.trim().endsWith('}')) {
          chatLog(`[extractAndParseJSON] JSON parece incompleto (não termina com }):`, completeJSON.substring(Math.max(0, completeJSON.length - 50)));
          return null;
        }
        
        try {
          const parsed = JSON.parse(completeJSON);
          
          // PRIORIDADE 1: Formato MCP (JSON-RPC 2.0)
          // No formato MCP, pode ser "params" ou "arguments" dependendo de como a IA gerou
          const mcpParams = parsed.params || parsed.arguments;
          if (parsed.jsonrpc === '2.0' && parsed.method === 'tools/call' && mcpParams && mcpParams.name) {
            return {
              function: mcpParams.name,
              params: mcpParams.arguments || {}
            };
          }
          
          // PRIORIDADE 2: Formato antigo (compatibilidade)
          if (parsed.function && typeof parsed.function === 'string') {
            return {
              function: parsed.function,
              params: parsed.params || {}
            };
          }
        } catch (e) {
          chatLog(`[extractAndParseJSON] Erro ao parsear JSON completo: ${e.message}`);
          chatLog(`[extractAndParseJSON] JSON encontrado (${completeJSON.length} chars):`, completeJSON.substring(0, 200));
          chatLog(`[extractAndParseJSON] Últimos 50 chars:`, completeJSON.substring(Math.max(0, completeJSON.length - 50)));
        }
      }
      
      // Fallback: tentar parsear diretamente
      try {
        const parsed = JSON.parse(cleaned);
        
        // PRIORIDADE 1: Formato MCP (JSON-RPC 2.0)
        // No formato MCP, pode ser "params" ou "arguments" dependendo de como a IA gerou
        const mcpParams = parsed.params || parsed.arguments;
        if (parsed.jsonrpc === '2.0' && parsed.method === 'tools/call' && mcpParams && mcpParams.name) {
          return {
            function: mcpParams.name,
            params: mcpParams.arguments || {}
          };
        }
        
        // PRIORIDADE 2: Formato antigo (compatibilidade)
        if (parsed.function && typeof parsed.function === 'string') {
          return {
            function: parsed.function,
            params: parsed.params || {}
          };
        }
      } catch (e) {
        // Última tentativa: normalizar espaços
        try {
          const normalized = cleaned
            .replace(/\n\s*/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\s*{\s*/g, '{')
            .replace(/\s*}\s*/g, '}')
            .replace(/\s*:\s*/g, ':')
            .replace(/\s*,\s*/g, ',');
          const parsed = JSON.parse(normalized);
          
          // PRIORIDADE 1: Formato MCP (JSON-RPC 2.0)
          // No formato MCP, pode ser "params" ou "arguments" dependendo de como a IA gerou
          const mcpParams = parsed.params || parsed.arguments;
          if (parsed.jsonrpc === '2.0' && parsed.method === 'tools/call' && mcpParams && mcpParams.name) {
            return {
              function: mcpParams.name,
              params: mcpParams.arguments || {}
            };
          }
          
          // PRIORIDADE 2: Formato antigo (compatibilidade)
          if (parsed.function && typeof parsed.function === 'string') {
            return {
              function: parsed.function,
              params: parsed.params || {}
            };
          }
        } catch (e3) {
          chatLog(`[extractAndParseJSON] Erro ao parsear JSON: ${e3.message}`);
          chatLog(`[extractAndParseJSON] Texto original (${cleaned.length} chars): ${cleaned.substring(0, 300)}`);
        }
      }
      
      return null;
    }
    
    // Padrão 1: ```json {...} ``` - Encontrar início e usar findCompleteJSON para capturar JSON completo
    // Isso é necessário porque JSONs grandes podem conter ``` dentro do texto da resposta
    const jsonBlockStartPattern = /```json\s*\n?/gi;
    let blockStart;
    jsonBlockStartPattern.lastIndex = 0;
    
    while ((blockStart = jsonBlockStartPattern.exec(aiResponse)) !== null) {
      const startPos = blockStart.index + blockStart[0].length;
      // Buscar o JSON completo usando findCompleteJSON primeiro
      // Isso garante que capturamos o JSON inteiro mesmo se houver ``` dentro do texto
      const remainingText = aiResponse.substring(startPos);
      const completeJSON = findCompleteJSON(remainingText);
      
      // Se encontramos um JSON completo, verificar se ele termina antes do próximo ```
      if (completeJSON) {
        const jsonEndPos = startPos + completeJSON.length;
        // Verificar se há um ``` após o JSON (pode estar em outra linha)
        const textAfterJSON = aiResponse.substring(jsonEndPos, Math.min(jsonEndPos + 10, aiResponse.length));
        // Se não há ``` imediatamente após, o JSON pode estar completo
        // Continuar processando mesmo assim
      }
      
      if (completeJSON) {
        // Log para debug - verificar se o JSON está completo
        console.log(`[Padrão 1] JSON encontrado (${completeJSON.length} chars)`);
        console.log(`[Padrão 1] Primeiros 100 chars:`, completeJSON.substring(0, 100));
        console.log(`[Padrão 1] Últimos 50 chars:`, completeJSON.substring(Math.max(0, completeJSON.length - 50)));
        
        // Verificar se tem formato MCP ou formato antigo e se está completo (começa com { e termina com })
        const isMCPFormat = completeJSON.includes('"jsonrpc"') && completeJSON.includes('"method"') && completeJSON.includes('"tools/call"');
        const isOldFormat = completeJSON.includes('"function"');
        
        if ((isMCPFormat || isOldFormat) && completeJSON.trim().startsWith('{') && completeJSON.trim().endsWith('}')) {
          const jsonStr = completeJSON.trim();
          
          // Log para debug
          console.log(`[Padrão 1] JSON completo encontrado (${jsonStr.length} chars, formato: ${isMCPFormat ? 'MCP' : 'antigo'}):`, jsonStr.substring(0, 200));
          
          const parsed = extractAndParseJSON(jsonStr);
          if (parsed && parsed.function) {
            console.log(`[Padrão 1] JSON parseado com sucesso: function=${parsed.function}`);
            // Evitar duplicatas
            const exists = functionCalls.find(fc => 
              fc.function === parsed.function && 
              JSON.stringify(fc.params) === JSON.stringify(parsed.params)
            );
            if (!exists) {
              functionCalls.push(parsed);
            }
          } else {
            console.log(`[Padrão 1] Falha ao parsear JSON. Tentando parsear diretamente...`);
            try {
              const directParsed = JSON.parse(jsonStr);
              console.log(`[Padrão 1] Parse direto funcionou:`, directParsed);
              
              // Tentar formato MCP primeiro
              // No formato MCP, pode ser "params" ou "arguments" dependendo de como a IA gerou
              const mcpParams = directParsed.params || directParsed.arguments;
              if (directParsed.jsonrpc === '2.0' && directParsed.method === 'tools/call' && mcpParams && mcpParams.name) {
                const functionName = mcpParams.name;
                const functionArgs = mcpParams.arguments || {};
                const exists = functionCalls.find(fc => 
                  fc.function === functionName && 
                  JSON.stringify(fc.params) === JSON.stringify(functionArgs)
                );
                if (!exists) {
                  functionCalls.push({
                    function: functionName,
                    params: functionArgs
                  });
                }
              } else if (directParsed.function && typeof directParsed.function === 'string') {
                // Formato antigo
                const exists = functionCalls.find(fc => 
                  fc.function === directParsed.function && 
                  JSON.stringify(fc.params) === JSON.stringify(directParsed.params)
                );
                if (!exists) {
                  functionCalls.push({
                    function: directParsed.function,
                    params: directParsed.params || {}
                  });
                }
              }
            } catch (e) {
              console.log(`[Padrão 1] Erro no parse direto:`, e.message);
              console.log(`[Padrão 1] JSON (primeiros 500 chars):`, jsonStr.substring(0, 500));
              console.log(`[Padrão 1] JSON (últimos 200 chars):`, jsonStr.substring(Math.max(0, jsonStr.length - 200)));
            }
          }
        } else {
          console.log(`[Padrão 1] JSON encontrado mas não está completo ou não contém formato MCP ou "function"`);
        }
      }
    }
    
    // Padrão 2: ``` {...} ``` (sem especificar json) - mas não ```json que já foi processado
    const codeBlockPattern = /```(?!json)\s*([\s\S]*?)\s*```/gi;
    codeBlockPattern.lastIndex = 0;
    while ((match = codeBlockPattern.exec(aiResponse)) !== null) {
      const content = match[1].trim();
      // Verificar se parece JSON (começa com { e contém formato MCP ou "function")
      const isMCPFormat = content.startsWith('{') && content.includes('"jsonrpc"') && content.includes('"tools/call"');
      const isOldFormat = content.startsWith('{') && content.includes('"function"');
      if (isMCPFormat || isOldFormat) {
        const parsed = extractAndParseJSON(content);
        if (parsed && parsed.function) {
          // Evitar duplicatas
          const exists = functionCalls.find(fc => 
            fc.function === parsed.function && 
            JSON.stringify(fc.params) === JSON.stringify(parsed.params)
          );
          if (!exists) {
            functionCalls.push(parsed);
          }
        }
      }
    }
    
    // Padrão 3: JSON direto no texto (sem blocos de código) - SEMPRE procurar, não apenas se functionCalls.length === 0
    // Usar findCompleteJSON para garantir que capturamos JSONs completos
    let searchStart = 0;
    const processedJsonPositions = new Set(); // Evitar processar o mesmo JSON duas vezes
    
    while (true) {
      const remainingText = aiResponse.substring(searchStart);
      const completeJSON = findCompleteJSON(remainingText);
      
      if (!completeJSON) {
        break; // Não há mais JSONs
      }
      
      const jsonStartPos = searchStart + remainingText.indexOf(completeJSON);
      const jsonEndPos = jsonStartPos + completeJSON.length;
      
      // Evitar processar o mesmo JSON duas vezes
      if (processedJsonPositions.has(jsonStartPos)) {
        searchStart = jsonEndPos;
        continue;
      }
      processedJsonPositions.add(jsonStartPos);
      
      // Verificar se este JSON não está dentro de um bloco ```json já processado
      const beforeJSON = aiResponse.substring(Math.max(0, jsonStartPos - 10), jsonStartPos);
      const afterJSON = aiResponse.substring(jsonEndPos, Math.min(aiResponse.length, jsonEndPos + 10));
      
      // Se não está dentro de um bloco ```json, processar
      if (!beforeJSON.includes('```json') && !afterJSON.includes('```')) {
        // Verificar se parece uma chamada de função (formato MCP ou antigo)
        const isMCPFormat = completeJSON.includes('"jsonrpc"') && completeJSON.includes('"tools/call"');
        const isOldFormat = completeJSON.includes('"function"');
        
        // Também verificar por nomes de funções específicas
        const hasFunctionName = completeJSON.includes('"createCrud"') ||
                               completeJSON.includes('"createFunction"') ||
                               completeJSON.includes('"createMenuItem"') ||
                               completeJSON.includes('"assignPermissionsToRole"') ||
                               completeJSON.includes('"runMigration"') ||
                               completeJSON.includes('"reloadDynamicRoutes"') ||
                               completeJSON.includes('"getModel"') ||
                               completeJSON.includes('"getCruds"');
        
        if (isMCPFormat || isOldFormat || hasFunctionName) {
          const parsed = extractAndParseJSON(completeJSON);
          if (parsed && parsed.function) {
            // Evitar duplicatas
            const exists = functionCalls.find(fc => 
              fc.function === parsed.function && 
              JSON.stringify(fc.params) === JSON.stringify(parsed.params)
            );
            if (!exists) {
              functionCalls.push(parsed);
              console.log(`[Padrão 3] Função detectada: ${parsed.function}`);
            }
          } else {
            // Tentar parsear diretamente como MCP
            try {
              const directParsed = JSON.parse(completeJSON);
              const mcpParams = directParsed.params || directParsed.arguments;
              if (directParsed.jsonrpc === '2.0' && directParsed.method === 'tools/call' && mcpParams && mcpParams.name) {
                const functionName = mcpParams.name;
                const functionArgs = mcpParams.arguments || {};
                const exists = functionCalls.find(fc => 
                  fc.function === functionName && 
                  JSON.stringify(fc.params) === JSON.stringify(functionArgs)
                );
                if (!exists) {
                  functionCalls.push({
                    function: functionName,
                    params: functionArgs
                  });
                  console.log(`[Padrão 3] Função MCP detectada diretamente: ${functionName}`);
                }
              }
            } catch (e) {
              // Ignorar erros de parse
            }
          }
        }
      }
      
      // Continuar procurando após este JSON
      searchStart = jsonEndPos;
    }

    // Log para debug
    if (functionCalls.length === 0) {
      console.log('Nenhuma função detectada na resposta da IA');
      console.log('Resposta completa:', aiResponse.substring(0, 1000));
      // Tentar encontrar JSONs manualmente para debug usando função auxiliar
      const debugJsonMatches = [];
      // Procurar por blocos ```json e usar findCompleteJSON para capturar JSONs completos
      const debugJsonBlockStartPattern = /```json\s*\n?/gi;
      debugJsonBlockStartPattern.lastIndex = 0;
      let debugBlockStart;
      while ((debugBlockStart = debugJsonBlockStartPattern.exec(aiResponse)) !== null) {
        const debugStartPos = debugBlockStart.index + debugBlockStart[0].length;
        // Usar findCompleteJSON diretamente sem limitar pelo próximo ```
        const debugRemainingText = aiResponse.substring(debugStartPos);
        const debugCompleteJSON = findCompleteJSON(debugRemainingText);
        if (debugCompleteJSON) {
          debugJsonMatches.push(debugCompleteJSON);
        }
      }
      
      if (debugJsonMatches.length > 0) {
        console.log('JSONs encontrados manualmente em blocos ```json:', debugJsonMatches.length);
        debugJsonMatches.forEach((json, idx) => {
          console.log(`  JSON ${idx + 1}:`, json.substring(0, 200));
          // Tentar parsear manualmente usando extractAndParseJSON
          const parsed = extractAndParseJSON(json);
          if (parsed && parsed.function) {
            console.log(`    Parseado com sucesso: function=${parsed.function}`);
            // Adicionar à lista de functionCalls se ainda não estiver lá
            const exists = functionCalls.find(fc => 
              fc.function === parsed.function && 
              JSON.stringify(fc.params) === JSON.stringify(parsed.params)
            );
            if (!exists) {
              functionCalls.push(parsed);
              console.log(`    Adicionado à lista de functionCalls`);
            }
          } else {
            chatLog(`    Falha ao parsear com extractAndParseJSON`);
            // Tentar parsear diretamente para debug
            try {
              const directParsed = JSON.parse(json);
              // No formato MCP, pode ser "params" ou "arguments" dependendo de como a IA gerou
              const mcpParams = directParsed.params || directParsed.arguments;
              if (directParsed.jsonrpc === '2.0' && directParsed.method === 'tools/call' && mcpParams && mcpParams.name) {
                const functionName = mcpParams.name;
                const functionArgs = mcpParams.arguments || {};
                console.log(`    Parse direto (MCP): function=${functionName}`);
                const exists = functionCalls.find(fc => 
                  fc.function === functionName && 
                  JSON.stringify(fc.params) === JSON.stringify(functionArgs)
                );
                if (!exists) {
                  functionCalls.push({
                    function: functionName,
                    params: functionArgs
                  });
                  console.log(`    Adicionado à lista de functionCalls (MCP)`);
                }
              } else if (directParsed.function) {
                console.log(`    Parse direto (antigo): function=${directParsed.function}`);
              } else {
                console.log(`    Parse direto mas sem função detectada:`, Object.keys(directParsed));
              }
            } catch (e) {
              console.log(`    Erro ao parsear diretamente: ${e.message}`);
              console.log(`    JSON (primeiros 500 chars):`, json.substring(0, 500));
            }
          }
        });
      }
    } else {
      console.log(`Funções detectadas: ${functionCalls.length}`);
      functionCalls.forEach((call, idx) => {
        console.log(`  ${idx + 1}. ${call.function}`, JSON.stringify(call.params).substring(0, 100));
      });
    }

    // Remover duplicatas baseado no nome da função
    const uniqueCalls = [];
    const seenFunctions = new Set();
    for (const call of functionCalls) {
      const key = `${call.function}_${JSON.stringify(call.params)}`;
      if (!seenFunctions.has(key)) {
        seenFunctions.add(key);
        uniqueCalls.push(call);
      }
    }

    // Executar funções se houver
    const functionResults = [];
    const fileWritingFunctions = ['createModel', 'updateModel', 'createMigration'];
    const restartRequiredFunctions = ['createModel', 'updateModel', 'createMigration', 'runMigration'];
    
    // Separar funções que gravam arquivos das outras para executar em ordem
    const fileWritingCalls = [];
    const otherCalls = [];
    let requiresRestart = false;
    
    for (const call of uniqueCalls) {
      if (fileWritingFunctions.includes(call.function)) {
        fileWritingCalls.push(call);
      } else {
        otherCalls.push(call);
      }
      // Verificar se alguma função requer restart
      if (restartRequiredFunctions.includes(call.function)) {
        requiresRestart = true;
      }
    }
    
    // Executar primeiro as funções que NÃO gravam arquivos
    // Enviar feedback parcial para o frontend conforme executa
    for (const call of otherCalls) {
      // Enviar feedback parcial (se possível via Server-Sent Events no futuro)
      const result = await callFunction(call.function, call.params);
      functionResults.push({
        function: call.function,
        params: call.params,
        result: result
      });
    }
    
    // Preparar resposta antes de executar funções que gravam arquivos
    // (para garantir que seja enviada mesmo se o servidor reiniciar)
    let cleanResponse = aiResponse;
    
    // Remover tags JSON que aparecem no início da resposta (ex: \`json, ```json, etc)
    // Remover múltiplas vezes para garantir que todas sejam removidas
    let previousLength = 0;
    while (cleanResponse.length !== previousLength) {
      previousLength = cleanResponse.length;
      cleanResponse = cleanResponse.replace(/^[\s\n]*[\\]*`+json\s*\n?/gi, '');
      cleanResponse = cleanResponse.replace(/^[\s\n]*[\\]*```json\s*\n?/gi, '');
      cleanResponse = cleanResponse.replace(/^[\s\n]*[\\]*```\s*\n?/gi, '');
      cleanResponse = cleanResponse.replace(/^[\s\n]*\\*`+\s*\n?/gi, '');
      cleanResponse = cleanResponse.replace(/^[\s\n]*`+\s*\n?/gi, '');
    }
    
    // Remover blocos ```json ... ``` de forma mais robusta usando findCompleteJSON
    const jsonBlockPattern = /```json\s*\n?/gi;
    let jsonBlockMatch;
    const jsonBlocksToRemove = [];
    jsonBlockPattern.lastIndex = 0;
    
    while ((jsonBlockMatch = jsonBlockPattern.exec(aiResponse)) !== null) {
      const blockStartPos = jsonBlockMatch.index;
      const contentStartPos = blockStartPos + jsonBlockMatch[0].length;
      const remainingAfterBlock = aiResponse.substring(contentStartPos);
      const completeJSON = findCompleteJSON(remainingAfterBlock);
      
      if (completeJSON) {
        // Encontrar onde termina o bloco ``` (pode estar após o JSON)
        const jsonEndPos = contentStartPos + completeJSON.length;
        const nextBacktick = aiResponse.indexOf('```', jsonEndPos);
        const blockEndPos = nextBacktick !== -1 ? nextBacktick + 3 : aiResponse.length;
        jsonBlocksToRemove.push({ start: blockStartPos, end: blockEndPos });
      }
    }
    
    // Remover blocos em ordem reversa para não afetar os índices
    jsonBlocksToRemove.reverse().forEach(block => {
      cleanResponse = cleanResponse.substring(0, block.start) + cleanResponse.substring(block.end);
    });
    
    // Remover blocos ``` ... ``` que contenham formato MCP ou função (fallback)
    cleanResponse = cleanResponse.replace(/\\*```\s*\{[\s\S]*?"(jsonrpc|function)"[\s\S]*?\}\s*\\*```/gi, '');
    cleanResponse = cleanResponse.replace(/```\s*\{[\s\S]*?"(jsonrpc|function)"[\s\S]*?\}\s*```/gi, '');
    
    // Remover JSONs diretos no texto que contenham formato MCP ou função
    // Usar findCompleteJSON para remover JSONs completos
    // IMPORTANTE: Remover TODOS os JSONs que são chamadas de função, mesmo que já tenham sido executados
    let cleanSearchStart = 0;
    let iterations = 0;
    const maxIterations = 100; // Prevenir loop infinito
    
    while (iterations < maxIterations) {
      iterations++;
      const remainingText = cleanResponse.substring(cleanSearchStart);
      const completeJSON = findCompleteJSON(remainingText);
      if (!completeJSON) break;
      
      const jsonStartPos = cleanSearchStart + remainingText.indexOf(completeJSON);
      const jsonEndPos = jsonStartPos + completeJSON.length;
      
      // Verificar se é um JSON de função ou MCP (mais abrangente)
      const isFunctionCall = completeJSON.includes('"jsonrpc"') || 
                            completeJSON.includes('"function"') || 
                            completeJSON.includes('"tools/call"') || 
                            completeJSON.includes('"method"') ||
                            completeJSON.includes('"createCrud"') ||
                            completeJSON.includes('"createFunction"') ||
                            completeJSON.includes('"createMenuItem"') ||
                            completeJSON.includes('"assignPermissionsToRole"') ||
                            completeJSON.includes('"runMigration"') ||
                            completeJSON.includes('"reloadDynamicRoutes"') ||
                            completeJSON.includes('"getModel"') ||
                            completeJSON.includes('"getCruds"');
      
      if (isFunctionCall) {
        // Remover o JSON completo incluindo espaços/linhas antes e depois
        const beforeJSON = cleanResponse.substring(Math.max(0, jsonStartPos - 2), jsonStartPos);
        const afterJSON = cleanResponse.substring(jsonEndPos, Math.min(cleanResponse.length, jsonEndPos + 2));
        
        // Remover o JSON e espaços adjacentes
        let removeStart = jsonStartPos;
        let removeEnd = jsonEndPos;
        
        // Remover espaços/linhas antes se existirem
        if (beforeJSON.trim() === '' || beforeJSON === '\n\n') {
          removeStart = Math.max(0, jsonStartPos - beforeJSON.length);
        }
        
        // Remover espaços/linhas depois se existirem
        if (afterJSON.trim() === '' || afterJSON === '\n\n') {
          removeEnd = Math.min(cleanResponse.length, jsonEndPos + afterJSON.length);
        }
        
        cleanResponse = cleanResponse.substring(0, removeStart) + cleanResponse.substring(removeEnd);
        cleanSearchStart = removeStart; // Continuar da posição removida
      } else {
        cleanSearchStart = jsonEndPos;
      }
      
      if (cleanSearchStart >= cleanResponse.length) break;
    }
    
    // Remover linhas que contenham apenas backticks ou espaços
    cleanResponse = cleanResponse.replace(/^\s*\\*`+\s*$/gm, '');
    cleanResponse = cleanResponse.replace(/^\s*`+\s*$/gm, '');
    
    // Remover linhas que são apenas JSONs de função (linha completa que começa com { e contém jsonrpc ou function)
    cleanResponse = cleanResponse.split('\n').filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return true; // Manter linhas vazias
      // Se a linha parece ser um JSON completo de função, remover
      if (trimmed.startsWith('{') && (trimmed.includes('"jsonrpc"') || trimmed.includes('"function"') || 
          trimmed.includes('"createCrud"') || trimmed.includes('"createFunction"') || 
          trimmed.includes('"createMenuItem"') || trimmed.includes('"assignPermissionsToRole"') ||
          trimmed.includes('"runMigration"') || trimmed.includes('"reloadDynamicRoutes"'))) {
        return false;
      }
      return true;
    }).join('\n');
    
    // Remover linhas vazias múltiplas (deixar no máximo 2 linhas vazias consecutivas)
    cleanResponse = cleanResponse.replace(/\n{3,}/g, '\n\n');
    
    // Remover espaços em branco no início e fim de cada linha
    cleanResponse = cleanResponse.split('\n').map(line => line.trim()).join('\n');
    
    // Remover espaços em branco excessivos no início e fim
    cleanResponse = cleanResponse.trim();
    
    // Se após a limpeza a resposta estiver vazia ou contiver apenas espaços/pontuação, usar mensagem padrão
    if (!cleanResponse || cleanResponse.trim().length === 0 || /^[\s\.,;:!?\-_=]+$/.test(cleanResponse)) {
      cleanResponse = 'Operações executadas com sucesso!';
    }
    
    // Executar funções que gravam arquivos e adicionar delay após cada uma
    for (const call of fileWritingCalls) {
      const result = await callFunction(call.function, call.params);
      functionResults.push({
        function: call.function,
        params: call.params,
        result: result
      });
      
      // Delay após gravar arquivo para dar tempo do nodemon processar
      // mas não bloquear muito tempo
      if (result.success) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Adicionar resposta da IA à sessão
    conversation.push({
      role: 'assistant',
      content: cleanResponse,
      timestamp: Date.now(),
      functionCalls: functionResults.length > 0 ? functionResults : undefined
    });

    // Manter apenas as últimas 50 mensagens para não sobrecarregar a memória
    if (conversation.length > 50) {
      conversation.splice(0, conversation.length - 50);
    }

    // Atualizar sessão em memória do backend (para fallback caso frontend não envie histórico)
    conversationSessions.set(userId, conversation);

    // Enviar resposta IMEDIATAMENTE após executar todas as funções
    // Isso garante que a resposta seja enviada antes de qualquer restart do servidor
    res.json({
      message: cleanResponse,
      functionCalls: functionResults.length > 0 ? functionResults : undefined,
      requiresRestart: requiresRestart
    });
    
    // Se alguma operação que requer atualização foi executada com sucesso, atualizar dinamicamente
    if (requiresRestart) {
      const hasSuccessfulUpdateOperation = functionResults.some(fr => 
        restartRequiredFunctions.includes(fr.function) && fr.result.success
      );
      
      if (hasSuccessfulUpdateOperation) {
        console.log('🔄 Atualizando sistema dinamicamente devido a alterações...');
        
        // Aguardar um pouco para garantir que a resposta foi enviada
        setTimeout(async () => {
          try {
            // Executar migrations se houver
            const hasMigration = functionResults.some(fr => 
              fr.function === 'runMigration' && fr.result.success
            );
            
            if (hasMigration) {
              await dynamicReload.runPendingMigrations();
            }
            
            // Recarregar models se necessário
            const hasModelChange = functionResults.some(fr => 
              (fr.function === 'createModel' || fr.function === 'updateModel') && fr.result.success
            );
            
            if (hasModelChange) {
              await dynamicReload.reloadModels();
            }
            
            // Atualizar rotas dinâmicas se necessário
            const hasRouteChange = functionResults.some(fr => 
              (fr.function === 'createModel' || fr.function === 'updateModel' || fr.function === 'createCrud') && fr.result.success
            );
            
            if (hasRouteChange) {
              await dynamicReload.reloadDynamicRoutes();
            }
            
            console.log('✅ Sistema atualizado dinamicamente com sucesso!');
          } catch (error) {
            console.error('❌ Erro ao atualizar sistema dinamicamente:', error);
          }
        }, 500);
      }
    }
  } catch (error) {
    console.error('Erro no chat IA:', error);
    res.status(500).json({ 
      message: 'Erro ao processar chat',
      error: error.message 
    });
  }
}

// Versão com streaming para respostas parciais
async function chatIAWithStreaming(req, res, sendEvent) {
  const { message, conversation: frontendConversation = [] } = req.body;
  const userId = String(req.user?.id || 'anonymous');
  
  if (!message) {
    sendEvent('error', { message: 'Mensagem é obrigatória' });
    res.end();
    return;
  }

  try {
    // Enviar evento de início
    sendEvent('start', { message: 'Processando sua mensagem...' });

    // Carregar system prompt
    const systemPromptPath = path.join(__dirname, '../SYSTEM_PROMPT.md');
    const systemPrompt = fs.readFileSync(systemPromptPath, 'utf8');

    // Função auxiliar para formatar resultados de funções (mesma do código original)
    function formatFunctionResults(functionCalls) {
      if (!functionCalls || functionCalls.length === 0) return '';
      let formatted = '\n\n**Resultados das funções executadas:**\n';
      functionCalls.forEach((fc, idx) => {
        formatted += `\n${idx + 1}. Função: ${fc.function}\n`;
        formatted += `   Parâmetros: ${JSON.stringify(fc.params, null, 2)}\n`;
        formatted += `   Resultado: ${fc.result.success ? '✅ Sucesso' : '❌ Erro'}\n`;
        formatted += `   Mensagem: ${fc.result.message || 'N/A'}\n`;
        if (fc.result.success && fc.result.data) {
          try {
            const serializedData = JSON.stringify(fc.result.data, null, 2);
            formatted += `   Dados retornados: ${serializedData}\n`;
          } catch (serializeError) {
            formatted += `   Dados retornados: [Erro ao serializar: ${serializeError.message}]\n`;
          }
        }
      });
      formatted += '\n';
      return formatted;
    }

    // Construir mensagens para a API
    const conversation = frontendConversation.length > 0 
      ? frontendConversation 
      : (conversationSessions.get(userId) || []);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation.map(msg => {
        let content = msg.content;
        if (msg.functionCalls && msg.functionCalls.length > 0) {
          content += formatFunctionResults(msg.functionCalls);
        }
        return { role: msg.role, content };
      }),
      { role: 'user', content: message }
    ];

    // Configuração do provedor de IA
    const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';
    const config = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        apiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
      },
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
      }
    }[AI_PROVIDER];

    if (!config || !config.apiKey) {
      sendEvent('error', { message: `API key não configurada para ${AI_PROVIDER}` });
      res.end();
      return;
    }

    sendEvent('thinking', { message: 'Analisando sua solicitação...' });

    // Chamar API da IA com streaming
    const url = new URL(config.apiUrl);
    const requestBody = {
      model: config.model,
      messages: messages,
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      stream: true  // Habilitar streaming
    };

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      }
    };

    const client = url.protocol === 'https:' ? https : http;

    return new Promise(async (resolve, reject) => {
      // Reutilizar funções auxiliares do código original
      function findCompleteJSON(str) {
        // Primeiro, tentar encontrar padrões JSON-RPC específicos
        const jsonrpcPattern = /"jsonrpc"\s*:\s*"2\.0"/;
        const jsonrpcMatch = str.search(jsonrpcPattern);
        
        let startIdx = -1;
        
        if (jsonrpcMatch !== -1) {
          // Encontrar o início do objeto JSON (procurar { antes do padrão)
          for (let i = jsonrpcMatch; i >= 0; i--) {
            if (str[i] === '{') {
              startIdx = i;
              break;
            }
            // Se encontrou um } antes de encontrar {, não é um JSON válido
            if (str[i] === '}') {
              break;
            }
          }
        }
        
        // Se não encontrou pelo padrão JSON-RPC, procurar pelo primeiro {
        if (startIdx === -1) {
          startIdx = str.indexOf('{');
        }
        
        if (startIdx === -1) return null;
        
        let braceCount = 0;
        let bracketCount = 0;
        let inString = false;
        let escapeNext = false;
        let potentialEnd = -1;
        
        for (let i = startIdx; i < str.length; i++) {
          const char = str[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') {
              braceCount--;
              if (braceCount === 0 && bracketCount === 0) {
                potentialEnd = i + 1;
                // Validar que o JSON é realmente válido tentando fazer parse
                const candidateJSON = str.substring(startIdx, potentialEnd);
                try {
                  JSON.parse(candidateJSON);
                  return candidateJSON; // JSON válido encontrado
                } catch (e) {
                  // JSON inválido, continuar procurando
                  potentialEnd = -1;
                }
              }
            }
            if (char === '[') bracketCount++;
            if (char === ']') {
              bracketCount--;
              // Validar se o JSON está completo quando fechamos um array
              if (braceCount === 0 && bracketCount === 0 && potentialEnd === -1) {
                potentialEnd = i + 1;
                const candidateJSON = str.substring(startIdx, potentialEnd);
                try {
                  JSON.parse(candidateJSON);
                  return candidateJSON;
                } catch (e) {
                  potentialEnd = -1;
                }
              }
            }
          }
        }
        
        // Se chegou ao final e ainda há um candidato, tentar validar
        if (potentialEnd !== -1) {
          const candidateJSON = str.substring(startIdx, potentialEnd);
          try {
            JSON.parse(candidateJSON);
            return candidateJSON;
          } catch (e) {
            // Não retornar JSON inválido
          }
        }
        
        return null;
      }

      function extractAndParseJSON(text) {
        if (!text || typeof text !== 'string') return null;
        
        let cleaned = text.trim();
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/g, '');
        
        const completeJSON = findCompleteJSON(cleaned);
        if (!completeJSON) {
          return null;
        }
        
        // Validar que o JSON parece completo antes de tentar parsear
        const trimmedJSON = completeJSON.trim();
        if (!trimmedJSON.startsWith('{') || !trimmedJSON.endsWith('}')) {
          chatLog(`[extractAndParseJSON] JSON não parece completo (não começa com { ou não termina com }):`, trimmedJSON.substring(0, 100));
          return null;
        }
        
        try {
          const parsed = JSON.parse(completeJSON);
            
            // Formato MCP (JSON-RPC 2.0) - verificar estrutura aninhada
            if (parsed.jsonrpc === '2.0' && parsed.method === 'tools/call') {
              // Pode ter arguments diretamente ou dentro de arguments
              const mcpParams = parsed.arguments || parsed.params;
              
              if (mcpParams) {
                // Verificar se tem name diretamente em arguments
                if (mcpParams.name) {
                  return {
                    function: mcpParams.name,
                    params: mcpParams.arguments || {}
                  };
                }
                
                // Verificar estrutura aninhada: arguments.arguments.name
                if (mcpParams.arguments && mcpParams.arguments.name) {
                  return {
                    function: mcpParams.arguments.name,
                    params: mcpParams.arguments.arguments || {}
                  };
                }
              }
            }
            
            // Formato antigo
            if (parsed.function) {
              return {
                function: parsed.function,
                params: parsed.params || parsed.arguments || {}
              };
            }
            
            return null;
          } catch (e) {
            chatLog(`[Streaming] ❌ Erro ao parsear JSON: ${e.message}`);
            chatLog(`[Streaming] 📄 Posição do erro: ${e.message.match(/position (\d+)/)?.[1] || 'N/A'}`);
            chatLog(`[Streaming] 📄 JSON (primeiros 500 chars):`, completeJSON.substring(0, 500));
            chatLog(`[Streaming] 📄 JSON (últimos 200 chars):`, completeJSON.substring(Math.max(0, completeJSON.length - 200)));
            
            // Tentar encontrar onde está o problema
            const errorPosMatch = e.message.match(/position (\d+)/);
            if (errorPosMatch) {
              const errorPos = parseInt(errorPosMatch[1]);
              const start = Math.max(0, errorPos - 50);
              const end = Math.min(completeJSON.length, errorPos + 50);
              chatLog(`[Streaming] 📄 Contexto do erro (posição ${errorPos}):`, completeJSON.substring(start, end));
            }
            
            return null; // Retornar null em caso de erro de parsing
          }
        
        return null;
      }

      const aiReq = client.request(options, (aiRes) => {
        let buffer = '';
        let fullResponse = ''; // Conteúdo textual limpo (sem JSONs de função)
        let functionCalls = [];
        let jsonBuffer = ''; // Buffer separado apenas para detectar JSONs de função
        const processedJsonKeys = new Set(); // Chaves únicas de JSONs já processados
        let inJsonBlock = false; // Flag para indicar se estamos dentro de um bloco JSON
        let jsonBlockStart = -1; // Posição inicial do bloco JSON atual

        aiRes.on('data', async (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                  const content = parsed.choices[0].delta.content;
                  if (content) {
                    chatLog('[Streaming] Conteúdo recebido:', JSON.stringify(content.substring(0, 100)));
                    // Verificar se o conteúdo indica início de um bloco JSON
                    const contentLowerTrimmed = content.toLowerCase().trim();
                    if (!inJsonBlock && (contentLowerTrimmed.includes('```json') || contentLowerTrimmed.includes('`json') || 
                        (jsonBuffer.length === 0 && content.trim().startsWith('{')) ||
                        (jsonBuffer.trim().endsWith('`') && content.trim().startsWith('json')))) {
                      inJsonBlock = true;
                      jsonBlockStart = jsonBuffer.length;
                    }
                    
                    // Adicionar ao buffer de JSON primeiro para detectar funções
                    jsonBuffer += content;
                    
                    // Verificar se saímos do bloco JSON (``` no final)
                    if (inJsonBlock && jsonBuffer.includes('```')) {
                      const lastBacktick = jsonBuffer.lastIndexOf('```');
                      if (lastBacktick > jsonBlockStart) {
                        inJsonBlock = false;
                        jsonBlockStart = -1;
                      }
                    }
                    
                    // Tentar detectar JSONs usando marcadores específicos [[JSON: ... ]]
                    let foundFunctionJSON = false;
                    const jsonRangesToRemove = [];
                    
                    // Procurar por marcadores [[JSON_START: ... [[JSON_END]]
                    const jsonMarkerStart = '[[JSON_START:';
                    const jsonMarkerEnd = '[[JSON_END]]';
                    
                    // Processar TODOS os JSONs encontrados em um loop contínuo
                    // Continuar até não encontrar mais JSONs completos
                    let keepSearching = true;
                    let maxIterations = 50; // Aumentar limite para processar múltiplos JSONs
                    let iteration = 0;
                    
                    while (keepSearching && iteration < maxIterations) {
                      iteration++;
                      let foundInThisIteration = false;
                      
                      // Procurar pelo próximo marcador de início
                      const markerStartPos = jsonBuffer.indexOf(jsonMarkerStart);
                      if (markerStartPos === -1) {
                        keepSearching = false; // Não há mais marcadores
                        break;
                      }
                      
                      // Procurar pelo marcador de fim após o início
                      const jsonContentStart = markerStartPos + jsonMarkerStart.length;
                      const markerEndPos = jsonBuffer.indexOf(jsonMarkerEnd, jsonContentStart);
                      
                      if (markerEndPos === -1) {
                        // JSON ainda não está completo, aguardar mais conteúdo
                        keepSearching = false;
                        break;
                      }
                      
                      // Extrair o JSON entre os marcadores
                      const jsonContent = jsonBuffer.substring(jsonContentStart, markerEndPos);
                      const jsonEndPos = markerEndPos + jsonMarkerEnd.length;
                      
                      // Verificar se o JSON está completo antes de tentar parsear
                      const completeJSON = findCompleteJSON(jsonContent);
                      if (!completeJSON) {
                        // JSON ainda não está completo, aguardar mais conteúdo
                        keepSearching = false;
                        break;
                      }
                      
                      // Validar que o JSON é realmente válido tentando fazer parse
                      let isValidJSON = false;
                      try {
                        JSON.parse(completeJSON);
                        isValidJSON = true;
                      } catch (parseError) {
                        // JSON inválido ou incompleto, aguardar mais conteúdo
                        chatLog(`[Streaming] ⚠️ JSON detectado mas inválido (posição ${parseError.message.match(/position (\d+)/)?.[1] || 'N/A'}):`, completeJSON.substring(0, 200));
                        keepSearching = false;
                        break;
                      }
                      
                      if (!isValidJSON) {
                        keepSearching = false;
                        break;
                      }
                      
                      // JSON completo encontrado - exibir log
                      console.log(`\n[Streaming] ✅ JSON completo detectado (iteração ${iteration}):`);
                      console.log(`[Streaming] JSON completo:`, completeJSON.substring(0, Math.min(200, completeJSON.length)) + '...');
                      
                      // Verificar se é uma chamada de função
                      const isFunctionCall = jsonContent.includes('"jsonrpc"') || 
                                            jsonContent.includes('"function"') ||
                                            jsonContent.includes('"tools/call"') ||
                                            jsonContent.includes('"method"') ||
                                            jsonContent.includes('"createCrud"') ||
                                            jsonContent.includes('"updateModel"') ||
                                            jsonContent.includes('"getModel"') ||
                                            jsonContent.includes('"getCruds"') ||
                                            jsonContent.includes('"createMigration"') ||
                                            jsonContent.includes('"runMigration"') ||
                                            jsonContent.includes('"reloadDynamicRoutes"') ||
                                            jsonContent.includes('"createFunction"') ||
                                            jsonContent.includes('"createMenuItem"') ||
                                            jsonContent.includes('"assignPermissionsToRole"');
                      
                      if (isFunctionCall) {
                        // Usar o JSON completo encontrado ao invés do conteúdo bruto
                        const parsedFunc = extractAndParseJSON(completeJSON);
                        
                        if (parsedFunc && parsedFunc.function) {
                          // Criar chave única baseada na função e parâmetros
                          const jsonKey = `${parsedFunc.function}:${JSON.stringify(parsedFunc.params)}`;
                          
                          // Verificar se já foi processado
                          if (!processedJsonKeys.has(jsonKey)) {
                            processedJsonKeys.add(jsonKey);
                            
                            // Verificar se já foi executada (evitar duplicatas)
                            const exists = functionCalls.find(fc => 
                              fc.function === parsedFunc.function && 
                              JSON.stringify(fc.params) === JSON.stringify(parsedFunc.params)
                            );
                            
                            if (!exists) {
                              // Marcar para remoção (incluindo os marcadores)
                              jsonRangesToRemove.push({ start: markerStartPos, end: jsonEndPos });
                              foundFunctionJSON = true;
                              foundInThisIteration = true;
                              
                              // Executar função imediatamente
                              sendEvent('function', { 
                                function: parsedFunc.function, 
                                params: parsedFunc.params,
                                status: 'executing'
                              });
                              
                              try {
                                console.log(`\n[Streaming] 🚀 EXECUTANDO função: ${parsedFunc.function}`);
                                console.log(`[Streaming] 📥 Parâmetros:`, JSON.stringify(parsedFunc.params, null, 2));
                                
                                const result = await callFunction(parsedFunc.function, parsedFunc.params);
                                
                                if (result.success) {
                                  console.log(`[Streaming] ✅ SUCESSO: ${parsedFunc.function}`);
                                  console.log(`[Streaming] 📤 Mensagem: ${result.message}`);
                                  if (result.data) {
                                    console.log(`[Streaming] 📊 Dados retornados:`, JSON.stringify(result.data, null, 2));
                                  }
                                } else {
                                  console.log(`[Streaming] ❌ ERRO: ${parsedFunc.function}`);
                                  console.log(`[Streaming] 📤 Mensagem: ${result.message}`);
                                }
                                
                                functionCalls.push({
                                  function: parsedFunc.function,
                                  params: parsedFunc.params,
                                  result: result
                                });
                                
                                // Enviar evento de função executada (apenas nome e resultado)
                                sendEvent('function', {
                                  function: parsedFunc.function,
                                  result: result
                                });
                              } catch (funcError) {
                                console.error(`\n[Streaming] ❌ ERRO ao executar ${parsedFunc.function}:`);
                                console.error(`[Streaming] 📤 Mensagem: ${funcError.message}`);
                                console.error(`[Streaming] 📋 Stack trace:`, funcError.stack);
                                
                                const errorResult = {
                                  success: false,
                                  message: `Erro ao executar ${parsedFunc.function}: ${funcError.message}`
                                };
                                functionCalls.push({
                                  function: parsedFunc.function,
                                  params: parsedFunc.params,
                                  result: errorResult
                                });
                                
                                sendEvent('function', {
                                  function: parsedFunc.function,
                                  result: errorResult
                                });
                              }
                              
                              // Remover este JSON do buffer imediatamente para continuar procurando
                              const beforeJSON = jsonBuffer.substring(0, markerStartPos);
                              const afterJSON = jsonBuffer.substring(jsonEndPos);
                              jsonBuffer = beforeJSON + afterJSON;
                              
                              // Continuar procurando por mais JSONs
                              keepSearching = true;
                            } else {
                              console.log(`[Streaming] ⏭️  Função ${parsedFunc.function} já foi executada anteriormente, ignorando duplicata`);
                              // Remover mesmo assim para não processar novamente
                              const beforeJSON = jsonBuffer.substring(0, markerStartPos);
                              const afterJSON = jsonBuffer.substring(jsonEndPos);
                              jsonBuffer = beforeJSON + afterJSON;
                              keepSearching = true;
                            }
                          } else {
                            // Já foi processado, remover e continuar
                            const beforeJSON = jsonBuffer.substring(0, markerStartPos);
                            const afterJSON = jsonBuffer.substring(jsonEndPos);
                            jsonBuffer = beforeJSON + afterJSON;
                            keepSearching = true;
                          }
                        } else {
                          console.log(`[Streaming] ⚠️  JSON completo mas não foi possível extrair função válida`);
                          // Remover mesmo assim para não ficar preso
                          const beforeJSON = jsonBuffer.substring(0, markerStartPos);
                          const afterJSON = jsonBuffer.substring(jsonEndPos);
                          jsonBuffer = beforeJSON + afterJSON;
                          keepSearching = true;
                        }
                      } else {
                        // Não é uma função, remover e continuar procurando
                        const beforeJSON = jsonBuffer.substring(0, markerStartPos);
                        const afterJSON = jsonBuffer.substring(jsonEndPos);
                        jsonBuffer = beforeJSON + afterJSON;
                        keepSearching = true;
                      }
                    }
                    
                    // Remover todos os JSONs marcados que não foram removidos no loop (fallback)
                    if (jsonRangesToRemove.length > 0) {
                      jsonRangesToRemove.sort((a, b) => b.start - a.start);
                      for (const range of jsonRangesToRemove) {
                        // Verificar se ainda existe no buffer (pode ter sido removido no loop)
                        if (jsonBuffer.substring(range.start, range.start + jsonMarkerStart.length) === jsonMarkerStart) {
                          const beforeJSON = jsonBuffer.substring(0, range.start);
                          const afterJSON = jsonBuffer.substring(range.end);
                          jsonBuffer = beforeJSON + afterJSON;
                        }
                      }
                    }
                    
                    chatLog('[Streaming] Estado após processamento:', {
                      foundFunctionJSON,
                      inJsonBlock,
                      fullResponseLength: fullResponse.length,
                      jsonBufferLength: jsonBuffer.length,
                      contentPreview: content.substring(0, 50),
                      functionCallsCount: functionCalls.length
                    });
                    
                    // Lógica simplificada: só bloquear se realmente estamos processando um JSON AGORA
                    // Se encontramos e processamos um JSON neste chunk, não adicionar este conteúdo ao fullResponse
                    if (foundFunctionJSON) {
                        chatLog('[Streaming] JSON processado neste chunk, não adicionando ao fullResponse');
                      // Manter conteúdo anterior se houver
                      if (fullResponse.length > 0) {
                        sendEvent('partial', { content: '', fullContent: fullResponse });
                      }
                    } else {
                      // Verificar se o conteúdo atual é claramente parte de um JSON de função
                      const isJsonFunctionContent = (contentLowerTrimmed.startsWith('```json') || 
                                                     contentLowerTrimmed.startsWith('`json') ||
                                                     (contentLowerTrimmed.startsWith('{') && content.includes('"jsonrpc"')) ||
                                                     (jsonBuffer.includes('"jsonrpc"') && (content.includes('"jsonrpc"') || content.includes('"method"') || content.includes('"tools/call"'))));
                      
                      if (!isJsonFunctionContent) {
                        // Conteúdo seguro para adicionar
                        chatLog('[Streaming] Adicionando conteúdo ao fullResponse:', content.substring(0, 50));
                        fullResponse += content;
                        sendEvent('partial', { content: content, fullContent: fullResponse });
                      } else {
                        chatLog('[Streaming] Conteúdo parece ser parte de JSON, não adicionando');
                        // Manter conteúdo anterior se houver
                        if (fullResponse.length > 0) {
                          sendEvent('partial', { content: '', fullContent: fullResponse });
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                // Ignorar erros de parse
              }
            }
          }
        });

        aiRes.on('end', async () => {
          // Limpeza final agressiva para remover qualquer JSON que possa ter escapado
          let cleanResponse = fullResponse;
          
          chatLog('[Streaming] Finalizando - fullResponse length:', fullResponse.length, 'functionCalls:', functionCalls.length);
          
          // Remover blocos ```json ... ```
          cleanResponse = cleanResponse.replace(/```json\s*[\s\S]*?```/gi, '');
          cleanResponse = cleanResponse.replace(/`json\s*[\s\S]*?`/gi, '');
          
          // Remover JSONs que começam com { e contêm "jsonrpc" ou "method"
          const jsonPattern = /\{[^{}]*"jsonrpc"[^{}]*\}/g;
          cleanResponse = cleanResponse.replace(jsonPattern, '');
          
          // Se não há conteúdo textual mas há funções executadas, gerar mensagem resumida
          if (cleanResponse.trim().length === 0 && functionCalls.length > 0) {
            const successfulFunctions = functionCalls.filter(fc => fc.result && fc.result.success);
            const failedFunctions = functionCalls.filter(fc => fc.result && !fc.result.success);
            
            if (successfulFunctions.length > 0) {
              cleanResponse = `Executei ${successfulFunctions.length} função(ões) com sucesso:\n\n`;
              successfulFunctions.forEach((fc, index) => {
                cleanResponse += `${index + 1}. **${fc.function}**: ${fc.result.message || 'Executada com sucesso'}\n`;
              });
            }
            
            if (failedFunctions.length > 0) {
              cleanResponse += `\n${failedFunctions.length} função(ões) falharam:\n\n`;
              failedFunctions.forEach((fc, index) => {
                cleanResponse += `${index + 1}. **${fc.function}**: ${fc.result.message || 'Erro desconhecido'}\n`;
              });
            }
            
            chatLog('[Streaming] Gerando mensagem resumida:', cleanResponse.substring(0, 100));
          }
          
          // Remover linhas que contêm apenas padrões JSON
          const lines = cleanResponse.split('\n');
          const cleanedLines = lines.filter(line => {
            const trimmed = line.trim();
            // Remover linhas que são claramente JSONs de função
            if (trimmed.match(/^[`\s]*json/i)) return false;
            if (trimmed.match(/^[`\s]*\{/)) {
              if (trimmed.includes('"jsonrpc"') || trimmed.includes('"method"') || trimmed.includes('"tools/call"')) {
                return false;
              }
            }
            if (trimmed.match(/"jsonrpc"\s*:/)) return false;
            if (trimmed.match(/"method"\s*:\s*"tools\/call"/)) return false;
            if (trimmed.match(/"arguments"\s*:\s*\{/)) return false;
            // Remover fragmentos comuns
            if (trimmed.match(/^[,}\s]*"id"\s*:\s*\d+\s*[,}\s]*$/)) return false;
            if (trimmed.match(/^[,}\s]*\}\s*[,}\s]*$/)) return false;
            return true;
          });
          cleanResponse = cleanedLines.join('\n');
          
          // Remover fragmentos residuais
          cleanResponse = cleanResponse
            .replace(/[,}\s]*"id"\s*:\s*\d+\s*[,}\s]*/g, '')
            .replace(/[,}\s]*\}\s*[,}\s]*/g, '')
            .replace(/[,{\s]*\{\s*[,{\s]*/g, '')
            .replace(/,\s*,/g, ',')
            .replace(/,\s*\}/g, '}')
            .replace(/\{\s*,/g, '{')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]{2,}/g, ' ')
            .trim();
          
          // Verificar se ainda há algum JSON que possa ter escapado (fallback de segurança)
          let searchStart = 0;
          const jsonPositionsToRemove = [];
          
          while (true) {
            const remainingText = cleanResponse.substring(searchStart);
            const completeJSON = findCompleteJSON(remainingText);
            
            if (!completeJSON) break;
            
            const jsonStartPos = searchStart + remainingText.indexOf(completeJSON);
            const jsonEndPos = jsonStartPos + completeJSON.length;
            
            // Verificar se é uma chamada de função
            const isFunctionCall = completeJSON.includes('"jsonrpc"') || 
                                  completeJSON.includes('"function"') ||
                                  completeJSON.includes('"tools/call"') ||
                                  completeJSON.includes('"method"') ||
                                  completeJSON.includes('"createCrud"') ||
                                  completeJSON.includes('"updateModel"') ||
                                  completeJSON.includes('"getModel"') ||
                                  completeJSON.includes('"getCruds"') ||
                                  completeJSON.includes('"createMigration"') ||
                                  completeJSON.includes('"runMigration"') ||
                                  completeJSON.includes('"reloadDynamicRoutes"') ||
                                  completeJSON.includes('"createFunction"') ||
                                  completeJSON.includes('"createMenuItem"') ||
                                  completeJSON.includes('"assignPermissionsToRole"');
            
            if (isFunctionCall) {
              // Remover JSON que escapou (não deveria acontecer, mas é um fallback)
              const beforeJSON = cleanResponse.substring(Math.max(0, jsonStartPos - 10), jsonStartPos);
              const afterJSON = cleanResponse.substring(jsonEndPos, Math.min(cleanResponse.length, jsonEndPos + 10));
              
              let removeStart = jsonStartPos;
              let removeEnd = jsonEndPos;
              
              if (beforeJSON.trim() === '' || beforeJSON === '\n\n') {
                removeStart = Math.max(0, jsonStartPos - beforeJSON.length);
              }
              
              if (afterJSON.trim() === '' || afterJSON === '\n\n') {
                removeEnd = Math.min(cleanResponse.length, jsonEndPos + afterJSON.length);
              }
              
              jsonPositionsToRemove.push({ start: removeStart, end: removeEnd });
            }
            
            searchStart = jsonEndPos;
            if (searchStart >= cleanResponse.length) break;
          }
          
          // Remover JSONs que escaparam (se houver)
          if (jsonPositionsToRemove.length > 0) {
            jsonPositionsToRemove.sort((a, b) => b.start - a.start);
            for (const pos of jsonPositionsToRemove) {
              cleanResponse = cleanResponse.substring(0, pos.start) + cleanResponse.substring(pos.end);
            }
          }
          
          // Limpeza final básica de fragmentos residuais (caso algum tenha escapado)
          cleanResponse = cleanResponse
            .replace(/[,}\s]*"id"\s*:\s*\d+\s*[,}\s]*/g, '')
            .replace(/[,}\s]*\}\s*[,}\s]*/g, '')
            .replace(/[,{\s]*\{\s*[,{\s]*/g, '')
            .replace(/,\s*,/g, ',')
            .replace(/,\s*\}/g, '}')
            .replace(/\{\s*,/g, '{')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          
          // Remover linhas que contenham apenas fragmentos de JSON (segunda passagem)
          const finalLines = cleanResponse.split('\n');
          const finalCleanedLines = finalLines.filter(line => {
            const trimmed = line.trim();
            // Remover linhas que são apenas fragmentos de JSON
            if (trimmed.match(/^[,}\s]*"id"\s*:\s*\d+\s*[,}\s]*$/)) return false;
            if (trimmed.match(/^[,}\s]*\}\s*[,}\s]*$/)) return false;
            if (trimmed.match(/^[,{\s]*\{\s*[,{\s]*$/)) return false;
            if (trimmed.match(/^,\s*,\s*$/)) return false;
            if (trimmed.match(/^}\s*,\s*}$/)) return false;
            if (trimmed.match(/^{\s*,\s*{$/)) return false;
            // Remover linhas que começam com }, ou ,}
            if (trimmed.match(/^[,}\s]+$/)) return false;
            return true;
          });
          cleanResponse = finalCleanedLines.join('\n');
          
          // Remover marcadores [[JSON_START: ... [[JSON_END]] que possam ter escapado
          cleanResponse = cleanResponse.replace(/\[\[JSON_START:[\s\S]*?\[\[JSON_END\]\]/g, '');
          
          // Remover tags JSON que aparecem no início
          let previousLength = 0;
          let cleanIterations = 0;
          while (cleanResponse.length !== previousLength && cleanIterations < 20) {
            cleanIterations++;
            previousLength = cleanResponse.length;
            cleanResponse = cleanResponse.replace(/^[\s\n]*[\\]*`+json\s*\n?/gi, '');
            cleanResponse = cleanResponse.replace(/^[\s\n]*[\\]*```json\s*\n?/gi, '');
            cleanResponse = cleanResponse.replace(/^[\s\n]*[\\]*```\s*\n?/gi, '');
            cleanResponse = cleanResponse.replace(/^[\s\n]*\\*`+\s*\n?/gi, '');
            cleanResponse = cleanResponse.replace(/^[\s\n]*`+\s*\n?/gi, '');
          }
          
          // Limpar múltiplas linhas vazias e espaços extras
          cleanResponse = cleanResponse.replace(/\n{3,}/g, '\n\n');
          cleanResponse = cleanResponse.replace(/[ \t]{2,}/g, ' ');
          cleanResponse = cleanResponse.trim();
          
          sendEvent('complete', {
            message: cleanResponse,
            functionCalls: functionCalls
          });
          
          res.end();
          resolve();
        });

        aiRes.on('error', (error) => {
          sendEvent('error', { message: `Erro na comunicação com IA: ${error.message}` });
          res.end();
          reject(error);
        });
      });

      aiReq.on('error', (error) => {
        sendEvent('error', { message: `Erro na requisição: ${error.message}` });
        res.end();
        reject(error);
      });

      aiReq.write(JSON.stringify(requestBody));
      aiReq.end();
    });
  } catch (error) {
    sendEvent('error', { message: error.message });
    res.end();
    throw error;
  }
}

// Exportar funções disponíveis para uso externo (MCP)
function getAvailableFunctions() {
  // Combinar funções manuais com wrappers automáticos dos controllers
  const autoMCP = require('../utils/autoMCP');
  const autoWrappers = autoMCP.getAllMCPWrappers();
  
  return {
    ...availableFunctions,
    ...autoWrappers
  };
}

module.exports = {
  chatIA,
  getAvailableFunctions
};

