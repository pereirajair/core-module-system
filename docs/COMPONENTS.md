# Componentes Reutilizáveis

Este documento descreve os componentes e composables criados para padronizar e evitar duplicação de código no frontend.

## Componentes

### PageHeader.vue
Componente reutilizável para o cabeçalho das páginas com título, ícone e busca.

**Props:**
- `title` (String, obrigatório): Título da página
- `icon` (String, padrão: 'settings'): Ícone do Material Icons
- `showSearch` (Boolean, padrão: true): Mostrar campo de busca
- `searchValue` (String, padrão: ''): Valor do campo de busca

**Slots:**
- `actions`: Slot para ações customizadas no cabeçalho

**Emits:**
- `update:searchValue`: Quando o valor da busca muda
- `search`: Quando o usuário busca

**Exemplo:**
```vue
<PageHeader
  title="Usuários"
  icon="people"
  :search-value="filter"
  @search="onSearch"
/>
```

### CrudViewer.vue
Componente genérico para listagem de itens com tabela, busca, permissões e ações CRUD.

**Props:**
- `config` (Object, obrigatório): Configuração do CRUD
  - `title` (String): Título da página
  - `icon` (String): Ícone da página
  - `resource` (String): Nome do recurso para permissões (ex: 'users', 'roles')
  - `endpoint` (String): Endpoint da API para listar itens
  - `rowKey` (String, padrão: 'id'): Chave única das linhas
  - `columns` (Array): Colunas da tabela
  - `createRoute` (Function): Função que retorna a rota de criação
  - `editRoute` (Function): Função que retorna a rota de edição
  - `deleteMessage` (Function): Função que retorna mensagem de confirmação de exclusão
  - `deleteSuccessMessage` (String): Mensagem de sucesso ao excluir
  - `showSearch` (Boolean, padrão: true): Mostrar campo de busca
  - `showFab` (Boolean, padrão: true): Mostrar botão FAB de criação

**Slots:**
- `body-cell-{columnName}`: Slot para customizar células específicas
- `actions`: Slot para customizar ações da linha
- `header-actions`: Slot para ações customizadas no cabeçalho

**Exemplo:**
```vue
<CrudViewer :config="crudConfig">
  <template v-slot:body-cell-system="props">
    <q-td :props="props">
      {{ props.row.System?.name || '-' }}
    </q-td>
  </template>
</CrudViewer>
```

### CrudEdit.vue
Componente genérico para criação/edição de itens com formulário dinâmico baseado em configuração JSON.

**Props:**
- `config` (Object, obrigatório): Configuração do formulário
  - `title` (String): Título do recurso
  - `icon` (String): Ícone do recurso
  - `resource` (String): Nome do recurso para permissões
  - `endpoint` (String): Endpoint da API
  - `listRoute` (String): Rota para voltar à listagem
  - `rowKey` (String, padrão: 'id'): Chave única
  - `createTitle` (String): Título ao criar
  - `editTitle` (String): Título ao editar
  - `createSuccessMessage` (String): Mensagem de sucesso ao criar
  - `updateSuccessMessage` (String): Mensagem de sucesso ao atualizar
  - `loadItemEndpoint` (Function): Função que retorna endpoint customizado para carregar item
  - `fields` (Array): Array de campos do formulário
  - `relations` (Object|Array): Relações (TransferList) do formulário

**Campos do formulário (`fields`):**
- `name` (String): Nome do campo no formData
- `label` (String): Label do campo
- `type` (String): Tipo do campo ('text', 'email', 'password', 'number', 'textarea', 'select', 'color', 'file', 'date', 'component')
- `default` (Any): Valor padrão
- `rules` (Array): Regras de validação do Quasar
- `skipIfEmpty` (Boolean): Não enviar campo se vazio
- `options` (Array): Opções para select (se não usar optionsEndpoint)
- `optionsEndpoint` (String): Endpoint para carregar opções do select
- `optionLabel` (String): Campo para label das opções
- `optionValue` (String): Campo para value das opções
- `transformOptions` (Function): Função para transformar opções
- `accept` (String): Aceitar tipos de arquivo (para type='file')
- `previewType` (String): Tipo de preview ('image' para arquivos)
- `previewStyle` (String): Estilo do preview
- `inline` (Boolean): Para campos de cor, renderizar em linha
- `rows` (Number): Número de linhas para textarea
- `component` (Component): Componente Vue customizado (para type='component')
- `props` (Object): Props adicionais para passar ao componente customizado

**Relações (`relations`):**
- `type` (String): Tipo de relação ('transfer')
- `label` (String): Título da seção
- `endpoint` (String): Endpoint para carregar itens disponíveis
- `field` (String): Campo no response que contém os itens selecionados
- `itemLabel` (String): Campo para label dos itens
- `itemValue` (String): Campo para value dos itens
- `availableLabel` (String): Label da lista disponível
- `selectedLabel` (String): Label da lista selecionada
- `payloadField` (String): Nome do campo no payload
- `updateEndpoint` (String): Endpoint para atualizar relações (opcional)

**Exemplo:**
```vue
<CrudEdit :config="crudConfig" />
```

## Composables

### usePermissions.js
Composable para verificar permissões baseado no recurso.

**Parâmetros:**
- `resource` (String): Nome do recurso ('users', 'roles', 'organizations', etc.)

**Retorna:**
- `canView` (Computed): Se pode visualizar
- `canMaintain` (Computed): Se pode criar/editar
- `canDelete` (Computed): Se pode excluir

**Exemplo:**
```javascript
import { usePermissions } from 'composables/usePermissions';

const { canMaintain, canDelete } = usePermissions('users');
```

## Exemplos de Configuração

### Página de Listagem Simples
```javascript
const crudConfig = {
  title: 'Sistemas',
  icon: 'computer',
  resource: 'systems',
  endpoint: '/api/systems',
  rowKey: 'id',
  createRoute: () => '/admin/systems/new',
  editRoute: (row) => `/admin/systems/${row.id}`,
  deleteMessage: (row) => `Deseja realmente excluir o sistema "${row.name}"?`,
  deleteSuccessMessage: 'Sistema excluído com sucesso!',
  columns: [
    {
      name: 'name',
      required: true,
      label: 'Nome',
      align: 'left',
      field: 'name',
      sortable: true
    }
  ]
};
```

### Página de Edição com Relações
```javascript
const crudConfig = {
  title: 'Sistema',
  icon: 'computer',
  resource: 'systems',
  endpoint: '/api/systems',
  listRoute: '/admin/systems',
  rowKey: 'id',
  createTitle: 'Novo Sistema',
  editTitle: 'Editar Sistema',
  fields: [
    {
      name: 'name',
      label: 'Nome do Sistema',
      type: 'text',
      rules: [val => !!val || 'Nome é obrigatório']
    },
    {
      name: 'icon',
      label: 'Ícone',
      type: 'file',
      accept: '.png,image/png',
      previewType: 'image'
    }
  ],
  relations: {
    type: 'transfer',
    label: 'Funções',
    endpoint: '/api/functions',
    field: 'Functions',
    itemLabel: 'title',
    itemValue: 'id',
    payloadField: 'functionIds',
    updateEndpoint: 'functions'
  }
};
```

## Benefícios

1. **Redução de Código Duplicado**: Todas as páginas de listagem e edição seguem o mesmo padrão
2. **Manutenibilidade**: Mudanças em um componente afetam todas as páginas
3. **Consistência**: Interface padronizada em todo o sistema
4. **Produtividade**: Criar novas páginas CRUD é apenas configurar um JSON
5. **Permissões Centralizadas**: Verificação de permissões automática baseada no recurso

