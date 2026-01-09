# Módulos Gestor

Este diretório contém módulos do sistema Gestor que podem ser instalados como pacotes npm.

## Estrutura

Cada módulo é um pacote npm independente que pode ser instalado via:
- Repositório git local
- Repositório git remoto
- npm registry (futuro)

## Módulos Disponíveis

### @gestor/system
Módulo core do sistema com funcionalidades essenciais (usuários, roles, permissões, CRUDs, menus, etc).

### @gestor/chat
Módulo para gerenciamento de chats.

### @gestor/locations
Módulo de gerenciamento de localizações (cidades, estados, países, endereços).

### @gestor/pessoa
Módulo de gerenciamento de pessoas.

## Instalação

### Instalar módulos locais (desenvolvimento)

Os módulos estão configurados no `package.json` do frontend e serão instalados automaticamente:

```bash
cd frontend
npm install
```

Isso instalará os módulos de `mod/` como dependências locais via `file:../mod/*`.

### Instalar módulos manualmente

```bash
# No diretório frontend
cd frontend

# Instalar módulo system
npm install file:../mod/system --save

# Instalar módulo chat
npm install file:../mod/chat --save

# Instalar módulo locations
npm install file:../mod/locations --save

# Instalar módulo pessoa
npm install file:../mod/pessoa --save
```

### Instalar de repositório git remoto

Cada módulo tem seu próprio repositório Git. Para instalar de um repositório remoto:

```bash
cd frontend

# Instalar de um repositório git remoto
npm install git+https://github.com/pereirajair/core-module-system.git --save
npm install git+https://github.com/pereirajair/core-module-chat.git --save
npm install git+https://github.com/pereirajair/core-module-locations.git --save
npm install git+https://github.com/pereirajair/core-module-pessoa.git --save
```

## Atualização de Módulos

Para atualizar os módulos após mudanças:

```bash
cd frontend
npm update @gestor/system @gestor/chat @gestor/locations @gestor/pessoa
```

Ou para forçar reinstalação:

```bash
cd frontend
npm install @gestor/system@latest @gestor/chat@latest @gestor/locations@latest @gestor/pessoa@latest --force
```

## Desenvolvimento de Módulos

### Criar um novo módulo

1. Criar estrutura básica:
```bash
mkdir mod/meu-modulo
cd mod/meu-modulo
npm init -y
```

2. Criar `package.json` com configuração gestor:
```json
{
  "name": "@gestor/meu-modulo",
  "version": "1.0.0",
  "gestor": {
    "module": true,
    "name": "meu-modulo",
    "title": "Meu Módulo",
    "description": "Descrição do módulo",
    "version": "1.0.0",
    "enabled": false,
    "dependencies": [],
    "isSystem": false
  }
}
```

3. Criar estrutura de pastas:
```
meu-modulo/
├── models/
├── migrations/
├── seeders/
├── routes/
├── controllers/
├── package.json
├── index.js (opcional)
└── README.md
```

4. Criar `index.js`:
```javascript
const fs = require('fs');
const path = require('path');

let moduleInfo = {};
const moduleJsonPath = path.join(__dirname, 'module.json');
const packageJsonPath = path.join(__dirname, 'package.json');

if (fs.existsSync(moduleJsonPath)) {
  moduleInfo = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf8'));
} else if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (pkg.gestor) {
    moduleInfo = pkg.gestor;
  }
}

moduleInfo.path = __dirname;
module.exports = moduleInfo;
```

5. Inicializar git:
```bash
git init
git add .
git commit -m "Initial commit"
```

6. Instalar no projeto:
```bash
cd frontend
npm install file:../mod/meu-modulo --save
```

## Como Funciona

O sistema Gestor detecta automaticamente módulos instalados em `node_modules/@gestor/*` através do carregador de módulos. 

Cada módulo deve:
1. Ter um `package.json` com campo `gestor.module: true`
2. Ter informações do módulo no campo `gestor` do `package.json` ou em um arquivo `module.json`
3. Seguir a estrutura padrão de módulos (models, migrations, seeders, routes, controllers, frontend)

## Compatibilidade com Projetos Quasar

Os módulos podem ser instalados em qualquer projeto Quasar/Node.js que use o sistema Gestor. Basta:

1. Instalar os módulos via npm no diretório `frontend/`:
```bash
cd frontend
npm install @gestor/system @gestor/chat @gestor/locations @gestor/pessoa
```

2. O sistema detectará automaticamente os módulos em `node_modules/@gestor/*`

3. O carregador de módulos já faz isso automaticamente

## Repositórios GitHub

- [@gestor/system](https://github.com/pereirajair/core-module-system)
- [@gestor/chat](https://github.com/pereirajair/core-module-chat)
- [@gestor/locations](https://github.com/pereirajair/core-module-locations)
- [@gestor/pessoa](https://github.com/pereirajair/core-module-pessoa)
