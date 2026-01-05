const pathResolver = require('../utils/pathResolver');
const { Op } = require('sequelize');
const { updateHasManyAssociations } = require('../utils/associationUtils');

// Lazy load db para evitar problemas de ordem de carregamento
function getDb() {
  return require(pathResolver.resolveModelsPath());
}

/**
 * Buscar menus e menu items do usuário para o sistema atual
 * Filtra por:
 * - id_system (sistema atual do usuário - obtido da primeira role)
 * - id_organization (organização do usuário ou null para menus globais)
 * - id_role (roles do usuário ou null para menus sem restrição de role)
 */
async function getUserMenus(req, res) {
  try {
    const db = getDb();
    const Menu = db.Menu;
    const MenuItems = db.MenuItems;
    const Role = db.Role;
    const User = db.User;
    const Organization = db.Organization;
    
    const userId = req.user.id;

    // Buscar usuário com suas roles e organizações
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'Roles',
          through: { attributes: [] },
          attributes: ['id', 'id_system']
        },
        {
          model: Organization,
          as: 'Organizations',
          through: { attributes: [] },
          attributes: ['id']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Obter id_system da query param ou da primeira role (fallback)
    let userSystemId = req.query.systemId;

    // Obter id_organization da query param
    const userOrganizationId = req.query.organizationId;

    // Se systemId foi fornecido, validar se o usuário tem acesso a ele
    if (userSystemId) {
      const hasSystemAccess = user.Roles.some(role => role.id_system == userSystemId);
      if (!hasSystemAccess) {
        return res.status(403).json({ message: 'Acesso negado a este sistema' });
      }
    } else {
      // Fallback: sistema da primeira role
      userSystemId = user.Roles && user.Roles.length > 0
        ? user.Roles[0].id_system
        : null;
    }

    if (!userSystemId) {
      return res.json([]); // Sem sistema, retornar array vazio
    }

    // Se organizationId foi fornecido, validar se o usuário tem acesso
    if (userOrganizationId) {
      const hasOrgAccess = user.Organizations.some(org => org.id == userOrganizationId);
      if (!hasOrgAccess) {
        return res.status(403).json({ message: 'Acesso negado a esta organização' });
      }
    }

    // Obter IDs das organizações do usuário
    const userOrganizationIds = user.Organizations ? user.Organizations.map(org => org.id) : [];

    // Obter IDs das roles do usuário
    const userRoleIds = user.Roles ? user.Roles.map(role => role.id) : [];

    // Buscar menus do sistema do usuário
    const menus = await Menu.findAll({
      where: {
        id_system: userSystemId,
        [Op.or]: [
          { id_organization: null }, // Menus globais
          // Se uma organização foi selecionada, buscar menus dela.
          // Se não, buscar apenas menus globais (comportamento padrão seguro)
          ...(userOrganizationId ? [{ id_organization: userOrganizationId }] : [])
        ]
      },
      include: [
        {
          model: MenuItems,
          as: 'MenuItems',
          where: {
            [Op.or]: [
              { id_role: null }, // Menu items sem restrição de role
              { id_role: { [Op.in]: userRoleIds } } // Menu items específicos das roles do usuário
            ]
          },
          required: false
        }
      ],
      order: [['id', 'ASC']]
    });

    // Formatar resposta
    const formattedMenus = menus.map(menu => ({
      id: menu.id,
      name: menu.name,
      items: menu.MenuItems
        .map(item => ({
          id: item.id,
          name: item.name,
          icon: item.icon,
          route: item.route,
          target_blank: item.target_blank,
          order: item.order
        }))
        .sort((a, b) => a.order - b.order)
    })).filter(menu => menu.items.length > 0); // Filtrar menus sem items

    res.json(formattedMenus);
  } catch (error) {
    console.error('Erro ao buscar menus:', error);
    res.status(500).json({ message: 'Erro ao buscar menus', error: error.message });
  }
}

