// Importar db dinamicamente para garantir que sempre tenha os modelos mais recentes
const pathResolver = require('../utils/pathResolver');
const backendPath = pathResolver.getBackendPath();
let db = require(pathResolver.resolveModelsPath());
const { Op } = require(backendPath + '/node_modules/sequelize');
const { updateHasManyAssociations } = require('../utils/associationUtils');

// Função para recarregar db quando necessário
function reloadDb() {
  // Limpar cache do models/index.js
  const modelsIndexPath = require.resolve('../../../models/index.js');
  if (require.cache[modelsIndexPath]) {
    delete require.cache[modelsIndexPath];
  }
  // Recarregar db
  db = require(pathResolver.resolveModelsPath());
}

// Controller genérico para CRUDs dinâmicos
async function handleDynamicCrud(req, res, next) {
  try {
    // Recarregar db para garantir que temos os modelos mais recentes
    reloadDb();

    const { resource } = req.params;
    const method = req.method;

    // Buscar o CRUD pelo resource ou endpoint
    const crud = await db.Crud.findOne({
      where: {
        [Op.or]: [
          { resource: resource },
          { endpoint: `/api/${resource}` },
          { endpoint: `/${resource}` }
        ],
        active: true
      }
    });

    if (!crud) {
      return res.status(404).json({
        message: 'CRUD não encontrado',
        errors: [{ path: req.path, message: 'not found' }]
      });
    }

    // Obter o nome da model do resource
    const modelName = crud.resource;

    // Função auxiliar para normalizar nome de model (singular/plural)
    function normalizeModelNameForSequelize(name) {
      if (!name) return null;

      const nameLower = name.toLowerCase();
      const availableModels = Object.keys(db).filter(k => !['sequelize', 'Sequelize'].includes(k));

      // Tentar nome exato primeiro (case-insensitive)
      const exactMatch = availableModels.find(m => m.toLowerCase() === nameLower);
      if (exactMatch) return exactMatch;

      // Tentar plural (adicionar 's' ou 'es')
      const plural1 = nameLower + 's';
      const pluralMatch1 = availableModels.find(m => m.toLowerCase() === plural1);
      if (pluralMatch1) return pluralMatch1;

      const plural2 = nameLower + 'es';
      const pluralMatch2 = availableModels.find(m => m.toLowerCase() === plural2);
      if (pluralMatch2) return pluralMatch2;

      // Tentar singular (remover 's' ou 'es')
      if (nameLower.endsWith('es') && nameLower.length > 2) {
        const singular1 = nameLower.slice(0, -2);
        const singularMatch1 = availableModels.find(m => m.toLowerCase() === singular1);
        if (singularMatch1) return singularMatch1;
      }

      if (nameLower.endsWith('s') && nameLower.length > 1) {
        const singular2 = nameLower.slice(0, -1);
        const singularMatch2 = availableModels.find(m => m.toLowerCase() === singular2);
        if (singularMatch2) return singularMatch2;
      }

      // Casos especiais
      const specialCases = {
        'pessoa': 'Pessoa',
        'pessoas': 'Pessoa',
        'endereco': 'Endereco',
        'enderecos': 'Endereco'
      };

      if (specialCases[nameLower]) {
        const normalized = specialCases[nameLower];
        if (availableModels.includes(normalized)) return normalized;
      }

      // Tentar capitalizar primeira letra
      const capitalized = nameLower.charAt(0).toUpperCase() + nameLower.slice(1);
      if (availableModels.includes(capitalized)) return capitalized;

      return null;
    }

    // Tentar encontrar o modelo com normalização
    let Model = null;
    const normalizedName = normalizeModelNameForSequelize(modelName);

    if (normalizedName && db[normalizedName]) {
      Model = db[normalizedName];
    } else {
      // Fallback: tentar variações básicas
      const possibleNames = [
        modelName.charAt(0).toUpperCase() + modelName.slice(1), // Pessoa
        modelName.toLowerCase(), // pessoa
        modelName, // pessoa (original)
        modelName.charAt(0).toUpperCase() + modelName.slice(1).toLowerCase() // Pessoa (capitalizado)
      ];

      for (const name of possibleNames) {
        if (db[name]) {
          Model = db[name];
          break;
        }
      }
    }

    if (!Model) {
      const availableModels = Object.keys(db).filter(k => !['sequelize', 'Sequelize'].includes(k));
      return res.status(404).json({
        message: `Model "${modelName}" não encontrada. Modelos disponíveis: ${availableModels.join(', ')}`,
        errors: [{ path: req.path, message: 'Model not found' }]
      });
    }

    // Obter configuração do CRUD para verificar relações
    const crudConfig = crud.config || {};
    const relations = crudConfig.relations || [];

    // Função auxiliar para preparar includes baseado nas relações do CRUD
    function prepareIncludes(Model, relations) {
      const includes = [];

      // Primeiro, tentar usar relações definidas no CRUD config
      if (relations && Array.isArray(relations) && relations.length > 0) {
        relations.forEach(relation => {
          // Tentar encontrar o modelo relacionado
          // Verificar modelName primeiro (usado em relações do tipo select)
          const relationModelName = relation.modelName || relation.model || relation.field;
          let RelatedModel = null;

          if (relationModelName) {
            // Tentar diferentes variações do nome
            const possibleRelationNames = [
              relationModelName.charAt(0).toUpperCase() + relationModelName.slice(1),
              relationModelName.toLowerCase(),
              relationModelName
            ];

            for (const relName of possibleRelationNames) {
              if (db[relName]) {
                RelatedModel = db[relName];
                break;
              }
            }

            // Tentar normalizar usando a função de normalização
            if (!RelatedModel) {
              const normalizedRelName = normalizeModelNameForSequelize(relationModelName);
              if (normalizedRelName && db[normalizedRelName]) {
                RelatedModel = db[normalizedRelName];
              }
            }
          }

          // Se não encontrar pelo nome, tentar pelo campo (ex: Organization para id_organization)
          if (!RelatedModel && relation.field) {
            const fieldName = relation.field.toLowerCase();
            if (fieldName.includes('organization')) {
              RelatedModel = db.Organization;
            } else if (fieldName.includes('system')) {
              RelatedModel = db.System;
            } else if (fieldName.includes('role')) {
              RelatedModel = db.Role;
            } else if (fieldName.includes('pais') || fieldName.includes('country')) {
              RelatedModel = db.Countries || db.Country;
            }
          }

          // Se ainda não encontrou e é uma relação do tipo select, tentar usar o payloadField
          if (!RelatedModel && relation.type === 'select' && relation.payloadField) {
            const payloadField = relation.payloadField.toLowerCase();
            // Extrair o nome do modelo do payloadField (ex: pais_id -> Pais, country_id -> Country)
            if (payloadField.includes('pais') || payloadField.includes('country')) {
              RelatedModel = db.Countries || db.Country;
            } else if (payloadField.includes('organization')) {
              RelatedModel = db.Organization;
            } else if (payloadField.includes('system')) {
              RelatedModel = db.System;
            } else if (payloadField.includes('role')) {
              RelatedModel = db.Role;
            }
          }

          if (RelatedModel) {
            // Para relações belongsTo (select), usar o nome da associação definida na model
            let associationName = relation.as;

            // Se não tiver as definido, tentar inferir do modelName ou do nome do modelo
            if (!associationName) {
              if (relation.field) {
                // Usar o campo da relação (ex: 'Country')
                associationName = relation.field;
              } else if (relation.modelName) {
                // Usar o nome do modelo com primeira letra maiúscula (ex: pais -> Pais)
                associationName = relation.modelName.charAt(0).toUpperCase() + relation.modelName.slice(1);
              } else if (relation.payloadField) {
                // Extrair nome da associação do payloadField (ex: pais_id -> Pais)
                const fieldParts = relation.payloadField.split('_');
                if (fieldParts.length > 0) {
                  const modelPart = fieldParts[0];
                  associationName = modelPart.charAt(0).toUpperCase() + modelPart.slice(1);
                }
              } else {
                // Usar o nome do modelo relacionado como padrão
                associationName = RelatedModel.name;
              }
            }

            includes.push({
              model: RelatedModel,
              as: associationName,
              required: false // LEFT JOIN para não excluir registros sem relação
            });
          }
        });
      }

      // Se não houver relações no CRUD config, tentar detectar automaticamente pelas associações da model
      if (includes.length === 0 && Model.associations) {
        // Verificar associações belongsTo (mais comum para exibir dados relacionados)
        Object.keys(Model.associations).forEach(assocName => {
          const association = Model.associations[assocName];
          if (association && association.associationType === 'BelongsTo') {
            const targetModel = association.target;
            if (targetModel) {
              includes.push({
                model: targetModel,
                as: assocName,
                required: false
              });
            }
          }
        });
      }

      return includes;
    }

    // Executar operação baseada no método HTTP
    switch (method) {
      case 'GET':
        if (req.params.id) {
          // GET /api/resource/:id
          const includes = prepareIncludes(Model, relations);
          const findOptions = { where: { id: req.params.id } };

          if (includes.length > 0) {
            findOptions.include = includes;
          }

          const item = await Model.findOne(findOptions);
          if (!item) {
            return res.status(404).json({
              message: 'Item não encontrado',
              errors: [{ path: req.path, message: 'not found' }]
            });
          }
          return res.json(item);
        } else {
          // GET /api/resource (listar com paginação, filtros e ordenação)
          const page = parseInt(req.query.page) || 1;
          // Se limit não for enviado ou for 0, significa "All" - buscar todos sem paginação
          const limitParam = req.query.limit;
          const limit = limitParam && parseInt(limitParam) > 0 ? parseInt(limitParam) : null;
          const offset = limit ? (page - 1) * limit : null;
          const filter = req.query.filter || '';

          // Ordenação recebida do front (sortBy / desc)
          const sortBy = req.query.sortBy || null;
          const descParam = (req.query.desc || req.query.descending || '').toString().toLowerCase();
          const descending = descParam === 'true' || descParam === '1';

          const where = {};
          if (filter) {
            // Obter campos pesquisáveis do query param ou usar padrão
            let searchFields = [];
            
            if (req.query.searchFields) {
              // Campos enviados pelo frontend (colunas exibidas)
              searchFields = req.query.searchFields.split(',').map(f => f.trim()).filter(f => f);
            }
            
            // Obter atributos da model para validação
            const modelAttributes = Model.rawAttributes || {};
            
            // Se não houver campos específicos, tentar identificar campos de texto da model
            if (searchFields.length === 0) {
              // Obter atributos da model e filtrar apenas campos de texto
              searchFields = Object.keys(modelAttributes).filter(fieldName => {
                const attr = modelAttributes[fieldName];
                if (!attr) return false;
                
                // Ignorar campos especiais
                if (fieldName === 'id' || fieldName === 'createdAt' || fieldName === 'updatedAt' || fieldName === 'deletedAt') {
                  return false;
                }
                
                // Verificar se é um tipo de texto
                const type = attr.type?.toString() || '';
                const isTextType = type.includes('STRING') || type.includes('TEXT') || type.includes('CHAR');
                
                return isTextType;
              });
            }
            
            // Se ainda não houver campos, tentar campos padrão como fallback, mas validando existência
            if (searchFields.length === 0) {
              const defaultFields = ['name', 'title', 'email', 'nome', 'cnpj', 'razaoSocial'];
              // Filtrar apenas campos que realmente existem na model
              searchFields = defaultFields.filter(fieldName => modelAttributes[fieldName]);
            }
            
            // Construir query OR apenas com campos que existem na model (validação final)
            const validFields = searchFields.filter(fieldName => {
              return modelAttributes[fieldName];
            });
            
            if (validFields.length > 0) {
              where[Op.or] = validFields.map(field => ({
                [field]: { [Op.like]: `%${filter}%` }
              }));
            }
          }

          // Preparar includes para relações usando a função auxiliar
          const includes = prepareIncludes(Model, relations);

          // Definir ordenação padrão
          let order = [['id', 'DESC']];

          if (sortBy) {
            // 1) Campo direto da tabela principal
            if (Model.rawAttributes && Model.rawAttributes[sortBy]) {
              order = [[sortBy, descending ? 'DESC' : 'ASC']];
            } else if (typeof sortBy === 'string' && sortBy.includes('.')) {
              // 2) Campo de relação, ex: "State.name"
              // Usar o alias da associação + nome do campo diretamente
              // Isso assume que o include foi criado com o mesmo alias (ex: as: 'State')
              order = [[db.Sequelize.col(sortBy), descending ? 'DESC' : 'ASC']];
            }
          }

          const findOptions = {
            where,
            order
          };
          
          // Aplicar paginação apenas se limit foi especificado
          if (limit !== null) {
            findOptions.limit = limit;
            findOptions.offset = offset;
          }

          if (includes.length > 0) {
            findOptions.include = includes;
          }

          const { count, rows } = await Model.findAndCountAll(findOptions);

          return res.json({
            data: rows,
            count,
            page,
            limit: limit || count, // Se limit for null (All), retornar count como limit
            totalPages: limit ? Math.ceil(count / limit) : 1 // Se for "All", só há 1 página
          });
        }

      case 'POST': {
        // POST /api/resource (criar)
        const transaction = await db.sequelize.transaction();
        try {
          const newItem = await Model.create(req.body, { transaction });

          // Processar associações dinamicamente
          await updateHasManyAssociations(newItem, req.body, transaction);

          await transaction.commit();

          return res.status(201).json(newItem);
        } catch (error) {
          await transaction.rollback();
          throw error;
        }
      }

      case 'PUT':
      case 'PATCH': {
        // PUT/PATCH /api/resource/:id (atualizar)
        const transaction = await db.sequelize.transaction();
        try {
          const itemToUpdate = await Model.findByPk(req.params.id);
          if (!itemToUpdate) {
            await transaction.rollback();
            return res.status(404).json({
              message: 'Item não encontrado',
              errors: [{ path: req.path, message: 'not found' }]
            });
          }
          await itemToUpdate.update(req.body, { transaction });

          // Processar associações dinamicamente
          await updateHasManyAssociations(itemToUpdate, req.body, transaction);

          await transaction.commit();

          return res.json(itemToUpdate);
        } catch (error) {
          await transaction.rollback();
          throw error;
        }
      }

      case 'DELETE':
        // DELETE /api/resource/:id (excluir)
        const itemToDelete = await Model.findByPk(req.params.id);
        if (!itemToDelete) {
          return res.status(404).json({
            message: 'Item não encontrado',
            errors: [{ path: req.path, message: 'not found' }]
          });
        }
        await itemToDelete.destroy();
        return res.json({ message: 'Item excluído com sucesso' });

      default:
        return res.status(405).json({
          message: 'Método não permitido',
          errors: [{ path: req.path, message: 'Method not allowed' }]
        });
    }
  } catch (error) {
    console.error('Erro no dynamic CRUD controller:', error);
    return res.status(500).json({
      message: error.message,
      errors: [{ path: req.path, message: error.message }]
    });
  }
}

module.exports = {
  handleDynamicCrud
};

