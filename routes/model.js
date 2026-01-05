const express = require('express');
const router = express.Router();
const modelController = require('../controllers/modelController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeFunctions = require('../middleware/authorizeFunctions');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar todas as models
router.get('/', modelController.getAllModels);

// Criar nova model
router.post('/', authorizeFunctions('adm.manter_models'), modelController.createModel);

// Obter detalhes de uma model específica
router.get('/:name', modelController.getModel);

// Atualizar uma model
router.put('/:name', authorizeFunctions('adm.manter_models'), modelController.updateModel);

// Deletar uma model
router.delete('/:name', authorizeFunctions('adm.manter_models'), modelController.deleteModel);

// Executar migrations
router.post('/migrations/run', authorizeFunctions('adm.manter_models'), modelController.runMigrations);

// Executar seeders
router.post('/seeders/run', authorizeFunctions('adm.manter_models'), modelController.runSeeders);

// Recriar banco
router.post('/database/recreate', authorizeFunctions('adm.manter_models'), modelController.recreateDatabase);

// Gerar migration para uma model
router.post('/:name/migration', authorizeFunctions('adm.manter_models'), modelController.generateMigration);

// Gerar seeder para uma model
router.post('/:name/seeder', authorizeFunctions('adm.manter_models'), modelController.generateSeeder);

// Obter models para diagrama Mermaid
router.get('/mermaid/diagram', modelController.getModelsForMermaid);

module.exports = router;

