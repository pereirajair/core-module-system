const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeFunctions = require('../middleware/authorizeFunctions');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar todos os módulos
router.get('/', authorizeFunctions('adm.visualizar_modules'), moduleController.getAllModules);

// Obter um módulo específico
router.get('/:name', authorizeFunctions('adm.visualizar_modules'), moduleController.getModule);

// Criar novo módulo
router.post('/', authorizeFunctions('adm.criar_modules'), moduleController.createModule);

// Atualizar módulo
router.put('/:name', authorizeFunctions('adm.manter_modules'), moduleController.updateModule);

// Deletar módulo
router.delete('/:name', authorizeFunctions('adm.manter_modules'), moduleController.deleteModule);

// Instalar módulo
router.post('/:name/install', authorizeFunctions('adm.manter_modules'), moduleController.installModule);

// Desinstalar módulo
router.post('/:name/uninstall', authorizeFunctions('adm.manter_modules'), moduleController.uninstallModule);

// Verificar dependências
router.get('/:name/dependencies', authorizeFunctions('adm.visualizar_modules'), (req, res) => {
  try {
    const depCheck = moduleController.checkDependencies(req.params.name);
    res.json(depCheck);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao verificar dependências', error: error.message });
  }
});

module.exports = router;

