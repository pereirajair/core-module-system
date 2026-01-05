const db = require('../../../models');
const Crud = db.Crud;
const { Op } = require('sequelize');

exports.getAllCruds = async (req, res) => {
  try {
    const filter = req.query.filter || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;
    
    const where = { active: true };
    if (filter) {
      let searchFields = [];
      
      if (req.query.searchFields) {
        searchFields = req.query.searchFields.split(',').map(f => f.trim()).filter(f => f);
      }
      
      if (searchFields.length === 0) {
        searchFields = ['name', 'title'];
      }
      
      const modelAttributes = Crud.rawAttributes || {};
      const validFields = searchFields.filter(fieldName => modelAttributes[fieldName]);
      
      if (validFields.length > 0) {
        where[Op.or] = validFields.map(field => ({
          [field]: { [Op.like]: `%${filter}%` }
        }));
      }
    }
    
    const { count, rows } = await Crud.findAndCountAll({
      where,
      limit,
      offset,
      order: [['isSystem', 'ASC'], ['title', 'ASC']]
    });
    
    // Garantir que isSystem seja sempre boolean em todos os CRUDs
    const crudsData = rows.map(crud => {
      const crudData = crud.toJSON();
      crudData.isSystem = Boolean(crudData.isSystem === true || crudData.isSystem === 1);
      return crudData;
    });
    
    res.json({
      data: crudsData,
      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCrudById = async (req, res) => {
  try {
    const crud = await Crud.findByPk(req.params.id);
    if (!crud) {
      return res.status(404).json({ message: 'CRUD não encontrado' });
    }
    // Garantir que isSystem seja sempre boolean
    const crudData = crud.toJSON();
    crudData.isSystem = Boolean(crudData.isSystem === true || crudData.isSystem === 1);
    res.json(crudData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCrudByName = async (req, res) => {
  try {
    const crud = await Crud.findOne({
      where: { name: req.params.name, active: true }
    });
    if (!crud) {
      return res.status(404).json({ message: 'CRUD não encontrado' });
    }
    // Garantir que isSystem seja sempre boolean
    const crudData = crud.toJSON();
    crudData.isSystem = Boolean(crudData.isSystem === true || crudData.isSystem === 1);
    res.json(crudData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCrud = async (req, res) => {
  try {
    const { name, title, icon, resource, endpoint, config, active, isSystem } = req.body;

    // Validar se o config é um objeto válido
    let configObj;
    try {
      configObj = typeof config === 'string' ? JSON.parse(config) : config;
    } catch (e) {
      return res.status(400).json({ message: 'Config deve ser um JSON válido' });
    }

    const crud = await Crud.create({
      name,
      title,
      icon: icon || 'settings',
      resource,
      endpoint,
      config: configObj,
      active: active !== undefined ? active : true,
      isSystem: isSystem !== undefined ? isSystem : false // Sempre false por padrão, apenas seeders podem criar como sistema
    });

    res.status(201).json(crud);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ message: 'Já existe um CRUD com este nome' });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};

exports.updateCrud = async (req, res) => {
  try {
    const { name, title, icon, resource, endpoint, config, active } = req.body;

    const crud = await Crud.findByPk(req.params.id);
    if (!crud) {
      return res.status(404).json({ message: 'CRUD não encontrado' });
    }

    // Validar se o config é um objeto válido
    if (config !== undefined) {
      let configObj;
      try {
        configObj = typeof config === 'string' ? JSON.parse(config) : config;
        crud.config = configObj;
      } catch (e) {
        return res.status(400).json({ message: 'Config deve ser um JSON válido' });
      }
    }

    if (name !== undefined) crud.name = name;
    if (title !== undefined) crud.title = title;
    if (icon !== undefined) crud.icon = icon;
    if (resource !== undefined) crud.resource = resource;
    if (endpoint !== undefined) crud.endpoint = endpoint;
    if (active !== undefined) crud.active = active;

    await crud.save();
    res.json(crud);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ message: 'Já existe um CRUD com este nome' });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};

exports.deleteCrud = async (req, res) => {
  try {
    const crud = await Crud.findByPk(req.params.id);
    if (!crud) {
      return res.status(404).json({ message: 'CRUD não encontrado' });
    }

    await crud.destroy();
    res.json({ message: 'CRUD excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

