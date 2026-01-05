# @gestor/system

Módulo core do Gestor Framework que fornece todas as funcionalidades base do sistema.

## Visão Geral

Este módulo encapsula toda a lógica de servidor, incluindo:
- Servidor Express configurado
- Sistema de autenticação e autorização
- Gerenciamento de usuários, roles e permissões
- Sistema de módulos dinâmicos
- API REST com OpenAPI/Swagger
- Sistema CRUD dinâmico
- Model Context Protocol (MCP)
- Chat IA integrado
- Sistema de menus dinâmicos

## Instalação

```bash
npm install @gestor/system
```

Ou como dependência local:

```json
{
  "dependencies": {
    "@gestor/system": "file:../modules/system"
  }
}
```

## Uso Básico

### Iniciar Servidor

```javascript
require('dotenv').config();

const GestorServer = require('@gestor/system/server');

const server = new GestorServer({
  port: process.env.PORT || 3000
});

server.start().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
```

## Estrutura do Módulo

```
system/
├── server.js                 # Classe GestorServer
├── index.js                  # Exports do módulo
├── package.json              # Dependências e scripts
├── openapi.yaml              # Especificação OpenAPI
├── .sequelizerc              # Config Sequelize CLI
├── config/
│   └── database.js           # Configuração do banco
├── controllers/              # Controllers
│   ├── authController.js
│   ├── userController.js
│   ├── roleController.js
│   ├── organizationController.js
│   ├── systemController.js
│   ├── functionController.js
│   ├── crudController.js
│   ├── dynamicCrudController.js
│   ├── menuController.js
│   ├── menuItemController.js
│   ├── modelController.js
│   ├── chatIAController.js
│   └── mcpController.js
├── models/                   # Modelos Sequelize
│   ├── user.js
│   ├── role.js
│   ├── organization.js
│   ├── system.js
│   ├── function.js
│   ├── crud.js
│   ├── menu.js
│   ├── menuItem.js
│   └── ...
├── routes/                   # Rotas Express
│   ├── auth.js
│   ├── user.js
│   ├── role.js
│   └── ...
├── middleware/               # Middlewares
│   ├── authenticate.js
│   ├── authorizeFunctions.js
│   └── ...
├── migrations/               # Migrations do sistema
├── seeders/                  # Seeders do sistema
├── scripts/                  # Scripts utilitários
│   ├── migrate.js           # Executa migrations de todos módulos
│   └── seed.js              # Executa seeders de todos módulos
├── utils/                    # Utilitários
│   ├── modelsLoader.js      # Carregador de modelos
│   ├── moduleLoader.js      # Carregador de módulos
│   ├── pathResolver.js      # Resolução de caminhos
│   ├── autoMCP.js           # Sistema MCP automático
│   └── ...
└── docs/                     # Documentação
    ├── CHAT_IA_CONFIG.md
    ├── INSTALL_MODULES.md
    └── MCP_README.md
```

## Scripts Disponíveis

```bash
# Banco de Dados
npm run db:create         # Cria banco de dados
npm run db:drop           # Remove banco de dados
npm run db:migrate        # Executa migrations de todos módulos
npm run db:migrate:undo   # Desfaz última migration
npm run db:seed           # Executa seeders de todos módulos
npm run db:seed:undo      # Desfaz último seeder
npm run db:recreate       # Recria banco completo
```

## Configuração

### Variáveis de Ambiente

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gestor
DB_USERNAME=root
DB_PASSWORD=

# JWT
JWT_SECRET=your-secret-key

