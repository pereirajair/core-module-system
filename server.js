/**
 * Gestor System Server
 * Encapsula toda a lógica de inicialização do servidor Express
 */
require('dotenv').config();

const pathResolver = require('./utils/pathResolver');
const path = require('path');

// Carregar dependências do próprio módulo system
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const { middleware: openApiMiddleware } = require('express-openapi-validator');

class GestorServer {
  constructor(options = {}) {
    this.options = {
      port: options.port || process.env.PORT || 3000,
      backendPath: options.backendPath || pathResolver.getBackendPath(),
      ...options
    };
    
    this.app = null;
    this.db = null;
    this.systemModule = null;
    this.cronManager = null;
  }

  /**
   * Inicializa o servidor
   */
  async start() {
    try {
      console.log('🚀 Iniciando Gestor Server...');
      
      // Carregar módulo system
      this.systemModule = this._loadSystemModule();
      
      // Carregar database
      this.db = this._loadDatabase();
      
      // Criar app Express
      this.app = express();
      
      // Configurar middlewares básicos
      this._setupBasicMiddlewares();
      
      // Configurar CORS
      this._setupCORS();
      
      // Carregar OpenAPI spec
      const apiSpec = this._loadOpenApiSpec();
      
      // Configurar rotas públicas
      this._setupPublicRoutes();
      
      // Conectar ao banco de dados
      await this._connectDatabase();
      
      // Inicializar sistema MCP
      await this._initializeMCP();
      
      // Adicionar rotas dinâmicas ao OpenAPI
      await this._addDynamicRoutesToOpenAPI(apiSpec);
      
      // Configurar middleware OpenAPI
      this._setupOpenApiMiddleware(apiSpec);
      
      // Configurar Swagger UI
      this._setupSwaggerUI(apiSpec);
      
      // Carregar rotas dos módulos
      this._setupModuleRoutes();
      
      // Configurar rotas principais
      this._setupMainRoutes();
      
      // Configurar rotas dinâmicas de CRUD
      await this._setupDynamicCrudRoutes();
      
      // Configurar rota de sincronização
      this._setupSyncRoute();
      
      // Configurar error handler
      this._setupErrorHandler();
      
      // Configurar dynamic reload
      this._setupDynamicReload();

      // Inicializar Cron Jobs a partir do banco
      await this._setupCronManager();
      
      // Iniciar servidor
      await this._listen();
      
      console.log('✅ Gestor Server iniciado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao iniciar Gestor Server:', error);
      throw error;
    }
  }

  /**
   * Carrega o módulo system
   */
  _loadSystemModule() {
    console.log('📦 Carregando módulo system...');
    return require('./index');
  }

  /**
   * Carrega o database
   */
  _loadDatabase() {
    console.log('📊 Carregando database...');
    const modelsLoader = require('./utils/modelsLoader');
    return modelsLoader.loadModels();
  }

  /**
   * Configura middlewares básicos
   */
  _setupBasicMiddlewares() {
    this.app.use(bodyParser.json());
  }