// CRUD completo para Menus
async function getAllMenus(req, res) {
  try {
    const db = getDb();
    const Menu = db.Menu;
    const MenuItems = db.MenuItems;
    const System = db.System;
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
        searchFields = ['name'];
      }
      
      const modelAttributes = Menu.rawAttributes || {};
      const validFields = searchFields.filter(fieldName => modelAttributes[fieldName]);
      
      if (validFields.length > 0) {
        where[Op.or] = validFields.map(field => ({
          [field]: { [Op.like]: `%${filter}%` }
        }));
      }
    }
    
    const { count, rows } = await Menu.findAndCountAll({
      where,
      include: [
        {
          model: MenuItems,
          as: 'MenuItems',
          required: false,
          order: [['order', 'ASC']]
        },
        { model: System, attributes: ['id', 'name'] },
        { model: Organization, attributes: ['id', 'name'], required: false }
      ],
      limit,
      offset,
      order: [['id', 'ASC']]
    });
    
    res.json({
      data: rows,
      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Erro ao buscar menus:', error);
    res.status(500).json({ message: 'Erro ao buscar menus', error: error.message });
  }
}

async function getMenuById(req, res) {
  try {
    const db = getDb();
    const Menu = db.Menu;
    const MenuItems = db.MenuItems;
    const System = db.System;
    const Organization = db.Organization;
    
    const menu = await Menu.findByPk(req.params.id, {
      include: [
        {
          model: MenuItems,
          as: 'MenuItems',
          required: false,
          order: [['order', 'ASC']]
        },
        { model: System, attributes: ['id', 'name'] },
        { model: Organization, attributes: ['id', 'name'], required: false }
      ]
    });
    if (!menu) {
      return res.status(404).json({ message: 'Menu não encontrado' });
    }
    res.json(menu);
  } catch (error) {
    console.error('Erro ao buscar menu:', error);
    res.status(500).json({ message: 'Erro ao buscar menu', error: error.message });
  }
}

// Função auxiliar updateHasManyAssociations importada de utils

async function createMenu(req, res) {
  const db = getDb();
  const Menu = db.Menu;
  const MenuItems = db.MenuItems;
  
  const transaction = await db.sequelize.transaction();
  try {
    const { name, id_system, id_organization, ...otherData } = req.body;

    // Criar o menu
    const menu = await Menu.create({
      name,
      id_system,
      id_organization: id_organization || null
    }, { transaction });

    // Processar associações dinamicamente
    await updateHasManyAssociations(menu, req.body, transaction);

    await transaction.commit();

    // Recarregar com associações para retorno
    const reloadedMenu = await Menu.findByPk(menu.id, {
      include: [{ model: MenuItems, as: 'MenuItems' }]
    });

    res.status(201).json(reloadedMenu);
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao criar menu:', error);
    res.status(500).json({ message: 'Erro ao criar menu', error: error.message });
  }
}

async function updateMenu(req, res) {
  const db = getDb();
  const Menu = db.Menu;
  const MenuItems = db.MenuItems;
  
  const transaction = await db.sequelize.transaction();
  try {
    const { name, id_system, id_organization } = req.body;
    const menu = await Menu.findByPk(req.params.id);

    if (!menu) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Menu não encontrado' });
    }

    await menu.update({
      name,
      id_system,
      id_organization: id_organization || null
    }, { transaction });

    // Processar associações dinamicamente
    await updateHasManyAssociations(menu, req.body, transaction);

    await transaction.commit();

    // Recarregar com associações para retorno
    const reloadedMenu = await Menu.findByPk(menu.id, {
      include: [{ model: MenuItems, as: 'MenuItems' }]
    });

    res.json(reloadedMenu);
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao atualizar menu:', error);
    res.status(500).json({ message: 'Erro ao atualizar menu', error: error.message });
  }
}

async function deleteMenu(req, res) {
  try {
    const db = getDb();
    const Menu = db.Menu;
    
    const menu = await Menu.findByPk(req.params.id);
    if (!menu) {
      return res.status(404).json({ message: 'Menu não encontrado' });
    }
    await menu.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir menu:', error);
    res.status(500).json({ message: 'Erro ao excluir menu', error: error.message });
  }
}

module.exports = {
  getUserMenus,
  getAllMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu
};

