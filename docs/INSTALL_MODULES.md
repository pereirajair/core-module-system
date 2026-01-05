# Instalação de Módulos Gestor

Todos os módulos estão configurados como dependências do backend e serão instalados automaticamente com `npm install`.

## Módulos Disponíveis

- `@gestor/system` - Módulo core do sistema
- `@gestor/chat` - Módulo de chat
- `@gestor/locations` - Módulo de localizações
- `@gestor/pessoa` - Módulo de pessoas

## Instalação Automática

```bash
cd backend
npm install
```

Os módulos serão baixados do GitHub e instalados em `node_modules/@gestor/`.

## Atualizar Módulos

Para atualizar os módulos após mudanças no GitHub:

```bash
cd backend
npm update @gestor/system @gestor/chat @gestor/locations @gestor/pessoa
```

Ou para forçar reinstalação:

```bash
cd backend
npm install @gestor/system@latest @gestor/chat@latest @gestor/locations@latest @gestor/pessoa@latest --force
```

## Instalar Versão Específica

Para instalar uma versão específica ou branch:

```bash
# Instalar de uma branch específica
npm install @gestor/pessoa@git+https://github.com/pereirajair/core-module-pessoa.git#nome-da-branch

# Instalar de um commit específico
npm install @gestor/pessoa@git+https://github.com/pereirajair/core-module-pessoa.git#commit-hash
```

## Desenvolvimento Local

Para desenvolver localmente usando os módulos da pasta `modules/`:

```bash
cd backend
npm install file:../modules/system --save
npm install file:../modules/chat --save
npm install file:../modules/locations --save
npm install file:../modules/pessoa --save
```

Isso sobrescreverá as dependências do GitHub com as versões locais.

## Voltar para Versão do GitHub

Para voltar a usar as versões do GitHub:

```bash
cd backend
npm install @gestor/system@git+https://github.com/pereirajair/core-module-system.git --save
npm install @gestor/chat@git+https://github.com/pereirajair/core-module-chat.git --save
npm install @gestor/locations@git+https://github.com/pereirajair/core-module-locations.git --save
npm install @gestor/pessoa@git+https://github.com/pereirajair/core-module-pessoa.git --save
```

## Repositórios GitHub

- [@gestor/system](https://github.com/pereirajair/core-module-system)
- [@gestor/chat](https://github.com/pereirajair/core-module-chat)
- [@gestor/locations](https://github.com/pereirajair/core-module-locations)
- [@gestor/pessoa](https://github.com/pereirajair/core-module-pessoa)