  /**
   * Configura CORS
   */
  _setupCORS() {
    this.app.use(cors({
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          'http://localhost:9000',
          'http://localhost:5173',
          'http://localhost:3000',
          'http://127.0.0.1:9000',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:3000'
        ];
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposedHeaders: ['Content-Type', 'Authorization']
    }));
  }

  /**
   * Carrega especificação OpenAPI
   */
  _loadOpenApiSpec() {
    const openApiPath = path.join(__dirname, 'openapi.yaml');
    return YAML.load(openApiPath);
  }

  /**
   * Configura rotas públicas
   */
  _setupPublicRoutes() {
    const { routes, middleware } = this.systemModule;
    
    // Rota de autenticação
    this.app.use('/auth', routes.auth);
    
    // Rota para imagens do sistema
    this.app.get('/system/:sigla/:type', (req, res, next) => {
      let systemController;
      try {
        systemController = require('./controllers/systemController');
      } catch (error) {
        console.error('❌ Erro ao carregar systemController');
        return res.status(500).json({ message: 'System controller not found' });
      }
      systemController.getSystemImage(req, res, next);
    });
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ message: 'API is healthy' });
    });
  }

  /**
   * Conecta ao banco de dados
   */
  async _connectDatabase() {
    console.log('🔌 Conectando ao banco de dados...');
    await this.db.sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida.');
  }

  /**
   * Inicializa sistema MCP
   */
  async _initializeMCP() {
    console.log('🔍 Inicializando sistema de descoberta automática de MCP...');
    try {
      await this.systemModule.utils.autoMCP.initialize();
    } catch (error) {
      console.warn('⚠️ Aviso: Erro ao inicializar sistema MCP automático:', error.message);
    }
  }

  /**
   * Adiciona rotas dinâmicas ao OpenAPI
   */
  async _addDynamicRoutesToOpenAPI(apiSpec) {
    try {
      const Crud = this.db.Crud;
      const cruds = await Crud.findAll({
        where: { active: true },
        attributes: ['resource', 'endpoint', 'title']
      });
      
      const staticRoutes = ['users', 'organizations', 'roles', 'systems', 'functions', 
                           'contacts', 'channel-types', 'channels', 'conversations', 
                           'messages', 'cruds', 'models', 'menus', 'chatia'];
      
      cruds.forEach(crud => {
        let routePath = crud.endpoint;
        
        if (!routePath.startsWith('/api/')) {
          if (routePath.startsWith('/')) {
            routePath = `/api${routePath}`;
          } else {
            routePath = `/api/${routePath}`;
          }
        }
        
        const routeName = routePath.replace(/^\/api\//, '');
        const resource = crud.resource || routeName;
        
        if (!staticRoutes.includes(routeName)) {
          const path = routePath;
          const pathWithId = `${routePath}/{id}`;
          
          // Adicionar definições de rotas ao OpenAPI
          if (!apiSpec.paths[path]) {
            apiSpec.paths[path] = {};
          }
          
          // GET - Listar
          apiSpec.paths[path].get = {
            summary: `List ${crud.title || routeName}`,
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
              { in: 'query', name: 'limit', schema: { type: 'integer', default: 30 } },
              { in: 'query', name: 'filter', schema: { type: 'string' } }
            ],
            responses: {
              '200': {
                description: 'List of items',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: { type: 'array', items: { type: 'object', additionalProperties: true } },
                        count: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        totalPages: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          };
          
          // POST - Criar
          apiSpec.paths[path].post = {
            summary: `Create ${crud.title || routeName}`,
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { type: 'object', additionalProperties: true }
                }
              }
            },
            responses: {
              '201': {
                description: 'Item created',
                content: {
                  'application/json': {
                    schema: { type: 'object', additionalProperties: true }
                  }
                }
              }
            }
          };
          
          // GET by ID, PUT, DELETE
          if (!apiSpec.paths[pathWithId]) {
            apiSpec.paths[pathWithId] = {};
          }
          
          apiSpec.paths[pathWithId].get = {
            summary: `Get ${crud.title || routeName} by ID`,
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            responses: {
              '200': { description: 'Item found' },
              '404': { description: 'Item not found' }
            }
          };
          
          apiSpec.paths[pathWithId].put = {
            summary: `Update ${crud.title || routeName}`,
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            requestBody: {
              required: true,
              content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } }
            },
            responses: {
              '200': { description: 'Item updated' },
              '404': { description: 'Item not found' }
            }
          };
          
          apiSpec.paths[pathWithId].delete = {
            summary: `Delete ${crud.title || routeName}`,
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            responses: {
              '200': { description: 'Item deleted' },
              '404': { description: 'Item not found' }
            }
          };
          
          console.log(`Rota OpenAPI adicionada: ${path}`);
        }
      });
    } catch (error) {
      console.error('Erro ao adicionar rotas dinâmicas ao OpenAPI:', error);
    }
  }

  /**
   * Configura middleware OpenAPI
   */
  _setupOpenApiMiddleware(apiSpec) {
    const middleware = openApiMiddleware({
      apiSpec: apiSpec,
      validateRequests: {
        allowUnknownQueryParameters: true,
        removeAdditional: 'all',
      },
      validateResponses: false,
      ignorePaths: /^\/api\/(models|pessoas|.*)/,
    });
    
    this.app.use(middleware);
  }

  /**
   * Configura Swagger UI
   */
  _setupSwaggerUI(apiSpec) {
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiSpec));
  }

  /**
   * Configura rotas dos módulos
   */
  _setupModuleRoutes() {
    console.log('📋 Carregando rotas dos módulos...');
    const { loadModuleRoutes } = this.systemModule.utils.moduleLoader;
    loadModuleRoutes(this.app);
  }

  /**
   * Configura rotas principais
   */
  _setupMainRoutes() {
    const { routes } = this.systemModule;
    
    this.app.use('/api/cruds', routes.crud);
    this.app.use('/api/models', routes.model);
    this.app.use('/api/modules', routes.module);
    this.app.use('/api/chatia', routes.chatIA);
    this.app.use('/api/mcp', routes.mcp);
    this.app.use('/api/cron-jobs', routes.cronJob);
    this.app.use('/api/logs', routes.logs);
  }

  /**
   * Configura rotas dinâmicas de CRUD
   */
  async _setupDynamicCrudRoutes() {
    try {
      const dynamicCrudController = require('./controllers/dynamicCrudController');
      const { authenticateToken } = this.systemModule.middleware;
      
      const Crud = this.db.Crud;
      const cruds = await Crud.findAll({
        where: { active: true },
        attributes: ['resource', 'endpoint']
      });
      
      const staticRoutes = [
        'users', 'organizations', 'roles', 'systems', 'functions',
        'cruds', 'models', 'menus', 'chatia'
      ];
      
      cruds.forEach(crud => {
        let routePath = crud.endpoint;
        
        if (!routePath.startsWith('/api/')) {
          if (routePath.startsWith('/')) {
            routePath = `/api${routePath}`;
          } else {
            routePath = `/api/${routePath}`;
          }
        }
        
        const routeName = routePath.replace(/^\/api\//, '');
        const resource = crud.resource || routeName;
        
        if (!staticRoutes.includes(routeName)) {
          // GET list
          this.app.get(routePath, authenticateToken, (req, res, next) => {
            req.params.resource = resource;
            dynamicCrudController.handleDynamicCrud(req, res, next);
          });
          
          // GET by id
          this.app.get(`${routePath}/:id`, authenticateToken, (req, res, next) => {
            req.params.resource = resource;
            dynamicCrudController.handleDynamicCrud(req, res, next);
          });
          
          // POST
          this.app.post(routePath, authenticateToken, (req, res, next) => {
            req.params.resource = resource;
            dynamicCrudController.handleDynamicCrud(req, res, next);
          });
          
          // PUT
          this.app.put(`${routePath}/:id`, authenticateToken, (req, res, next) => {
            req.params.resource = resource;
            dynamicCrudController.handleDynamicCrud(req, res, next);
          });
          
          // PATCH
          this.app.patch(`${routePath}/:id`, authenticateToken, (req, res, next) => {
            req.params.resource = resource;
            dynamicCrudController.handleDynamicCrud(req, res, next);
          });
          
          // DELETE
          this.app.delete(`${routePath}/:id`, authenticateToken, (req, res, next) => {
            req.params.resource = resource;
            dynamicCrudController.handleDynamicCrud(req, res, next);
          });
          
          console.log(`Rota dinâmica criada: ${routePath} (resource: ${resource})`);
        }
      });
    } catch (error) {
      console.error('Erro ao configurar rotas dinâmicas:', error);
    }
  }

  /**
   * Configura rota de sincronização
   */
  _setupSyncRoute() {
    const { authenticateToken, authorizeRoles } = this.systemModule.middleware;
    
    this.app.get('/sync', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
      await this.db.sequelize.sync({ force: true });
      res.json({ message: 'Database synchronized' });
    });
  }

  /**
   * Inicializa gerenciador de Cron Jobs
   */
  async _setupCronManager() {
    try {
      console.log('⏰ Inicializando gerenciador de Cron Jobs...');
      this.cronManager = require('./utils/cronManager');
      await this.cronManager.initialize(this.db);
      console.log('✅ Gerenciador de Cron Jobs inicializado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao inicializar Cron Manager:', error);
      // Não interrompe o servidor, apenas registra o erro
      this.cronManager = null;
    }
  }

  /**
   * Configura error handler
   */
  _setupErrorHandler() {
    this.app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        message: err.message,
        errors: err.errors,
      });
    });
  }

  /**
   * Configura dynamic reload
   */
  _setupDynamicReload() {
    const { dynamicReload } = this.systemModule.utils;
    dynamicReload.setAppInstance(this.app);
  }

  /**
   * Inicia o servidor HTTP
   */
  async _listen() {
    return new Promise((resolve, reject) => {
      this.app.listen(this.options.port, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`🚀 Server is running on port ${this.options.port}`);
          resolve();
        }
      });
    });
  }

  /**
   * Para o servidor
   */
  async stop() {
    // Limpar cron jobs
    if (this.cronManager) {
      try {
        this.cronManager.clearAllJobs();
        console.log('✅ Cron Jobs limpos');
      } catch (error) {
        console.error('❌ Erro ao limpar Cron Jobs:', error);
      }
    }
    
    // Fechar conexão com banco
    if (this.db) {
      await this.db.sequelize.close();
    }
    
    console.log('✅ Gestor Server parado com sucesso!');
  }
}

module.exports = GestorServer;

