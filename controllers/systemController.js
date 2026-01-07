const { Op } = require('sequelize');

// Lazy load db para evitar problemas de ordem de carregamento
function getDb() {
  const modelsLoader = require('../utils/modelsLoader');
  return modelsLoader.loadModels();
}

// Helper para logs
const logHelper = require('../utils/logHelper');

exports.getAllSystems = async (req, res) => {
  try {
    const db = getDb();
    const System = db.System;
    
    const filter = req.query.filter || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (filter) {
      let searchFields = [];
      
      if (req.query.searchFields) {
        searchFields = req.query.searchFields.split(',').map(f => f.trim()).filter(f => f);
      }
      
      if (searchFields.length === 0) {
        searchFields = ['name', 'sigla', 'description'];
      }
      
      const modelAttributes = System.rawAttributes || {};
      const validFields = searchFields.filter(fieldName => modelAttributes[fieldName]);
      
      if (validFields.length > 0) {
        where[Op.or] = validFields.map(field => ({
          [field]: { [Op.like]: `%${filter}%` }
        }));
      }
    }
    
    const { count, rows } = await System.findAndCountAll({
      where,
      limit,
      offset,
      order: [['id', 'DESC']]
    });
    
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

exports.getSystemById = async (req, res) => {
  try {
    const db = getDb();
    const System = db.System;
    
    const system = await System.findByPk(req.params.id, {
      // include: [
      // { model: Function, through: { attributes: [] } }
      // ]
    });
    if (!system) {
      return res.status(404).json({ message: 'System not found' });
    }
    res.json(system);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createSystem = async (req, res) => {
  try {
    const db = getDb();
    const System = db.System;
    const Function = db.Function;
    
    const { name, sigla, icon, logo, description, primaryColor, secondaryColor, textColor, functionIds } = req.body;
    const system = await System.create({
      name,
      sigla,
      icon,
      logo,
      description,
      primaryColor,
      secondaryColor,
      textColor
    });

    // Associar funções se fornecidas
    if (functionIds && Array.isArray(functionIds) && functionIds.length > 0) {
      await system.setFunctions(functionIds);
    }

    // Retornar sistema com funções associadas
    const systemWithFunctions = await System.findByPk(system.id, {
      include: [
        { model: Function, through: { attributes: [] } }
      ]
    });

    res.status(201).json(systemWithFunctions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSystem = async (req, res) => {
  try {
    const db = getDb();
    const System = db.System;
    
    const { name, sigla, icon, logo, description, primaryColor, secondaryColor, textColor } = req.body;
    const system = await System.findByPk(req.params.id);
    if (!system) {
      return res.status(404).json({ message: 'System not found' });
    }
    
    // Salvar dados antigos para log
    const oldData = system.get({ plain: true });
    
    if (name !== undefined) system.name = name;
    if (sigla !== undefined) system.sigla = sigla;
    if (icon !== undefined) system.icon = icon;
    if (logo !== undefined) system.logo = logo;
    if (description !== undefined) system.description = description;
    if (primaryColor !== undefined) system.primaryColor = primaryColor;
    if (secondaryColor !== undefined) system.secondaryColor = secondaryColor;
    if (textColor !== undefined) system.textColor = textColor;
    await system.save();
    
    // Registrar log de atualização
    await logHelper.logUpdate(req, 'System', system, oldData);
    
    res.json(system);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteSystem = async (req, res) => {
  try {
    const db = getDb();
    const System = db.System;
    
    const system = await System.findByPk(req.params.id);
    if (!system) {
      return res.status(404).json({ message: 'System not found' });
    }
    
    // Salvar dados antes de excluir para log
    const systemData = system.get({ plain: true });
    
    await system.destroy();
    
    // Registrar log de exclusão
    await logHelper.logDelete(req, 'System', systemData);
    
    res.status(204).json({ message: 'System deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSystemFunctions = async (req, res) => {
  try {
    const db = getDb();
    const System = db.System;
    const Function = db.Function;
    
    const { functionIds } = req.body;
    const system = await System.findByPk(req.params.id);
    if (!system) {
      return res.status(404).json({ message: 'System not found' });
    }
    await system.setFunctions(functionIds || []);
    const updatedSystem = await System.findByPk(req.params.id, {
      include: [
        { model: Function, through: { attributes: [] } }
      ]
    });
    res.json(updatedSystem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSystemFunctions = async (req, res) => {
  try {
    const db = getDb();
    const System = db.System;
    const Function = db.Function;
    
    const system = await System.findByPk(req.params.id, {
      include: [
        { model: Function, through: { attributes: [] } }
      ]
    });
    if (!system) {
      return res.status(404).json({ message: 'System not found' });
    }
    res.json(system);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSystemImage = async (req, res) => {
  try {
    const db = getDb();
    const System = db.System;
    
    const { sigla, type } = req.params; // type será 'icon' ou 'logo'

    if (!['icon', 'logo'].includes(type)) {
      return res.status(400).json({ message: 'Invalid image type. Use "icon" or "logo"' });
    }

    const system = await System.findOne({ where: { sigla } });

    if (!system) {
      return res.status(404).json({ message: 'System not found' });
    }

    const imageBase64 = system[type];

    if (!imageBase64) {
      return res.status(404).json({ message: `${type} not found for this system` });
    }

    // Se a imagem já vier com o prefixo data:, retornar diretamente
    // Senão, adicionar o prefixo
    let imageData = imageBase64;
    if (!imageBase64.startsWith('data:')) {
      imageData = `data:image/png;base64,${imageBase64}`;
    }

    // Retornar a imagem base64
    res.json({
      image: imageData,
      type: 'image/png'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
