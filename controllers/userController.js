const { Op } = require('sequelize');

// Lazy load db para evitar problemas de ordem de carregamento
function getDb() {
  const modelsLoader = require('../utils/modelsLoader');
  return modelsLoader.loadModels();
}

// Helper para logs
const logHelper = require('../utils/logHelper');

exports.getUserSystems = async (req, res) => {
  try {
    const db = getDb();
    const User = db.User;
    const Role = db.Role;
    const System = db.System;
    
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          required: true,
          include: [{
            model: System,
            required: true
          }]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Extract unique systems from roles
    const systemsMap = new Map();
    user.Roles.forEach(role => {
      if (role.System) {
        systemsMap.set(role.System.id, role.System);
      }
    });

    const systems = Array.from(systemsMap.values());
    res.json(systems);
  } catch (error) {
    console.error('Error fetching user systems:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getUserOrganizations = async (req, res) => {
  try {
    const db = getDb();
    const User = db.User;
    const Organization = db.Organization;
    
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Organization,
          through: { attributes: [] },
          attributes: ['id', 'name']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.Organizations || []);
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const db = getDb();
    const User = db.User;
    const Role = db.Role;
    const Organization = db.Organization;
    
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
        searchFields = ['name', 'email'];
      }
      
      const modelAttributes = User.rawAttributes || {};
      const validFields = searchFields.filter(fieldName => modelAttributes[fieldName]);
      
      if (validFields.length > 0) {
        where[Op.or] = validFields.map(field => ({
          [field]: { [Op.like]: `%${filter}%` }
        }));
      }
    }
    
    const { count, rows } = await User.findAndCountAll({
      where,
      include: [
        { model: Role, through: { attributes: [] } },
        { model: Organization, through: { attributes: [] } }
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

exports.getUserById = async (req, res) => {
  try {
    const db = getDb();
    const User = db.User;
    const Role = db.Role;
    const Organization = db.Organization;
    
    const user = await User.findByPk(req.params.id, {
      include: [
        {
          model: Role,
          through: { attributes: [] },
          attributes: ['id', 'name', 'id_system']
        },
        {
          model: Organization,
          through: { attributes: [] },
          attributes: ['id', 'name']
        }
      ]
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userData = user.get({ plain: true });
    res.json(userData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const db = getDb();
    const User = db.User;
    const Role = db.Role;
    const Organization = db.Organization;
    
    const { name, email, password, roleIds, organizationIds } = req.body;
    const user = await User.create({ name, email, password });

    // Associar roles e organizações se fornecidos
    if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
      await user.setRoles(roleIds);
    }
    if (organizationIds && Array.isArray(organizationIds) && organizationIds.length > 0) {
      await user.setOrganizations(organizationIds);
    }

    // Retornar usuário com roles e organizações associadas
    const userWithAssociations = await User.findByPk(user.id, {
      include: [
        {
          model: Role,
          through: { attributes: [] },
          attributes: ['id', 'name']
        },
        {
          model: Organization,
          through: { attributes: [] },
          attributes: ['id', 'name']
        }
      ]
    });

    const userData = userWithAssociations.get({ plain: true });
    res.status(201).json(userData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const db = getDb();
    const User = db.User;
    const Role = db.Role;
    const Organization = db.Organization;
    
    const { name, email, password, roleIds, organizationIds } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Salvar dados antigos para log
    const oldData = user.get({ plain: true });

    // Atualizar dados básicos
    user.name = name;
    user.email = email;
    if (password) {
      user.password = password; // TODO: Hash password before saving
    }
    await user.save();

    // Atualizar associações de roles e organizações se fornecidos
    if (roleIds !== undefined) {
      await user.setRoles(roleIds || []);
    }
    if (organizationIds !== undefined) {
      await user.setOrganizations(organizationIds || []);
    }

    // Retornar usuário com roles e organizações associadas
    const userWithAssociations = await User.findByPk(user.id, {
      include: [
        {
          model: Role,
          through: { attributes: [] },
          attributes: ['id', 'name']
        },
        {
          model: Organization,
          through: { attributes: [] },
          attributes: ['id', 'name']
        }
      ]
    });

    const userData = userWithAssociations.get({ plain: true });
    
    // Registrar log de atualização
    await logHelper.logUpdate(req, 'User', userWithAssociations, oldData, {
      roleIds: roleIds,
      organizationIds: organizationIds
    });
    
    res.json(userData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const db = getDb();
    const User = db.User;
    
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Salvar dados antes de excluir para log
    const userData = user.get({ plain: true });
    
    await user.destroy();
    
    // Registrar log de exclusão
    await logHelper.logDelete(req, 'User', userData);
    
    res.status(204).json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUserRoles = async (req, res) => {
  try {
    const db = getDb();
    const User = db.User;
    const Role = db.Role;
    const Organization = db.Organization;
    
    const { roleIds } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.setRoles(roleIds || []);
    const updatedUser = await User.findByPk(req.params.id, {
      include: [
        { model: Role, through: { attributes: [] } },
        { model: Organization, through: { attributes: [] } }
      ]
    });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUserOrganizations = async (req, res) => {
  try {
    const db = getDb();
    const User = db.User;
    const Role = db.Role;
    const Organization = db.Organization;
    
    const { organizationIds } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.setOrganizations(organizationIds || []);
    const updatedUser = await User.findByPk(req.params.id, {
      include: [
        { model: Role, through: { attributes: [] } },
        { model: Organization, through: { attributes: [] } }
      ]
    });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
