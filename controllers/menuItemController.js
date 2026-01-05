const db = require('../../../models'); const { MenuItems, Menu, System, Organization, Role } = db;

async function getAllMenuItems(req, res) {
  try {
    const menuItems = await MenuItems.findAll({
      include: [
        { model: Menu, attributes: ['id', 'name'] },
        { model: System, attributes: ['id', 'name'] },
        { model: Organization, attributes: ['id', 'name'], required: false },
        { model: Role, attributes: ['id', 'name'], required: false }
      ],
      order: [['order', 'ASC']]
    });
    res.json(menuItems);
  } catch (error) {
    console.error('Erro ao buscar menu items:', error);
    res.status(500).json({ message: 'Erro ao buscar menu items', error: error.message });
  }
}

async function getMenuItemById(req, res) {
  try {
    const menuItem = await MenuItems.findByPk(req.params.id, {
      include: [
        { model: Menu, attributes: ['id', 'name'] },
        { model: System, attributes: ['id', 'name'] },
        { model: Organization, attributes: ['id', 'name'], required: false },
        { model: Role, attributes: ['id', 'name'], required: false }
      ]
    });
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item não encontrado' });
    }
    res.json(menuItem);
  } catch (error) {
    console.error('Erro ao buscar menu item:', error);
    res.status(500).json({ message: 'Erro ao buscar menu item', error: error.message });
  }
}

async function createMenuItem(req, res) {
  try {
    const { name, icon, route, target_blank, id_menu, id_system, id_organization, id_role, order } = req.body;
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
    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Erro ao criar menu item:', error);
    res.status(500).json({ message: 'Erro ao criar menu item', error: error.message });
  }
}

async function updateMenuItem(req, res) {
  try {
    const { name, icon, route, target_blank, id_menu, id_system, id_organization, id_role, order } = req.body;
    const menuItem = await MenuItems.findByPk(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item não encontrado' });
    }
    await menuItem.update({
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
    res.json(menuItem);
  } catch (error) {
    console.error('Erro ao atualizar menu item:', error);
    res.status(500).json({ message: 'Erro ao atualizar menu item', error: error.message });
  }
}

async function deleteMenuItem(req, res) {
  try {
    const menuItem = await MenuItems.findByPk(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item não encontrado' });
    }
    await menuItem.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir menu item:', error);
    res.status(500).json({ message: 'Erro ao excluir menu item', error: error.message });
  }
}

module.exports = {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
};

