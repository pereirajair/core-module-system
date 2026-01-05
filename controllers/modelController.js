const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Lazy load db para evitar problemas de ordem de carregamento
function getDb() {
  const modelsLoader = require('../utils/modelsLoader');
  return modelsLoader.loadModels();
}

const modelsPath = path.join(__dirname, '../../../models');
const migrationsPath = path.join(__dirname, '../../../migrations');
const seedersPath = path.join(__dirname, '../../../seeders');

// Mapeamento de tipos Sequelize para tipos de migration
const sequelizeToMigrationType = {
  'STRING': 'STRING',
  'TEXT': 'TEXT',
  'INTEGER': 'INTEGER',
  'BIGINT': 'BIGINT',
  'FLOAT': 'FLOAT',
  'DOUBLE': 'DOUBLE',
  'DECIMAL': 'DECIMAL',
  'BOOLEAN': 'BOOLEAN',
  'DATE': 'DATE',
  'DATEONLY': 'DATEONLY',
  'TIME': 'TIME',
  'UUID': 'UUID',
  'JSON': 'JSON',
  'JSONB': 'JSONB',
  'BLOB': 'BLOB',
  'ENUM': 'ENUM'
};

// Verificar se é model de sistema
function isSystemModel(name, content) {
  const systemModels = ['user', 'permission', 'organization', 'role', 'system', 'crud', 'function', 'menu', 'menuitem', 'menu_items', 'modeldefinition'];
  if (systemModels.includes(name.toLowerCase())) {
    return true;
  }
  // Verificar se tem indicador no arquivo
  if (content && (content.includes('// SYSTEM MODEL') || content.includes('/* SYSTEM MODEL */'))) {
    return true;
  }
  return false;
}

// Obter lista de models de todos os módulos
async function getAllModels(req, res) {
  try {
    const { loadModules } = require('../utils/moduleLoader');
    const modules = loadModules();
    const allModels = [];

    // Buscar models da pasta padrão (compatibilidade)
    if (fs.existsSync(modelsPath)) {
      const files = fs.readdirSync(modelsPath)
        .filter(file => file !== 'index.js' && file.endsWith('.js'));

      for (const file of files) {
        const modelName = file.replace('.js', '');
        const filePath = path.join(modelsPath, file);
        const content = fs.readFileSync(filePath, 'utf8');

        const classMatch = content.match(/class\s+(\w+)\s+extends/);
        const className = classMatch ? classMatch[1] : modelName.charAt(0).toUpperCase() + modelName.slice(1);

        const isSystem = isSystemModel(modelName, content);

        allModels.push({
          name: modelName,
          className: className,
          file: file,
          path: filePath,
          isSystem: isSystem,
          module: null // Models da pasta padrão não têm módulo
        });
      }
    }

    // Buscar models de cada módulo
    for (const module of modules) {
      if (!module.enabled) continue;

      const moduleModelsPath = path.join(module.path, 'models');

      if (fs.existsSync(moduleModelsPath)) {
        const files = fs.readdirSync(moduleModelsPath)
          .filter(file => file.endsWith('.js'));

        for (const file of files) {
          const modelName = file.replace('.js', '');
          const filePath = path.join(moduleModelsPath, file);
          const content = fs.readFileSync(filePath, 'utf8');

          const classMatch = content.match(/class\s+(\w+)\s+extends/);
          const className = classMatch ? classMatch[1] : modelName.charAt(0).toUpperCase() + modelName.slice(1);

          const isSystem = module.isSystem || isSystemModel(modelName, content);

          allModels.push({
            name: modelName,
            className: className,
            file: file,
            path: filePath,
            isSystem: isSystem,
            module: module.name,
            moduleTitle: module.title
          });
        }
      }
    }

    // Aplicar filtro se houver
    let filteredModels = allModels;
    const filter = req.query.filter || '';
    if (filter) {
      const filterLower = filter.toLowerCase();
      filteredModels = allModels.filter(model => {
        // Buscar em name, className e moduleTitle
        return (
          (model.name && model.name.toLowerCase().includes(filterLower)) ||
          (model.className && model.className.toLowerCase().includes(filterLower)) ||
          (model.moduleTitle && model.moduleTitle.toLowerCase().includes(filterLower))
        );
      });
    }

    // Aplicar paginação
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;
    const paginatedModels = filteredModels.slice(offset, offset + limit);

    res.json({
      data: paginatedModels,
      count: filteredModels.length,
      page,
      limit,
      totalPages: Math.ceil(filteredModels.length / limit)
    });
  } catch (error) {
    console.error('Erro ao listar models:', error);
    res.status(500).json({ message: 'Erro ao listar models', error: error.message });
  }
}

// Função auxiliar para normalizar nome de model (singular/plural) - busca em todos os módulos
function normalizeModelName(name) {
  if (!name) return null;

  const { loadModules } = require('../utils/moduleLoader');
  const modules = loadModules();
  const nameLower = name.toLowerCase();

  // Coletar todos os arquivos de models de todos os módulos
  const allFiles = [];

  // Buscar na pasta padrão
  if (fs.existsSync(modelsPath)) {
    const files = fs.readdirSync(modelsPath)
      .filter(file => file !== 'index.js' && file.endsWith('.js'))
      .map(file => file.replace('.js', '').toLowerCase());
    allFiles.push(...files);
  }

  // Buscar em cada módulo
  for (const module of modules) {
    if (!module.enabled) continue;
    const moduleModelsPath = path.join(module.path, 'models');
    if (fs.existsSync(moduleModelsPath)) {
      const files = fs.readdirSync(moduleModelsPath)
        .filter(file => file.endsWith('.js'))
        .map(file => file.replace('.js', '').toLowerCase());
      allFiles.push(...files);
    }
  }

  const files = [...new Set(allFiles)]; // Remover duplicatas

  // Tentar nome exato primeiro
  if (files.includes(nameLower)) {
    return nameLower;
  }

  // Tentar plural (adicionar 's' ou 'es')
  const plural1 = nameLower + 's';
  if (files.includes(plural1)) {
    return plural1;
  }

  const plural2 = nameLower + 'es';
  if (files.includes(plural2)) {
    return plural2;
  }

  // Tentar singular (remover 's' ou 'es')
  if (nameLower.endsWith('es') && nameLower.length > 2) {
    const singular1 = nameLower.slice(0, -2);
    if (files.includes(singular1)) {
      return singular1;
    }
  }

  if (nameLower.endsWith('s') && nameLower.length > 1) {
    const singular2 = nameLower.slice(0, -1);
    if (files.includes(singular2)) {
      return singular2;
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
      return normalized;
    }
  }

  // Se não encontrou, retornar o nome original
  return nameLower;
}

