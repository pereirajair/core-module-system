
const { Op } = require('sequelize');

// Lazy load db para evitar problemas de ordem de carregamento
function getDb() {
  const modelsLoader = require('../utils/modelsLoader');
  return modelsLoader.loadModels();
}

exports.getAllFunctions = async (req, res) => {
  try {
    const db = getDb();
    const Function = db.Function;
    const Role = db.Role;
    
    const filter = req.query.filter || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (filter) {
      // Obter campos pesquisáveis do query param ou usar padrão
      let searchFields = [];
      
      if (req.query.searchFields) {
        // Campos enviados pelo frontend (colunas exibidas)
        searchFields = req.query.searchFields.split(',').map(f => f.trim()).filter(f => f);
      }
      
      // Se não houver campos específicos, usar campos padrão da model Function
      if (searchFields.length === 0) {
        searchFields = ['name', 'title'];
      }
      
      // Construir query OR apenas com campos que existem na model
      const modelAttributes = Function.rawAttributes || {};
      const validFields = searchFields.filter(fieldName => modelAttributes[fieldName]);
      
      if (validFields.length > 0) {
        where[Op.or] = validFields.map(field => ({
          [field]: { [Op.like]: `%${filter}%` }
        }));
      }
    }
    
    // Buscar com paginação e filtro
    const { count, rows } = await Function.findAndCountAll({
      where,
      limit,
      offset,
      order: [['id', 'DESC']]
    });
    
    // Retornar no formato esperado pelo CrudViewer
    res.json({
      data: rows,
      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFunctionById = async (req, res) => {
  try {
    const db = getDb();
    const Function = db.Function;
    
    const func = await Function.findByPk(req.params.id);
    if (!func) {
      return res.status(404).json({ message: 'Function not found' });
    }
    res.json(func);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createFunction = async (req, res) => {
  try {
    const db = getDb();
    const Function = db.Function;
    
    const { name, title } = req.body;
    const func = await Function.create({ name, title });
    res.status(201).json(func);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateFunction = async (req, res) => {
  try {
    const db = getDb();
    const Function = db.Function;
    
    const { name, title } = req.body;
    const func = await Function.findByPk(req.params.id);
    if (!func) {
      return res.status(404).json({ message: 'Function not found' });
    }
    func.name = name;
    func.title = title;
    await func.save();
    res.json(func);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteFunction = async (req, res) => {
  try {
    const db = getDb();
    const Function = db.Function;
    
    const func = await Function.findByPk(req.params.id);
    if (!func) {
      return res.status(404).json({ message: 'Function not found' });
    }
    await func.destroy();
    res.status(204).json({ message: 'Function deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