# OpenAI (opcional)
OPENAI_API_KEY=your-openai-key
```

### Banco de Dados

Configure em `config/database.js`:

```javascript
module.exports = {
  development: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT
  },
  // ... outras configurações
}
```

## Funcionalidades

### 1. Autenticação e Autorização

Sistema completo de autenticação JWT com:
- Login/Logout
- Impersonação de usuários
- Controle de permissões por funções
- Middleware de autenticação
- Middleware de autorização

### 2. Gerenciamento de Usuários

CRUD completo de usuários com:
- Roles (papéis)
- Organizations (organizações)
- Functions (permissões)
- Systems (sistemas)

### 3. CRUD Dinâmico

Sistema que permite criar CRUDs dinamicamente via configuração JSON:

```javascript
{
  "name": "countries",
  "title": "Países",
  "resource": "countries",
  "endpoint": "/api/countries",
  "config": {
    "fields": [
      { "name": "name", "type": "string", "label": "Nome" },
      { "name": "code", "type": "string", "label": "Código" }
    ]
  }
}
```

### 4. Model Context Protocol (MCP)

Sistema de ferramentas para IA com:
- Descoberta automática de ferramentas
- Integração com modelos de IA
- Ferramentas customizadas por módulo

### 5. Sistema de Módulos

Arquitetura modular que permite:
- Adicionar módulos dinamicamente
- Instalar/desinstalar módulos
- Gerenciar dependências entre módulos
- Carregar models, routes e migrations de múltiplos módulos

### 6. OpenAPI/Swagger

Documentação automática da API com:
- Especificação OpenAPI 3.0
- Swagger UI em `/api-docs`
- Validação automática de requests
- Rotas dinâmicas adicionadas automaticamente

### 7. Menus Dinâmicos

Sistema de menus configuráveis por:
- Sistema
- Organização
- Role (papel do usuário)

## API Endpoints

### Autenticação
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `POST /auth/impersonate` - Impersonar usuário

### Usuários
- `GET /api/users` - Listar usuários
- `GET /api/users/:id` - Buscar usuário
- `POST /api/users` - Criar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Remover usuário

### Organizações
- `GET /api/organizations` - Listar organizações
- `GET /api/organizations/:id` - Buscar organização
- `POST /api/organizations` - Criar organização
- `PUT /api/organizations/:id` - Atualizar organização
- `DELETE /api/organizations/:id` - Remover organização

### Roles
- `GET /api/roles` - Listar roles
- `GET /api/roles/:id` - Buscar role
- `POST /api/roles` - Criar role
- `PUT /api/roles/:id` - Atualizar role
- `DELETE /api/roles/:id` - Remover role
- `GET /api/roles/:id/functions` - Listar funções de um role
- `PUT /api/roles/:id/functions` - Atualizar funções de um role

### Systems
- `GET /api/systems` - Listar sistemas
- `GET /api/systems/:id` - Buscar sistema
- `POST /api/systems` - Criar sistema
- `PUT /api/systems/:id` - Atualizar sistema
- `DELETE /api/systems/:id` - Remover sistema
- `GET /system/:sigla/:type` - Buscar icon/logo do sistema

### Functions (Permissões)
- `GET /api/functions` - Listar funções
- `GET /api/functions/:id` - Buscar função
- `POST /api/functions` - Criar função
- `PUT /api/functions/:id` - Atualizar função
- `DELETE /api/functions/:id` - Remover função

### CRUDs Dinâmicos
- `GET /api/cruds` - Listar CRUDs
- `GET /api/cruds/:id` - Buscar CRUD
- `GET /api/cruds/name/:name` - Buscar CRUD por nome
- `POST /api/cruds` - Criar CRUD
- `PUT /api/cruds/:id` - Atualizar CRUD
- `DELETE /api/cruds/:id` - Remover CRUD

### Menus
- `GET /api/menus` - Listar menus
- `GET /api/menus/user` - Menus do usuário logado
- `GET /api/menus/:id` - Buscar menu
- `POST /api/menus` - Criar menu
- `PUT /api/menus/:id` - Atualizar menu
- `DELETE /api/menus/:id` - Remover menu

### Models
- `GET /api/models` - Listar models
- `GET /api/models/:name` - Buscar model
- `POST /api/models` - Criar model
- `PUT /api/models/:name` - Atualizar model
- `POST /api/models/:name/migration` - Gerar migration
- `POST /api/models/:name/seeder` - Gerar seeder

### MCP
- `POST /api/mcp` - Endpoint MCP (JSON-RPC 2.0)

### Chat IA
- `POST /api/chatia` - Chat com IA

## Criando um Módulo

Para criar um novo módulo compatível com o Gestor:

### 1. Estrutura do Módulo

```
meu-modulo/
├── package.json
├── index.js
├── models/
├── controllers/
├── routes/
├── migrations/
├── seeders/
└── mcp/
```

### 2. package.json

```json
{
  "name": "@gestor/meu-modulo",
  "version": "1.0.0",
  "main": "index.js",
  "gestor": {
    "module": true,
    "name": "meu-modulo",
    "title": "Meu Módulo",
    "description": "Descrição do módulo",
    "version": "1.0.0",
    "enabled": true,
    "dependencies": ["system"]
  }
}
```

### 3. index.js

```javascript
const path = require('path');

module.exports = {
  name: 'meu-modulo',
  version: '1.0.0',
  
  // Exportar routes
  routes: {
    meuRecurso: require('./routes/meuRecurso')
  },
  
  // Exportar controllers
  controllers: {
    meuRecurso: require('./controllers/meuRecursoController')
  },
  
  // Paths
  paths: {
    models: path.join(__dirname, 'models'),
    migrations: path.join(__dirname, 'migrations'),
    seeders: path.join(__dirname, 'seeders'),
    mcp: path.join(__dirname, 'mcp')
  }
};
```

### 4. Registrar no Backend

```json
{
  "dependencies": {
    "@gestor/meu-modulo": "file:../modules/meu-modulo"
  }
}
```

## Lazy Loading

O sistema utiliza lazy loading para evitar problemas de inicialização:

```javascript
// ❌ Errado - carrega antes da inicialização
const db = require('../models');
const User = db.User;

// ✅ Correto - lazy loading
function getDb() {
  return require('../models');
}

exports.myFunction = async (req, res) => {
  const db = getDb();
  const User = db.User;
  // ... usar User
};
```

## Desenvolvimento

### Adicionar Nova Rota

1. Criar controller em `controllers/`
2. Criar route em `routes/`
3. Exportar route em `index.js`
4. Documentar no `openapi.yaml`

### Adicionar Novo Model

1. Criar model em `models/`
2. Criar migration em `migrations/`
3. Criar seeder em `seeders/`
4. Executar migration: `npm run db:migrate`
5. Executar seeder: `npm run db:seed`

### Adicionar MCP Tool

1. Criar arquivo em `mcp/tools/`
2. Exportar tool com formato MCP
3. Sistema descobrirá automaticamente

## Licença

ISC