// Função auxiliar para encontrar o caminho do arquivo da model em todos os módulos
function findModelFilePath(normalizedName) {
  const { loadModules } = require('../utils/moduleLoader');
  const modules = loadModules();

  // Buscar na pasta padrão primeiro
  const defaultPath = path.join(modelsPath, `${normalizedName}.js`);
  if (fs.existsSync(defaultPath)) {
    return { path: defaultPath, module: null };
  }

  // Buscar em cada módulo
  for (const module of modules) {
    if (!module.enabled) continue;
    const moduleModelsPath = path.join(module.path, 'models');
    const filePath = path.join(moduleModelsPath, `${normalizedName}.js`);
    if (fs.existsSync(filePath)) {
      return { path: filePath, module: module.name };
    }
  }

  return null;
}

// Obter detalhes de uma model
async function getModel(req, res) {
  try {
    const db = getDb();
    const ModelDefinition = db.ModelDefinition;
    
    const { name } = req.params;

    // Normalizar nome da model (singular/plural)
    const normalizedName = normalizeModelName(name);

    if (!normalizedName) {
      return res.status(404).json({
        message: `Model "${name}" não encontrada.`
      });
    }

    // Tentar buscar do banco de dados primeiro usando o nome normalizado
    try {
      const modelDef = await ModelDefinition.findOne({ where: { name: normalizedName } });
      if (modelDef) {
        return res.json({
          name: normalizedName,
          originalName: name,
          className: modelDef.className,
          fields: modelDef.definition.fields || [],
          associations: modelDef.definition.associations || [],
          options: modelDef.definition.options || {},
          isSystem: modelDef.isSystem,
          module: modelDef.module || null,
          rawContent: null
        });
      }
    } catch (dbError) {
      console.log('ModelDefinition não encontrada no banco, tentando arquivo:', dbError.message);
    }

    // Buscar arquivo em todos os módulos
    const fileInfo = findModelFilePath(normalizedName);

    if (!fileInfo || !fs.existsSync(fileInfo.path)) {
      return res.status(404).json({
        message: `Model "${name}" não encontrada em nenhum módulo.`
      });
    }

    const content = fs.readFileSync(fileInfo.path, 'utf8');

    // Extrair informações da model usando regex
    const modelInfo = parseModelFile(content);

    const isSystem = isSystemModel(normalizedName, content);

    res.json({
      name: normalizedName, // Retornar nome normalizado
      originalName: name, // Manter nome original para referência
      ...modelInfo,
      rawContent: content,
      isSystem: isSystem,
      module: fileInfo.module || null // Retornar módulo onde a model está
    });
  } catch (error) {
    console.error('Erro ao obter model:', error);
    res.status(500).json({ message: 'Erro ao obter model', error: error.message });
  }
}

