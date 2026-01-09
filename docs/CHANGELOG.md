# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado
- Arquitetura unificada frontend + backend na pasta `frontend/`
- Módulos organizados em `mod/` com repositórios Git independentes
- Sistema de documentação centralizado em `mod/system/docs/` com categorias
- CHANGELOG.md para rastreamento de mudanças
- DOCUMENTATION_RULES.md com regras para manter documentação sincronizada
- README.md principal na raiz do projeto com visão geral
- README.md em `mod/system/docs/` como índice da documentação

### Mudado
- Frontend e backend agora estão integrados na pasta `frontend/`
- Módulos movidos para `mod/` (antes `old/`)
- Documentação reorganizada em categorias:
  - `getting-started/` - Guias de início rápido
  - `architecture/` - Documentação de arquitetura
  - `modules/` - Documentação de módulos
  - `frontend/` - Documentação do frontend
  - `backend/` - Documentação do backend
  - `api/` - Documentação de APIs
- README.md principal atualizado com nova estrutura
- Todos os arquivos de documentação atualizados para refletir nova estrutura (`mod/` ao invés de `modules/`, `frontend/` ao invés de `backend/`)
- Referências a `organizationId` atualizadas para `id_organization` na documentação

### Removido
- Pasta `backend/` separada (agora integrada em `frontend/`)
- Documentação duplicada e desatualizada
- Arquivo `structure.json` obsoleto

## [1.0.0] - 2025-01-08

### Adicionado
- Sistema modular com módulos npm independentes
- Frontend Quasar com componentes reutilizáveis
- Backend Express com sistema de módulos
- Sistema de autenticação JWT
- Sistema de permissões baseado em roles e funções
- CRUD dinâmico configurável via JSON
- Sistema de logs (GestorSys)
- Sistema de filas (Queues)
- Sistema de batch jobs
- Sistema de cron jobs
- Chat IA com suporte a OpenAI e DeepSeek
- Model Context Protocol (MCP) para integração com IAs
- Sistema de actions em CRUDs
- Multi-tenancy com organizações
- Sistema de menus dinâmico

### Documentação
- README.md principal
- Documentação de módulos
- Documentação de componentes
- Documentação de API
- Guias de instalação e configuração

