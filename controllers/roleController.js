
const { Op } = require('sequelize');

// Lazy load db para evitar problemas de ordem de carregamento
function getDb() {
  const modelsLoader = require('../utils/modelsLoader');
  return modelsLoader.loadModels();
}

exports.getAllRoles = async (req, res) => {
  try {
    const db = getDb();
    const Role = db.Role;
    const System = db.System;
    const Function = db.Function;
    const User = db.User;
    
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
        searchFields = ['name'];
      }
      
      const modelAttributes = Role.rawAttributes || {};
      const validFields = searchFields.filter(fieldName => modelAttributes[fieldName]);
      
      if (validFields.length > 0) {
        where[Op.or] = validFields.map(field => ({
          [field]: { [Op.like]: `%${filter}%` }
        }));
      }
    }
    
    const { count, rows } = await Role.findAndCountAll({
      where,
      include: [
        { model: System, attributes: ['id', 'name'] }
      ],
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

exports.getRoleById = async (req, res) => {
  try {
    const db = getDb();
    const Role = db.Role;
    const Function = db.Function;
    
    const role = await Role.findByPk(req.params.id, {
      include: [
        { model: Function, through: { attributes: [] } }
      ]
    });
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createRole = async (req, res) => {
  try {
    const db = getDb();
    const Role = db.Role;
    const Function = db.Function;
    
    const { name, id_system, functionIds } = req.body;
    const role = await Role.create({ name, id_system });
    
    // Associar funções se fornecidas
    if (functionIds && Array.isArray(functionIds) && functionIds.length > 0) {
      await role.setFunctions(functionIds);
    }
    
    // Retornar role com funções associadas
    const roleWithFunctions = await Role.findByPk(role.id, {
      include: [
        { model: Function, through: { attributes: [] } }
      ]
    });
    
    res.status(201).json(roleWithFunctions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const db = getDb();
    const Role = db.Role;
    
    const { name, id_system } = req.body;
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    role.name = name;
    role.id_system = id_system;
    await role.save();
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const db = getDb();
    const Role = db.Role;
    
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    await role.destroy();
    res.status(204).json({ message: 'Role deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRoleFunctions = async (req, res) => {
  try {
    const db = getDb();
    const Role = db.Role;
    const Function = db.Function;
    
    const { functionIds } = req.body;
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    await role.setFunctions(functionIds || []);
    const updatedRole = await Role.findByPk(req.params.id, {
      include: [
        { model: Function, through: { attributes: [] } }
      ]
    });
    res.json(updatedRole);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRoleFunctions = async (req, res) => {
  try {
    const db = getDb();
    const Role = db.Role;
    const Function = db.Function;
    
    const role = await Role.findByPk(req.params.id, {
      include: [
        { model: Function, through: { attributes: [] } }
      ]
    });
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