// Parse do arquivo de model
function parseModelFile(content) {
  const modelInfo = {
    className: null,
    fields: [],
    associations: [],
    options: {}
  };

  // Extrair nome da classe
  const classMatch = content.match(/class\s+(\w+)\s+extends/);
  if (classMatch) {
    modelInfo.className = classMatch[1];
  }

  // Extrair campos do User.init
  const initMatch = content.match(/\.init\(({[\s\S]*?}),\s*{/);
  if (initMatch) {
    const fieldsStr = initMatch[1];
    modelInfo.fields = parseFields(fieldsStr);
  }

  // Extrair opções do segundo parâmetro do init
  const optionsMatch = content.match(/\.init\([\s\S]*?},\s*({[\s\S]*?})\)/);
  if (optionsMatch) {
    const optionsStr = optionsMatch[1];
    modelInfo.options = parseOptions(optionsStr);
  }

  // Extrair associações do método associate
  // Procurar por todo o bloco do método associate
  const associateStart = content.indexOf('static associate(models)');
  if (associateStart !== -1) {
    let braceCount = 0;
    let startPos = content.indexOf('{', associateStart);
    let endPos = startPos;

    if (startPos !== -1) {
      braceCount = 1;
      endPos = startPos + 1;

      while (endPos < content.length && braceCount > 0) {
        if (content[endPos] === '{') braceCount++;
        if (content[endPos] === '}') braceCount--;
        endPos++;
      }

      const associateStr = content.substring(startPos + 1, endPos - 1);
      modelInfo.associations = parseAssociations(associateStr);
    }
  }

  return modelInfo;
}

// Parse de campos
function parseFields(fieldsStr) {
  const fields = [];
  const fieldRegex = /(\w+):\s*({[\s\S]*?}|DataTypes\.\w+(?:\([^)]*\))?)/g;
  let match;

  while ((match = fieldRegex.exec(fieldsStr)) !== null) {
    const fieldName = match[1];
    const fieldDef = match[2].trim();

    const field = {
      name: fieldName,
      type: null,
      allowNull: true,
      primaryKey: false,
      autoIncrement: false,
      defaultValue: null,
      unique: false,
      references: null
    };

    // Se é um objeto de definição
    if (fieldDef.startsWith('{')) {
      const objStr = fieldDef.slice(1, -1);

      // Tipo
      const typeMatch = objStr.match(/type:\s*(DataTypes\.\w+(?:\([^)]*\))?)/);
      if (typeMatch) {
        field.type = typeMatch[1].replace('DataTypes.', '');
      }

      // Primary key
      if (objStr.includes('primaryKey: true')) {
        field.primaryKey = true;
      }

      // Auto increment
      if (objStr.includes('autoIncrement: true')) {
        field.autoIncrement = true;
      }

      // Allow null
      if (objStr.includes('allowNull: false')) {
        field.allowNull = false;
      }

      // References
      const refMatch = objStr.match(/references:\s*{[\s\S]*?model:\s*['"]([\w]+)['"][\s\S]*?key:\s*['"](\w+)['"]/);
      if (refMatch) {
        field.references = {
          model: refMatch[1],
          key: refMatch[2]
        };
      }
    } else {
      // Tipo simples (DataTypes.STRING)
      field.type = fieldDef.replace('DataTypes.', '');
    }

    fields.push(field);
  }

  return fields;
}

// Parse de opções
function parseOptions(optionsStr) {
  const options = {};

  // Model name
  const modelNameMatch = optionsStr.match(/modelName:\s*['"]([\w]+)['"]/);
  if (modelNameMatch) {
    options.modelName = modelNameMatch[1];
  }

  // Table name
  const tableNameMatch = optionsStr.match(/tableName:\s*['"]([\w]+)['"]/);
  if (tableNameMatch) {
    options.tableName = tableNameMatch[1];
  }

  return options;
}

// Parse de associações
function parseAssociations(associateStr) {
  const associations = [];

  // Dividir por linhas e processar cada associação
  const lines = associateStr.split('\n');
  let currentLine = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    currentLine += line + ' ';

    // Verificar se a linha completa uma associação (termina com });
    if (line.includes('});')) {
      // belongsToMany
      const belongsToManyMatch = currentLine.match(/(\w+)\.belongsToMany\(models\.(\w+),\s*\{([^}]*)\}\)/);
      if (belongsToManyMatch) {
        const throughMatch = belongsToManyMatch[3].match(/through:\s*['"]([\w_]+)['"]/);
        const foreignKeyMatch = belongsToManyMatch[3].match(/foreignKey:\s*['"]([\w_]+)['"]/);
        const otherKeyMatch = belongsToManyMatch[3].match(/otherKey:\s*['"]([\w_]+)['"]/);

        associations.push({
          type: 'belongsToMany',
          target: belongsToManyMatch[2],
          through: throughMatch ? throughMatch[1] : null,
          foreignKey: foreignKeyMatch ? foreignKeyMatch[1] : null,
          otherKey: otherKeyMatch ? otherKeyMatch[1] : null
        });
        currentLine = '';
        continue;
      }

      // belongsTo
      const belongsToMatch = currentLine.match(/(\w+)\.belongsTo\(models\.(\w+),\s*\{([^}]*)\}\)/);
      if (belongsToMatch) {
        const foreignKeyMatch = belongsToMatch[3].match(/foreignKey:\s*['"]([\w_]+)['"]/);

        associations.push({
          type: 'belongsTo',
          target: belongsToMatch[2],
          foreignKey: foreignKeyMatch ? foreignKeyMatch[1] : null
        });
        currentLine = '';
        continue;
      }

      // hasMany
      const hasManyMatch = currentLine.match(/(\w+)\.hasMany\(models\.(\w+),\s*\{([^}]*)\}\)/);
      if (hasManyMatch) {
        const foreignKeyMatch = hasManyMatch[3].match(/foreignKey:\s*['"]([\w_]+)['"]/);

        associations.push({
          type: 'hasMany',
          target: hasManyMatch[2],
          foreignKey: foreignKeyMatch ? foreignKeyMatch[1] : null
        });
        currentLine = '';
        continue;
      }

      // hasOne
      const hasOneMatch = currentLine.match(/(\w+)\.hasOne\(models\.(\w+),\s*\{([^}]*)\}\)/);
      if (hasOneMatch) {
        const foreignKeyMatch = hasOneMatch[3].match(/foreignKey:\s*['"]([\w_]+)['"]/);

        associations.push({
          type: 'hasOne',
          target: hasOneMatch[2],
          foreignKey: foreignKeyMatch ? foreignKeyMatch[1] : null
        });
        currentLine = '';
        continue;
      }

      currentLine = '';
    }
  }

  return associations;
}

// Criar nova model
async function createModel(req, res) {
  try {
    const db = getDb();
    const ModelDefinition = db.ModelDefinition;
    
    const { name, className, fields, associations, options, module } = req.body;

    if (!name || !className) {
      return res.status(400).json({ message: 'Nome e className são obrigatórios' });
    }

    // Determinar caminho baseado no módulo
    let targetModelsPath, filePath;
    if (module) {
      const { loadModules } = require('../utils/moduleLoader');
      const modules = loadModules();
      const moduleExists = modules.find(m => m.name === module && m.enabled);

      if (!moduleExists) {
        return res.status(400).json({
          message: `Módulo "${module}" não existe ou não está habilitado. Crie o módulo primeiro.`
        });
      }

      const modulePath = path.join(__dirname, '../../../modules', module, 'models');
      if (!fs.existsSync(modulePath)) {
        return res.status(400).json({
          message: `Diretório de models do módulo "${module}" não encontrado`
        });
      }
      targetModelsPath = modulePath;
      filePath = path.join(modulePath, `${name}.js`);
    } else {
      targetModelsPath = modelsPath;
      filePath = path.join(modelsPath, `${name}.js`);
    }

    if (fs.existsSync(filePath)) {
      return res.status(400).json({ message: 'Model já existe' });
    }

    // Gerar conteúdo do arquivo
    const content = generateModelFile(name, className, fields || [], associations || [], options || {});

    // Salvar arquivo
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
        isSystem: false,
        module: module || null
      });
    } catch (dbError) {
      console.error('Erro ao salvar definição no banco:', dbError);
      // Não falhar a criação se o banco não estiver disponível
    }

    res.json({
      message: 'Model criada com sucesso',
      content: content,
      module: module || null,
      filePath: filePath
    });
  } catch (error) {
    console.error('Erro ao criar model:', error);
    res.status(500).json({ message: 'Erro ao criar model', error: error.message });
  }
}

// Atualizar model
async function updateModel(req, res) {
  try {
    const db = getDb();
    const ModelDefinition = db.ModelDefinition;
    
    const { name } = req.params;
    const { className, fields, associations, options } = req.body;

    // Normalizar nome da model (singular/plural)
    const normalizedName = normalizeModelName(name);

    if (!normalizedName) {
      return res.status(404).json({ message: `Model "${name}" não encontrada` });
    }

    // Encontrar o arquivo da model em todos os módulos
    const fileInfo = findModelFilePath(normalizedName);

    if (!fileInfo || !fs.existsSync(fileInfo.path)) {
      return res.status(404).json({ message: 'Model não encontrada em nenhum módulo' });
    }

    // Verificar se é uma model de sistema
    const content = fs.readFileSync(fileInfo.path, 'utf8');
    if (isSystemModel(normalizedName, content)) {
      return res.status(403).json({ message: 'Não é possível editar models de sistema' });
    }

    // Gerar conteúdo do arquivo
    const newContent = generateModelFile(normalizedName, className, fields, associations, options);

    // Salvar arquivo no mesmo local onde foi encontrado
    fs.writeFileSync(fileInfo.path, newContent, 'utf8');

    // Atualizar definição no banco de dados
    try {
      await ModelDefinition.upsert({
        name: normalizedName,
        className: className,
        definition: {
          fields: fields || [],
          associations: associations || [],
          options: options || {}
        },
        isSystem: false,
        module: fileInfo.module || null
      });
    } catch (dbError) {
      console.error('Erro ao atualizar definição no banco:', dbError);
      // Não falhar a atualização se o banco não estiver disponível
    }

    res.json({
      message: 'Model atualizada com sucesso',
      content: newContent,
      module: fileInfo.module || null,
      filePath: fileInfo.path
    });
  } catch (error) {
    console.error('Erro ao atualizar model:', error);
    res.status(500).json({ message: 'Erro ao atualizar model', error: error.message });
  }
}

// Gerar conteúdo do arquivo de model
/**
 * Gera o prefixo da tabela baseado no nome do módulo
 * Ex: "person" -> "per_", "locations" -> "loc_", "system" -> "sys_"
 */
function getModulePrefix(moduleName) {
  if (!moduleName) return '';
  const name = String(moduleName).toLowerCase();
  // Pegar primeiras 3 letras do módulo
  return name.substring(0, 3) + '_';
}

/**
 * Gera o nome da tabela com prefixo do módulo e em minúsculas
 */
function generateTableName(modelName, moduleName, options) {
  let tableName;

  // Se já tem tableName nas options, usar ele como base
  if (options?.tableName) {
    tableName = String(options.tableName).toLowerCase();
  } else {
    // Gerar nome da tabela
    tableName = modelName;

    // Verificar se já está no plural (termina com 's' ou 'es')
    if (!tableName.endsWith('s') && !tableName.endsWith('es')) {
      tableName = `${tableName}s`;
    }

    // Converter para minúsculas
    tableName = tableName.toLowerCase();
  }

  // SEMPRE adicionar prefixo do módulo se fornecido (mesmo se tableName foi especificado nas options)
  if (moduleName) {
    const prefix = getModulePrefix(moduleName);
    // Verificar se já tem o prefixo
    if (!tableName.startsWith(prefix)) {
      tableName = prefix + tableName;
    }
  }

  return tableName;
}

function generateModelFile(name, className, fields, associations, options, moduleName) {
  const modelName = className || name.charAt(0).toUpperCase() + name.slice(1);
  const tableName = generateTableName(modelName, moduleName, options);

  let content = `'use strict';\n`;
  content += `const {\n`;
  content += `  Model\n`;
  content += `} = require('sequelize');\n`;
  content += `module.exports = (sequelize, DataTypes) => {\n`;
  content += `  class ${modelName} extends Model {\n`;
  content += `    /**\n`;
  content += `     * Helper method for defining associations.\n`;
  content += `     * This method is not a part of Sequelize lifecycle.\n`;
  content += `     * The ${modelName} \`models/index\` file will call this method automatically.\n`;
  content += `     */\n`;
  content += `    static associate(models) {\n`;

  // Gerar associações com verificações de segurança
  if (associations && associations.length > 0) {
    associations.forEach(assoc => {
      // Adicionar verificação condicional antes de cada associação
      content += `      // Verificar se a model existe antes de associar\n`;
      content += `      if (models.${assoc.target}) {\n`;

      if (assoc.type === 'belongsToMany') {
        content += `        ${modelName}.belongsToMany(models.${assoc.target}, { `;
        if (assoc.through) content += `through: '${assoc.through}', `;
        if (assoc.foreignKey) content += `foreignKey: '${assoc.foreignKey}', `;
        if (assoc.otherKey) content += `otherKey: '${assoc.otherKey}'`;
        content += ` });\n`;
      } else if (assoc.type === 'belongsTo') {
        content += `        ${modelName}.belongsTo(models.${assoc.target}, { `;
        if (assoc.foreignKey) content += `foreignKey: '${assoc.foreignKey}', `;
        // Adicionar alias se não especificado
        const alias = assoc.as || assoc.target;
        content += `as: '${alias}'`;
        content += ` });\n`;
      } else if (assoc.type === 'hasMany') {
        content += `        ${modelName}.hasMany(models.${assoc.target}, { `;
        if (assoc.foreignKey) content += `foreignKey: '${assoc.foreignKey}'`;
        content += ` });\n`;
      } else if (assoc.type === 'hasOne') {
        content += `        ${modelName}.hasOne(models.${assoc.target}, { `;
        if (assoc.foreignKey) content += `foreignKey: '${assoc.foreignKey}'`;
        content += ` });\n`;
      }

      // Fechar o if
      content += `      }\n`;
    });
  }

  content += `    }\n`;
  content += `  }\n`;
  content += `  ${modelName}.init({\n`;

  // Gerar campos
  if (fields && fields.length > 0) {
    fields.forEach((field, index) => {
      content += `    ${field.name}: `;

      const isEnum = field.type.toUpperCase() === 'ENUM';
      const hasValues = isEnum && field.values && Array.isArray(field.values) && field.values.length > 0;

      if (field.primaryKey || field.autoIncrement || field.references || field.allowNull === false || isEnum) {
        // Campo com opções
        content += `{\n`;
        if (isEnum && hasValues) {
          // ENUM com valores definidos
          const enumValues = field.values.map(v => `'${v}'`).join(', ');
          content += `      type: DataTypes.ENUM(${enumValues})`;
        } else if (isEnum) {
          // ENUM sem valores - usar valores padrão baseados no nome do campo
          let defaultValues = ['VALOR1', 'VALOR2'];
          if (field.name.toLowerCase().includes('sexo')) {
            defaultValues = ['M', 'F', 'OUTRO'];
          } else if (field.name.toLowerCase().includes('estado_civil') || field.name.toLowerCase().includes('estadocivil')) {
            defaultValues = ['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL'];
          }
          const enumValues = defaultValues.map(v => `'${v}'`).join(', ');
          content += `      type: DataTypes.ENUM(${enumValues})`;
        } else {
          content += `      type: DataTypes.${field.type.toUpperCase()}`;
        }
        if (field.primaryKey) content += `,\n      primaryKey: true`;
        if (field.autoIncrement) content += `,\n      autoIncrement: true`;
        if (field.allowNull === false) content += `,\n      allowNull: false`;
        if (field.references) {
          content += `,\n      references: {\n`;
          content += `        model: '${field.references.model}',\n`;
          content += `        key: '${field.references.key}'\n`;
          content += `      }`;
        }
        content += `\n    }`;
      } else {
        // Campo simples
        content += `DataTypes.${field.type.toUpperCase()}`;
      }

      if (index < fields.length - 1) content += `,`;
      content += `\n`;
    });
  }

  content += `  }, {\n`;
  content += `    sequelize,\n`;
  content += `    modelName: '${modelName}'`;
  if (options?.tableName) {
    content += `,\n    tableName: '${options.tableName}'`;
  }
  content += `\n  });\n`;
  content += `  return ${modelName};\n`;
  content += `};\n`;

  return content;
}

// Gerar migration
async function generateMigration(req, res) {
  try {
    const db = getDb();
    const ModelDefinition = db.ModelDefinition;
    
    // O name vem do parâmetro da URL (req.params.name), não do body
    const name = req.params.name;
    const { fields, isNew, className, options, associations, module: moduleFromBody } = req.body;

    // Validar parâmetros obrigatórios
    if (!name) {
      return res.status(400).json({
        message: 'Nome da model é obrigatório',
        error: 'Parâmetro "name" não fornecido na URL'
      });
    }

    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({
        message: 'Campos da model são obrigatórios',
        error: 'Parâmetro "fields" deve ser um array'
      });
    }

    if (typeof isNew !== 'boolean') {
      return res.status(400).json({
        message: 'Parâmetro isNew é obrigatório',
        error: 'Parâmetro "isNew" deve ser um boolean'
      });
    }

    // Tentar obter o módulo do body, se não tiver, buscar da ModelDefinition
    let module = moduleFromBody;
    if (!module) {
      try {
        const normalizedName = normalizeModelName(name);
        const modelDef = await ModelDefinition.findOne({ where: { name: normalizedName } });
        if (modelDef && modelDef.module) {
          module = modelDef.module;
          console.log(`[generateMigration] Módulo obtido da ModelDefinition: ${module}`);
        } else {
          // Tentar buscar do arquivo
          const fileInfo = findModelFilePath(normalizedName);
          if (fileInfo && fileInfo.module) {
            module = fileInfo.module;
            console.log(`[generateMigration] Módulo obtido do arquivo: ${module}`);
          }
        }
      } catch (dbError) {
        console.log('[generateMigration] Erro ao buscar módulo da ModelDefinition:', dbError.message);
        // Tentar buscar do arquivo como fallback
        try {
          const normalizedName = normalizeModelName(name);
          const fileInfo = findModelFilePath(normalizedName);
          if (fileInfo && fileInfo.module) {
            module = fileInfo.module;
            console.log(`[generateMigration] Módulo obtido do arquivo (fallback): ${module}`);
          }
        } catch (fileError) {
          console.log('[generateMigration] Erro ao buscar módulo do arquivo:', fileError.message);
        }
      }
    }

    // Determinar caminho baseado no módulo
    let migrationsPath;
    if (module) {
      const { loadModules } = require('../utils/moduleLoader');
      const modules = loadModules();
      const moduleExists = modules.find(m => m.name === module && m.enabled);

      if (!moduleExists) {
        return res.status(400).json({
          message: `Módulo "${module}" não existe ou não está habilitado`,
          error: 'Módulo inválido'
        });
      }

      migrationsPath = path.join(__dirname, '../../../modules', module, 'migrations');
      if (!fs.existsSync(migrationsPath)) {
        return res.status(400).json({
          message: `Diretório de migrations do módulo "${module}" não encontrado`,
          error: 'Diretório não existe'
        });
      }
    } else {
      migrationsPath = path.join(__dirname, '../../../migrations');
    }

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '');
    const nameLower = String(name).toLowerCase();
    const migrationName = isNew
      ? `${timestamp}-create-${nameLower}.js`
      : `${timestamp}-modify-${nameLower}.js`;

    const migrationPath = path.join(migrationsPath, migrationName);

    let migrationContent = `'use strict';\n`;
    migrationContent += `/** @type {import('sequelize-cli').Migration} */\n`;
    migrationContent += `module.exports = {\n`;
    migrationContent += `  async up(queryInterface, Sequelize) {\n`;

    if (isNew) {
      // Tentar obter tableName das options ou usar o padrão
      let tableName = options?.tableName;

      if (!tableName) {
        // Tentar buscar do arquivo do modelo (buscar em todos os módulos)
        const normalizedName = normalizeModelName(name);
        const fileInfo = findModelFilePath(normalizedName);

        if (fileInfo && fs.existsSync(fileInfo.path)) {
          const modelContent = fs.readFileSync(fileInfo.path, 'utf8');
          // Procurar por tableName no arquivo
          const tableNameMatch = modelContent.match(/tableName:\s*['"]([\w]+)['"]/);
          if (tableNameMatch) {
            tableName = tableNameMatch[1];
          }
        }

        // Se ainda não encontrou, usar a mesma lógica do generateModelFile
        if (!tableName) {
          const modelName = className || name.charAt(0).toUpperCase() + name.slice(1);
          tableName = generateTableName(modelName, module, options);
        }
      }

      // Garantir que tableName está em minúsculas
      tableName = String(tableName).toLowerCase();

      migrationContent += `    await queryInterface.createTable('${tableName}', {\n`;

      fields.forEach((field, index) => {
        // Validar que o campo tem nome e tipo
        if (!field.name || !field.type) {
          console.warn(`Campo inválido ignorado:`, field);
          return;
        }

        migrationContent += `      ${field.name}: {\n`;
        migrationContent += `        type: Sequelize.${String(field.type).toUpperCase()}`;
        if (field.allowNull === false) migrationContent += `,\n        allowNull: false`;
        if (field.primaryKey) migrationContent += `,\n        primaryKey: true`;
        if (field.autoIncrement) migrationContent += `,\n        autoIncrement: true`;
        if (field.references) {
          migrationContent += `,\n        references: {\n`;
          migrationContent += `          model: '${field.references.model}',\n`;
          migrationContent += `          key: '${field.references.key}'\n`;
          migrationContent += `        }`;
        }
        migrationContent += `\n      }`;
        if (index < fields.length - 1) migrationContent += `,`;
        migrationContent += `\n`;
      });

      migrationContent += `      createdAt: {\n`;
      migrationContent += `        allowNull: false,\n`;
      migrationContent += `        type: Sequelize.DATE\n`;
      migrationContent += `      },\n`;
      migrationContent += `      updatedAt: {\n`;
      migrationContent += `        allowNull: false,\n`;
      migrationContent += `        type: Sequelize.DATE\n`;
      migrationContent += `      }\n`;

      migrationContent += `    });\n`;
    } else {
      // Modificar tabela existente - adicionar campos novos
      // Obter tableName
      let tableName = options?.tableName;

      if (!tableName) {
        const modelsPath = path.join(__dirname, '../../../models');
        const modelFile = path.join(modelsPath, `${name}.js`);

        if (fs.existsSync(modelFile)) {
          const modelContent = fs.readFileSync(modelFile, 'utf8');
          const tableNameMatch = modelContent.match(/tableName:\s*['"]([\w]+)['"]/);
          if (tableNameMatch) {
            tableName = tableNameMatch[1];
          }
        }

        if (!tableName) {
          const modelName = className || name.charAt(0).toUpperCase() + name.slice(1);
          if (modelName.endsWith('s') || modelName.endsWith('es')) {
            tableName = modelName;
          } else {
            tableName = `${modelName}s`;
          }
        }
      }

      // Processar associações belongsTo para adicionar campos de foreign key
      const associations = req.body.associations || [];
      const belongsToAssociations = associations.filter(a => a.type === 'belongsTo');

      // Criar um mapa de campos existentes (assumindo que já estão no fields)
      const existingFieldNames = new Set();

      // Adicionar campos novos que não existem na tabela
      // Ignorar apenas campos que sempre existem (id, createdAt, updatedAt)
      const fieldsToAdd = fields.filter(field => {
        if (!field.name || !field.type) {
          return false; // Ignorar campos inválidos
        }
        // Ignorar campos que sempre existem (id, createdAt, updatedAt)
        if (field.name === 'id' || field.name === 'createdAt' || field.name === 'updatedAt') {
          return false;
        }
        return true; // Adicionar todos os outros campos (incluindo pais_id se estiver em fields)
      });

      // Adicionar campos de foreign key de associações belongsTo que não estão em fields
      belongsToAssociations.forEach(assoc => {
        const foreignKey = assoc.foreignKey || `${assoc.target.toLowerCase()}_id`;
        // Verificar se o campo já está em fieldsToAdd (já foi adicionado)
        const alreadyAdded = fieldsToAdd.some(f => f.name === foreignKey);
        if (!alreadyAdded) {
          // Verificar também se está em fields original
          const fieldExists = fields.some(f => f.name === foreignKey);
          if (!fieldExists) {
            // Adicionar campo de foreign key
            fieldsToAdd.push({
              name: foreignKey,
              type: 'INTEGER',
              allowNull: assoc.allowNull !== false,
              references: {
                model: assoc.target,
                key: 'id'
              }
            });
          }
        }
      });

      // Log para debug
      console.log(`[generateMigration] Modificando tabela ${tableName}`);
      console.log(`[generateMigration] Campos recebidos:`, fields.map(f => f.name).join(', '));
      console.log(`[generateMigration] Associações belongsTo:`, belongsToAssociations.map(a => `${a.target} (${a.foreignKey || `${a.target.toLowerCase()}_id`})`).join(', '));
      console.log(`[generateMigration] Campos a adicionar:`, fieldsToAdd.map(f => f.name).join(', '));

      // Gerar comandos para adicionar cada campo
      if (fieldsToAdd.length > 0) {
        fieldsToAdd.forEach((field, index) => {
          if (!field.name || !field.type) {
            console.warn(`[generateMigration] Campo inválido ignorado:`, field);
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
      // Usar o mesmo tableName usado no up()
      let tableName = options?.tableName;

      if (!tableName) {
        // Tentar buscar do arquivo do modelo (buscar em todos os módulos)
        const normalizedName = normalizeModelName(name);
        const fileInfo = findModelFilePath(normalizedName);

        if (fileInfo && fs.existsSync(fileInfo.path)) {
          const modelContent = fs.readFileSync(fileInfo.path, 'utf8');
          const tableNameMatch = modelContent.match(/tableName:\s*['"]([\w]+)['"]/);
          if (tableNameMatch) {
            tableName = tableNameMatch[1];
          }
        }

        if (!tableName) {
          const modelName = className || name.charAt(0).toUpperCase() + name.slice(1);
          if (modelName.endsWith('s') || modelName.endsWith('es')) {
            tableName = modelName;
          } else {
            tableName = `${modelName}s`;
          }
        }
      }

      migrationContent += `    await queryInterface.dropTable('${tableName}');\n`;
    } else {
      // Rollback: remover campos adicionados
      let tableName = options?.tableName;

      if (!tableName) {
        const modelsPath = path.join(__dirname, '../../../models');
        const modelFile = path.join(modelsPath, `${name}.js`);

        if (fs.existsSync(modelFile)) {
          const modelContent = fs.readFileSync(modelFile, 'utf8');
          const tableNameMatch = modelContent.match(/tableName:\s*['"]([\w]+)['"]/);
          if (tableNameMatch) {
            tableName = tableNameMatch[1];
          }
        }

        if (!tableName) {
          const modelName = className || name.charAt(0).toUpperCase() + name.slice(1);
          if (modelName.endsWith('s') || modelName.endsWith('es')) {
            tableName = modelName;
          } else {
            tableName = `${modelName}s`;
          }
        }
      }

      // Processar associações belongsTo para remover campos de foreign key
      const associations = req.body.associations || [];
      const belongsToAssociations = associations.filter(a => a.type === 'belongsTo');

      const fieldsToRemove = fields.filter(field => {
        if (field.name === 'id' || field.name === 'createdAt' || field.name === 'updatedAt') {
          return false;
        }
        return true;
      });

      // Adicionar campos de foreign key de associações belongsTo
      belongsToAssociations.forEach(assoc => {
        const foreignKey = assoc.foreignKey || `${assoc.target.toLowerCase()}_id`;
        const fieldExists = fields.some(f => f.name === foreignKey);
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

    res.json({
      message: 'Migration gerada com sucesso',
      file: migrationName,
      path: migrationPath,
      module: module || null
    });
  } catch (error) {
    console.error('Erro ao gerar migration:', error);
    res.status(500).json({ message: 'Erro ao gerar migration', error: error.message });
  }
}

// Gerar seeder
async function generateSeeder(req, res) {
  try {
    const { name, data, module, className, tableName } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Nome da model é obrigatório' });
    }

    // Determinar caminho baseado no módulo
    let seedersPath;
    if (module) {
      const { loadModules } = require('../utils/moduleLoader');
      const modules = loadModules();
      const moduleExists = modules.find(m => m.name === module && m.enabled);

      if (!moduleExists) {
        return res.status(400).json({ message: `Módulo "${module}" não existe ou não está habilitado` });
      }

      seedersPath = path.join(__dirname, '../../../modules', module, 'seeders');
      if (!fs.existsSync(seedersPath)) {
        return res.status(400).json({ message: `Diretório de seeders do módulo "${module}" não encontrado` });
      }
    } else {
      seedersPath = path.join(__dirname, '../../../seeders');
    }

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '');
    const seederName = `${timestamp}-${name.toLowerCase()}.js`;
    const seederPath = path.join(seedersPath, seederName);

    // Determinar nome da tabela
    let finalTableName = tableName;
    if (!finalTableName) {
      if (className) {
        finalTableName = className.endsWith('s') || className.endsWith('es') ? className : `${className}s`;
      } else {
        finalTableName = `${name.charAt(0).toUpperCase() + name.slice(1)}s`;
      }
    }

    let seederContent = `'use strict';\n\n`;
    seederContent += `/** @type {import('sequelize-cli').Migration} */\n`;
    seederContent += `module.exports = {\n`;
    seederContent += `  async up (queryInterface, Sequelize) {\n`;
    seederContent += `    await queryInterface.bulkInsert('${tableName}', [\n`;

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

    res.json({
      message: 'Seeder gerado com sucesso',
      file: seederName,
      path: seederPath,
      module: module || null,
      tableName: finalTableName
    });
  } catch (error) {
    console.error('Erro ao gerar seeder:', error);
    res.status(500).json({ message: 'Erro ao gerar seeder', error: error.message });
  }
}

// Executar migrations
async function runMigrations(req, res) {
  try {
    const { execSync } = require('child_process');
    const result = execSync('npm run db:migrate', {
      cwd: process.cwd(),
      encoding: 'utf8'
    });
    res.json({ message: 'Migrations executadas com sucesso', output: result });
  } catch (error) {
    console.error('Erro ao executar migrations:', error);
    res.status(500).json({ message: 'Erro ao executar migrations', error: error.message, output: error.stdout || error.stderr });
  }
}

// Executar seeders
async function runSeeders(req, res) {
  try {
    const { execSync } = require('child_process');
    const result = execSync('npm run db:seed', {
      cwd: process.cwd(),
      encoding: 'utf8'
    });
    res.json({ message: 'Seeders executados com sucesso', output: result });
  } catch (error) {
    console.error('Erro ao executar seeders:', error);
    res.status(500).json({ message: 'Erro ao executar seeders', error: error.message, output: error.stdout || error.stderr });
  }
}

// Recriar banco
async function recreateDatabase(req, res) {
  try {
    const { execSync } = require('child_process');
    const result = execSync('npm run db:recreate', {
      cwd: process.cwd(),
      encoding: 'utf8'
    });
    res.json({ message: 'Banco recriado com sucesso', output: result });
  } catch (error) {
    console.error('Erro ao recriar banco:', error);
    res.status(500).json({ message: 'Erro ao recriar banco', error: error.message, output: error.stdout || error.stderr });
  }
}

// Deletar model
async function deleteModel(req, res) {
  try {
    const { name } = req.params;

    // Normalizar nome da model (singular/plural)
    const normalizedName = normalizeModelName(name);

    if (!normalizedName) {
      return res.status(404).json({ message: `Model "${name}" não encontrada` });
    }

    // Verificar se é uma model de sistema
    const systemModels = ['user', 'permission', 'organization', 'role', 'system', 'crud', 'function'];
    if (systemModels.includes(normalizedName.toLowerCase())) {
      return res.status(403).json({ message: 'Não é possível excluir models de sistema' });
    }

    // Encontrar o arquivo da model em todos os módulos
    const fileInfo = findModelFilePath(normalizedName);

    if (!fileInfo || !fs.existsSync(fileInfo.path)) {
      return res.status(404).json({ message: `Model "${name}" não encontrada em nenhum módulo` });
    }

    // Ler o conteúdo para verificar se tem indicador de sistema e extrair informações
    const content = fs.readFileSync(fileInfo.path, 'utf8');
    if (content.includes('// SYSTEM MODEL') || content.includes('/* SYSTEM MODEL */')) {
      return res.status(403).json({ message: 'Não é possível excluir models de sistema' });
    }

    // Extrair informações da model antes de excluir (para criar migration de drop)
    const modelInfo = parseModelFile(content);
    const tableName = modelInfo.options?.tableName || null;
    const module = fileInfo.module || null;

    // Excluir arquivo
    fs.unlinkSync(fileInfo.path);

    // Excluir definição do banco de dados
    try {
      await ModelDefinition.destroy({ where: { name: normalizedName } });
    } catch (dbError) {
      console.error('Erro ao excluir definição do banco:', dbError);
      // Não falhar se o banco não estiver disponível
    }

    // Criar migration de drop table automaticamente
    let migrationCreated = false;
    let migrationPath = null;
    if (tableName) {
      try {
        // Determinar caminho de migrations baseado no módulo
        let migrationsPath;
        if (module) {
          const { loadModules } = require('../utils/moduleLoader');
          const modules = loadModules();
          const moduleExists = modules.find(m => m.name === module && m.enabled);

          if (moduleExists) {
            migrationsPath = path.join(__dirname, '../../../modules', module, 'migrations');
            if (!fs.existsSync(migrationsPath)) {
              fs.mkdirSync(migrationsPath, { recursive: true });
            }
          } else {
            migrationsPath = null;
          }
        } else {
          migrationsPath = path.join(__dirname, '../../../migrations');
        }

        if (migrationsPath && fs.existsSync(migrationsPath)) {
          const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '');
          const nameLower = String(normalizedName).toLowerCase();
          const migrationName = `${timestamp}-drop-${nameLower}.js`;
          migrationPath = path.join(migrationsPath, migrationName);

          // Gerar conteúdo da migration de drop
          let migrationContent = `'use strict';\n`;
          migrationContent += `/** @type {import('sequelize-cli').Migration} */\n`;
          migrationContent += `module.exports = {\n`;
          migrationContent += `  async up(queryInterface, Sequelize) {\n`;
          migrationContent += `    await queryInterface.dropTable('${tableName}');\n`;
          migrationContent += `  },\n\n`;
          migrationContent += `  async down(queryInterface, Sequelize) {\n`;
          migrationContent += `    // Esta migration remove a tabela. O rollback requer recriar a tabela manualmente.\n`;
          migrationContent += `    // Para recriar, você precisará executar a migration original de criação da tabela.\n`;
          migrationContent += `    throw new Error('Não é possível fazer rollback de uma migration de drop. Recrie a tabela manualmente se necessário.');\n`;
          migrationContent += `  }\n`;
          migrationContent += `};\n`;

          fs.writeFileSync(migrationPath, migrationContent, 'utf8');
          migrationCreated = true;
          console.log(`[deleteModel] Migration de drop criada: ${migrationPath}`);
        }
      } catch (migrationError) {
        console.error('[deleteModel] Erro ao criar migration de drop:', migrationError);
        // Não falhar a exclusão se a migration não puder ser criada
      }
    }

    res.json({
      message: 'Model excluída com sucesso',
      module: module,
      migrationCreated: migrationCreated,
      migrationPath: migrationPath
    });
  } catch (error) {
    console.error('Erro ao excluir model:', error);
    res.status(500).json({ message: 'Erro ao excluir model', error: error.message });
  }
}

// Obter todas as models com associações para gerar diagrama Mermaid (apenas models do usuário)
async function getModelsForMermaid(req, res) {
  try {
    const { loadModules } = require('../utils/moduleLoader');
    const modules = loadModules();
    const modelsData = [];

    // Coletar todas as models do usuário de todos os módulos para verificar associações
    const userModelsSet = new Set();
    const allModelFiles = [];

    // Buscar na pasta padrão
    if (fs.existsSync(modelsPath)) {
      const files = fs.readdirSync(modelsPath)
        .filter(file => file !== 'index.js' && file.endsWith('.js'))
        .map(file => ({ file, path: modelsPath, module: null }));
      allModelFiles.push(...files);
    }

    // Buscar em cada módulo
    for (const module of modules) {
      if (!module.enabled) continue;
      const moduleModelsPath = path.join(module.path, 'models');
      if (fs.existsSync(moduleModelsPath)) {
        const files = fs.readdirSync(moduleModelsPath)
          .filter(file => file.endsWith('.js'))
          .map(file => ({ file, path: moduleModelsPath, module: module.name }));
        allModelFiles.push(...files);
      }
    }

    // Primeiro passo: coletar models do usuário
    for (const { file, path: filePath, module } of allModelFiles) {
      const modelName = file.replace('.js', '');
      const fullPath = path.join(filePath, file);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Filtrar apenas models do usuário (não de sistema)
      const isSystem = module ? (modules.find(m => m.name === module)?.isSystem || isSystemModel(modelName, content)) : isSystemModel(modelName, content);

      if (!isSystem) {
        const modelInfo = parseModelFile(content);
        if (modelInfo.className) {
          userModelsSet.add(modelInfo.className);
          userModelsSet.add(modelName.toLowerCase());
        }
      }
    }

    // Segundo passo: processar apenas models do usuário e filtrar associações
    for (const { file, path: filePath, module } of allModelFiles) {
      const modelName = file.replace('.js', '');
      const fullPath = path.join(filePath, file);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Filtrar apenas models do usuário (não de sistema)
      const isSystem = module ? (modules.find(m => m.name === module)?.isSystem || isSystemModel(modelName, content)) : isSystemModel(modelName, content);

      if (isSystem) {
        continue;
      }

      // Extrair informações da model
      const modelInfo = parseModelFile(content);

      if (!modelInfo.className) continue;

      // Obter campos principais
      const importantFields = (modelInfo.fields || []).filter(f =>
        f.primaryKey ||
        (!f.name.includes('createdAt') &&
          !f.name.includes('updatedAt') &&
          !f.name.includes('deletedAt'))
      ).slice(0, 10);

      // Filtrar associações para incluir apenas relacionamentos com models do usuário
      const userAssociations = (modelInfo.associations || []).filter(assoc => {
        return userModelsSet.has(assoc.target) || userModelsSet.has(assoc.target.toLowerCase());
      });

      modelsData.push({
        name: modelName,
        className: modelInfo.className,
        tableName: modelInfo.options?.tableName || modelInfo.className,
        module: module || null,
        fields: importantFields.map(f => ({
          name: f.name,
          type: f.type,
          primaryKey: f.primaryKey,
          allowNull: f.allowNull !== false
        })),
        associations: userAssociations
      });
    }

    res.json(modelsData);
  } catch (error) {
    console.error('Erro ao obter models para Mermaid:', error);
    res.status(500).json({
      message: 'Erro ao obter models para diagrama Mermaid',
      error: error.message
    });
  }
}

module.exports = {
  getAllModels,
  getModel,
  createModel,
  updateModel,
  deleteModel,
  generateMigration,
  generateSeeder,
  runMigrations,
  runSeeders,
  recreateDatabase,
  getModelsForMermaid,
  // Exportar funções de parsing e geração para uso em outros controllers
  parseModelFile,
  parseFields,
  parseAssociations,
  parseOptions,
  generateModelFile,
  // Exportar funções auxiliares
  normalizeModelName,
  findModelFilePath
};

