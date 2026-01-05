const pathResolver = require('../utils/pathResolver');
const backendPath = pathResolver.getBackendPath();


const express = require(backendPath + '/node_modules/express');
const router = express.Router();
const crudController = require('../controllers/crudController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeFunctions = require('../middleware/authorizeFunctions');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar todos os CRUDs
router.get('/', crudController.getAllCruds);

// Obter CRUD por ID
router.get('/:id', crudController.getCrudById);

// Obter CRUD por nome (para rota dinâmica)
router.get('/name/:name', crudController.getCrudByName);

// Criar novo CRUD (requer permissão de admin)
router.post('/', authorizeFunctions('adm.manter_cruds'), crudController.createCrud);

// Atualizar CRUD (requer permissão de admin)
router.put('/:id', authorizeFunctions('adm.manter_cruds'), crudController.updateCrud);

// Excluir CRUD (requer permissão de admin)
router.delete('/:id', authorizeFunctions('adm.excluir_cruds'), crudController.deleteCrud);

module.exports = router;

