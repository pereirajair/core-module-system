const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const menuItemController = require('../controllers/menuItemController');
const authenticateToken = require('../middleware/authenticateToken');

// Buscar menus do usuário para o sistema atual
router.get('/user', authenticateToken, menuController.getUserMenus);

// CRUD de MenuItems (deve vir antes das rotas genéricas para evitar conflito)
router.get('/items', authenticateToken, menuItemController.getAllMenuItems);
router.get('/items/:id', authenticateToken, menuItemController.getMenuItemById);
router.post('/items', authenticateToken, menuItemController.createMenuItem);
router.put('/items/:id', authenticateToken, menuItemController.updateMenuItem);
router.delete('/items/:id', authenticateToken, menuItemController.deleteMenuItem);

// CRUD de Menus
router.get('/', authenticateToken, menuController.getAllMenus);
router.get('/:id', authenticateToken, menuController.getMenuById);
router.post('/', authenticateToken, menuController.createMenu);
router.put('/:id', authenticateToken, menuController.updateMenu);
router.delete('/:id', authenticateToken, menuController.deleteMenu);

module.exports = router;

