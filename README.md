# Módulo System

Módulo core do sistema Gestor com funcionalidades essenciais.

## Instalação

### Como pacote npm de repositório git

```bash
npm install git+https://github.com/pereirajair/core-module-system.git --save
```

## Estrutura

```
system/
├── models/          # Models do Sequelize
├── migrations/      # Migrations do banco de dados
├── seeders/         # Seeders de dados
├── routes/          # Rotas da API
├── controllers/     # Controllers da API
├── package.json     # Configuração do pacote npm
├── module.json      # Configuração do módulo (opcional)
└── README.md        # Este arquivo
```

## Funcionalidades

- Usuários e autenticação
- Roles e permissões
- Organizações
- Sistemas
- Funções
- Menus e Menu Items
- CRUDs dinâmicos
- Model Definitions
- Settings

## Uso

Este é um módulo de sistema e deve estar sempre habilitado. Ele será automaticamente detectado pelo sistema Gestor.

## Desenvolvimento

Para desenvolver este módulo:

1. Clone o repositório
2. Faça suas alterações
3. Commit e push para o repositório
4. No projeto principal, execute `npm update @gestor/system` para atualizar

