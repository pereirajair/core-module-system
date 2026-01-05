
const { Op } = require('sequelize');

// Lazy load db para evitar problemas de ordem de carregamento
function getDb() {
  const modelsLoader = require('../utils/modelsLoader');
  return modelsLoader.loadModels();
}

exports.getAllOrganizations = async (req, res) => {
  try {
    const db = getDb();
    const Organization = db.Organization;
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
      
      const modelAttributes = Organization.rawAttributes || {};
      const validFields = searchFields.filter(fieldName => modelAttributes[fieldName]);
      
      if (validFields.length > 0) {
        where[Op.or] = validFields.map(field => ({
          [field]: { [Op.like]: `%${filter}%` }
        }));
      }
    }
    
    const { count, rows } = await Organization.findAndCountAll({
      where,
      include: [
        { model: User, through: { attributes: [] } }
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

exports.getOrganizationById = async (req, res) => {
  try {
    const db = getDb();
    const Organization = db.Organization;
    const User = db.User;
    
    const organization = await Organization.findByPk(req.params.id, {
      include: [
        { 
          model: User, 
          through: { attributes: [] },
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    // Garantir que os dados sejam serializados corretamente
    const organizationData = organization.get({ plain: true });
    // Sequelize usa o plural do modelo quando não há alias, então é "Users"
    res.json(organizationData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createOrganization = async (req, res) => {
  try {
    const db = getDb();
    const Organization = db.Organization;
    const User = db.User;
    
    const { name, userIds } = req.body;
    const organization = await Organization.create({ name });
    
    // Associar usuários se fornecidos
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      await organization.setUsers(userIds);
    }
    
    // Retornar organização com usuários associados
    const organizationWithUsers = await Organization.findByPk(organization.id, {
      include: [
        { 
          model: User, 
          through: { attributes: [] },
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    const organizationData = organizationWithUsers.get({ plain: true });
    res.status(201).json(organizationData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrganization = async (req, res) => {
  try {
    const db = getDb();
    const Organization = db.Organization;
    const User = db.User;
    
    const { name, userIds } = req.body;
    const organization = await Organization.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Atualizar nome
    organization.name = name;
    await organization.save();
    
    // Atualizar associações de usuários se fornecidos
    if (userIds !== undefined) {
      await organization.setUsers(userIds || []);
    }
    
    // Retornar organização com usuários associados
    const organizationWithUsers = await Organization.findByPk(organization.id, {
      include: [
        { 
          model: User, 
          through: { attributes: [] },
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    const organizationData = organizationWithUsers.get({ plain: true });
    res.json(organizationData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteOrganization = async (req, res) => {
  try {
    const db = getDb();
    const Organization = db.Organization;
    
    const organization = await Organization.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    await organization.destroy();
    res.status(204).json({ message: 'Organization deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrganizationUsers = async (req, res) => {
  try {
    const db = getDb();
    const Organization = db.Organization;
    const User = db.User;
    
    const { userIds } = req.body;
    const organization = await Organization.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    await organization.setUsers(userIds || []);
    const updatedOrganization = await Organization.findByPk(req.params.id, {
      include: [
        { model: User, through: { attributes: [] } }
      ]
    });
    res.json(updatedOrganization);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
