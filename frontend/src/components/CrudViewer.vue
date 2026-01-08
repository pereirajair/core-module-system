<template>
  <q-page>
    <PageHeader
      :title="config.title"
      :icon="config.icon"
      :show-search="config.showSearch !== false"
      :search-value="filter"
      @search="onSearch"
    >
      <template v-slot:actions>
        <slot name="header-actions"></slot>
      </template>
    </PageHeader>

    <q-table
      :rows="items"
      :columns="tableColumns"
      :row-key="config.rowKey || 'id'"
      :loading="loading"
      v-model:pagination="pagination"
      @request="onRequest"
      @row-click="handleRowClick"
      :class="{ 'cursor-pointer': permissions.canMaintain }"
      flat
      class="no-margin"
    >
      <!-- Slot dinâmico para colunas com actions (deve vir antes dos slots genéricos) -->
      <template v-for="column in columnsWithActions" :key="`actions-${column.name}`" v-slot:[`body-cell-${column.name}`]="props">
        <q-td :props="props" :align="column.align || 'left'">
          <div class="row items-center q-gutter-sm no-wrap">
            <!-- Conteúdo da coluna -->
            <div class="col">
              <!-- Verificar se há slot customizado do componente pai -->
              <slot :name="`body-cell-${column.name}`" :row="props.row" :value="getColumnValue(column, props.row)">
                <!-- Se não houver slot customizado, renderizar valor padrão -->
                <q-icon v-if="column.type === 'icon'" :name="getColumnValue(column, props.row)" size="sm" />
                <!-- Renderizar boolean como badge -->
                <q-badge
                  v-else-if="column.format === 'badge' || (column.type === 'boolean' && !column.format)"
                  :color="getBadgeColor(column, props.row)"
                  :label="getBadgeLabel(column, props.row)"
                />
                <!-- Renderizar data formatada -->
                <span v-else-if="column.format === 'date' || column.format === 'datetime' || column.format === 'time'">
                  {{ formatColumnValue(column, props.row) }}
                </span>
                <span v-else>{{ formatColumnValue(column, props.row) }}</span>
              </slot>
            </div>
            <!-- Actions -->
            <div class="col-auto">
              <Actions
                :items="column.items || []"
                :row="props.row"
                :context="actionsContext"
                :on-refresh="fetchItems"
                @refresh="fetchItems"
              />
            </div>
          </div>
        </q-td>
      </template>

      <!-- Colunas normais (que podem ter type: icon ou image) -->
      <template v-for="col in normalColumns" :key="`col-${col.name}`" v-slot:[`body-cell-${col.name}`]="props">
        <q-td :props="props" :align="col.align || 'left'">
          <slot :name="`body-cell-${col.name}`" v-bind="props">
            <q-icon v-if="col.type === 'icon'" :name="getColumnValue(col, props.row)" size="sm" />
            <q-img
              v-else-if="col.type === 'image'"
              :src="getImageSrc(getColumnValue(col, props.row))"
              :alt="col.label || 'Imagem'"
              :style="col.imageStyle || 'width: 48px; height: 48px; object-fit: contain;'"
              :ratio="col.imageRatio || 1"
              fit="contain"
              loading="lazy"
            >
              <template v-slot:error>
                <q-icon name="image_not_supported" size="md" color="grey-5" />
              </template>
            </q-img>
            <!-- Renderizar boolean como badge -->
            <template v-else-if="col.format === 'badge' || (col.type === 'boolean' && !col.format)">
              <q-badge
                :color="getBadgeColor(col, props.row)"
                :label="getBadgeLabel(col, props.row)"
              />
            </template>
            <!-- Renderizar data formatada -->
            <template v-else-if="col.format === 'date' || col.format === 'datetime' || col.format === 'time'">
              {{ formatColumnValue(col, props.row) }}
            </template>
            <!-- Renderizar valor padrão -->
            <template v-else>
              {{ formatColumnValue(col, props.row) }}
            </template>
          </slot>
        </q-td>
      </template>

      <!-- Slots customizados do componente pai (exceto colunas com actions que já foram tratadas acima) -->
      <template v-for="(_, slot) in $slots" v-slot:[slot]="props">
        <!-- Não renderizar slots de colunas com actions aqui, já foram tratados acima -->
        <template v-if="!slot.startsWith('body-cell-') || !columnsWithActions.find(col => `body-cell-${col.name}` === slot)">
          <slot :name="slot" v-bind="props" />
        </template>
      </template>

      <!-- Slot para coluna actions (compatibilidade) -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props" :align="actionsColumnAlign">
          <slot name="actions" :row="props.row" :permissions="permissions">
            <Actions
              v-if="hasActionsConfig"
              :items="actionsConfig.items || []"
              :row="props.row"
              :context="actionsContext"
              :on-refresh="fetchItems"
              @refresh="fetchItems"
            />
            <template v-else>
              <q-btn
                v-if="canDeleteRow(props.row)"
                flat
                round
                dense
                color="negative"
                icon="delete"
                @click.stop="handleDelete(props.row)"
              />
            </template>
          </slot>
        </q-td>
      </template>
    </q-table>

    <!-- FAB Button para Novo Item (não exibir em telas readOnly) -->
    <q-page-sticky v-if="permissions.canMaintain && config.showFab !== false && !config.readOnly" position="bottom-right" :offset="[18, 18]">
      <q-btn
        fab
        color="primary"
        icon="add"
        @click="handleCreate"
      >
        <q-tooltip>{{ config.createLabel || 'Novo' }}</q-tooltip>
      </q-btn>
    </q-page-sticky>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { api } from '../boot/axios';
import PageHeader from './PageHeader.vue';
import Actions from './Actions.vue';
import { usePermissions } from '../composables/usePermissions';
import { useAuthStore } from '../stores/auth';

const props = defineProps({
  config: {
    type: Object,
    required: true,
    validator: (config) => {
      return config.title && config.endpoint && config.columns;
    }
  }
});

const emit = defineEmits(['create', 'edit', 'delete', 'row-click']);

const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();

const permissions = usePermissions(props.config.resource || '');
const items = ref([]);
const loading = ref(false);
const filter = ref('');
const pagination = ref({
  page: 1,
  rowsPerPage: 30,
  rowsNumber: 0,
  sortBy: null,
  descending: false
});

const tableColumns = computed(() => {
  const cols = props.config.columns.map(col => {
    // Se format for uma string, converter para função
    if (col.format && typeof col.format === 'string') {
      const formatType = col.format;
      return {
        ...col,
        format: (val) => {
          switch (formatType) {
            case 'date': {
              if (!val) return '-';
              const date = new Date(val);
              // Verificar se a data é válida
              if (isNaN(date.getTime())) return '-';
              return date.toLocaleDateString('pt-BR');
            }
            case 'datetime': {
              if (!val) return '-';
              const dateTime = new Date(val);
              // Verificar se a data é válida
              if (isNaN(dateTime.getTime())) return '-';
              const day = String(dateTime.getDate()).padStart(2, '0');
              const month = String(dateTime.getMonth() + 1).padStart(2, '0');
              const year = String(dateTime.getFullYear()).slice(-2);
              const hours = String(dateTime.getHours()).padStart(2, '0');
              const minutes = String(dateTime.getMinutes()).padStart(2, '0');
              return `${day}/${month}/${year} ${hours}:${minutes}`;
            }
            case 'time': {
              if (!val) return '-';
              const time = new Date(val);
              // Verificar se a data é válida
              if (isNaN(time.getTime())) return '-';
              return time.toLocaleTimeString('pt-BR');
            }
            case 'currency': {
              if (val === null || val === undefined) return '-';
              return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(val);
            }
            case 'number': {
              if (val === null || val === undefined) return '-';
              return new Intl.NumberFormat('pt-BR').format(val);
            }
            case 'badge':
              // Para badge, retornar o valor como está - o template pode usar isso
              return val;
            case 'array': {
              if (Array.isArray(val)) {
                return val.length > 0 ? `${val.length} item(ns)` : '-';
              }
              return val || '-';
            }
            default:
              return val || '-';
          }
        }
      };
    }
    // Se format já for uma função ou não existir, retornar como está
    return col;
  });
  
  // Adicionar coluna de ações se não existir
  if (!cols.find(col => col.name === 'actions')) {
    cols.push({
      name: 'actions',
      label: 'Ações',
      align: 'right',
      field: 'actions'
    });
  }
  return cols;
});

// Encontrar todas as colunas que têm items de actions (exceto a coluna "actions")
const columnsWithActions = computed(() => {
  return props.config.columns.filter(col => 
    col.name !== 'actions' && 
    col.items && 
    Array.isArray(col.items) && 
    col.items.length > 0
  );
});

// Colunas que não são de ações nem têm ações embutidas
const normalColumns = computed(() => {
  return props.config.columns.filter(col => 
    col.name !== 'actions' && 
    (!col.items || !Array.isArray(col.items) || col.items.length === 0)
  );
});

// Verificar se há configuração de actions na coluna actions
const actionsColumn = computed(() => {
  return props.config.columns.find(col => col.name === 'actions');
});

const hasActionsConfig = computed(() => {
  return actionsColumn.value && actionsColumn.value.items && Array.isArray(actionsColumn.value.items) && actionsColumn.value.items.length > 0;
});

const actionsConfig = computed(() => {
  return actionsColumn.value || {};
});

const actionsColumnAlign = computed(() => {
  return actionsColumn.value?.align || 'right';
});

const actionsContext = computed(() => {
  return {
    ...props.config,
    endpoint: props.config.endpoint,
    resource: props.config.resource,
    rowKey: props.config.rowKey || 'id',
    editRoute: props.config.editRoute,
    createRoute: props.config.createRoute,
    listRoute: props.config.listRoute || `/crud/${props.config.resource}`,
    deleteMessage: props.config.deleteMessage,
    deleteSuccessMessage: props.config.deleteSuccessMessage
  };
});

// Extrair campos de texto das colunas para busca
const searchableFields = computed(() => {
  const fields = [];
  
  props.config.columns.forEach(col => {
    // Ignorar colunas de ações e colunas sem field
    if (col.name === 'actions' || !col.field) return;
    
    // Ignorar campos aninhados (relacionamentos) - apenas campos diretos da tabela
    if (typeof col.field === 'string' && col.field.includes('.')) {
      // Campos aninhados não são pesquisáveis diretamente
      return;
    }
    
    // Ignorar se field for uma função
    if (typeof col.field === 'function') return;
    
    // Adicionar o campo se ainda não estiver na lista
    if (!fields.includes(col.field)) {
      fields.push(col.field);
    }
  });
  
  return fields;
});

async function fetchItems() {
  loading.value = true;
  try {
    // Construir query params para paginação e filtro
    const params = {
      page: pagination.value.page
    };
    
    // id_organization é obtido automaticamente do token, não precisa enviar como query param
    
    // Se rowsPerPage for 0 ou null, significa "All" - não enviar limit
    // Caso contrário, enviar o limit normalmente
    if (pagination.value.rowsPerPage && pagination.value.rowsPerPage > 0) {
      params.limit = pagination.value.rowsPerPage;
    }
    // Se for "All" (0 ou null), não enviar limit para buscar todos
    
    if (filter.value) {
      params.filter = filter.value;
      // Enviar campos pesquisáveis para o backend fazer busca OR
      if (searchableFields.value.length > 0) {
        params.searchFields = searchableFields.value.join(',');
      }
    }
    
    // Ordenação (server-side)
    if (pagination.value.sortBy) {
      params.sortBy = pagination.value.sortBy;
      params.desc = pagination.value.descending ? 'true' : 'false';
    }
    
    const response = await api.get(props.config.endpoint, { params });
    let data = response.data;
    
    // Verificar se a resposta está no formato com paginação (dynamicCrudController)
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
      // Formato com paginação: { data: [...], count: X, page: Y, limit: Z, totalPages: W }
      items.value = props.config.transform ? props.config.transform(data.data) : data.data;
      
      // Atualizar paginação com dados do servidor
      // IMPORTANTE: Criar novo objeto para garantir reatividade do Vue
      const newPagination = {
        ...pagination.value,
        rowsNumber: data.count !== undefined && data.count !== null ? Number(data.count) : Number(data.data.length),
        page: data.page !== undefined && data.page !== null ? Number(data.page) : pagination.value.page
      };
      
      // Se não foi enviado limit (All), manter rowsPerPage como 0
      // Se foi enviado limit, atualizar com o valor do servidor
      if (params.limit === undefined || params.limit === null) {
        // Se foi "All", manter como 0 para indicar "todos"
        newPagination.rowsPerPage = 0;
      } else {
        // Se foi um número específico, usar o valor retornado pelo servidor
        newPagination.rowsPerPage = data.limit !== undefined && data.limit !== null ? Number(data.limit) : pagination.value.rowsPerPage;
      }
      
      // Atualizar paginação de uma vez para garantir reatividade
      pagination.value = newPagination;
      
      console.log('Paginação atualizada:', {
        rowsNumber: pagination.value.rowsNumber,
        page: pagination.value.page,
        rowsPerPage: pagination.value.rowsPerPage,
        dataCount: data.count,
        dataLimit: data.limit,
        dataPage: data.page,
        itemsLength: items.value.length
      });
    } else if (Array.isArray(data)) {
      // Formato array direto: [...]
      items.value = props.config.transform ? props.config.transform(data) : data;
      pagination.value.rowsNumber = items.value.length;
      // Se for "All", manter rowsPerPage como o tamanho do array
      if (!params.limit) {
        pagination.value.rowsPerPage = items.value.length;
      }
    } else {
      // Formato desconhecido, tentar usar transform ou usar array vazio
      items.value = props.config.transform ? props.config.transform(data) : [];
      pagination.value.rowsNumber = items.value.length;
      if (!params.limit) {
        pagination.value.rowsPerPage = items.value.length;
      }
    }
  } catch (error) {
    console.log(error);
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || `Erro ao carregar ${props.config.title.toLowerCase()}`,
      icon: 'warning'
    });
  } finally {
    loading.value = false;
  }
}

function onRequest(requestProps) {
  // O Quasar Table já atualiza a paginação automaticamente quando usamos v-model:pagination
  // Aqui apenas precisamos buscar os dados do servidor
  // O requestProps.pagination contém os novos valores que o usuário selecionou
  if (requestProps && requestProps.pagination) {
    // Preservar rowsNumber atual (será atualizado quando recebermos resposta do servidor)
    const currentRowsNumber = pagination.value.rowsNumber;
    
    // Atualizar paginação com os valores solicitados pelo usuário
    pagination.value = {
      ...pagination.value,
      ...requestProps.pagination,
      // Preservar rowsNumber se não foi fornecido ou se for 0 (evitar resetar para 0)
      rowsNumber: requestProps.pagination.rowsNumber && requestProps.pagination.rowsNumber > 0 
        ? requestProps.pagination.rowsNumber 
        : currentRowsNumber
    };
    console.log('onRequest - Paginação solicitada:', pagination.value);
  }
  // Buscar dados do servidor com a nova paginação
  fetchItems();
}

function onSearch(value) {
  filter.value = value;
  // Resetar para primeira página quando buscar
  pagination.value.page = 1;
  // Buscar novamente com o novo filtro
  fetchItems();
}

function getColumnValue(column, row) {
  if (!column.field) return '-';
  
  // Se field for uma função, executá-la
  if (typeof column.field === 'function') {
    const value = column.field(row);
    return value !== undefined && value !== null ? value : '-';
  }
  
  // Se field for uma string com path aninhado (ex: "System.name")
  if (typeof column.field === 'string' && column.field.includes('.')) {
    const parts = column.field.split('.');
    let value = row;
    for (const part of parts) {
      if (value === undefined || value === null) return '-';
      value = value[part];
    }
    return value !== undefined && value !== null ? value : '-';
  }
  
  // Field simples
  const value = row[column.field];
  return value !== undefined && value !== null ? value : '-';
}

function formatColumnValue(column, row) {
  const value = getColumnValue(column, row);
  
  // Se a coluna tem format no tableColumns, usar ele
  const tableCol = tableColumns.value.find(col => col.name === column.name);
  if (tableCol && tableCol.format && typeof tableCol.format === 'function') {
    return tableCol.format(value);
  }
  
  // Se a coluna tem format como string, aplicar formatação
  if (column.format) {
    if (typeof column.format === 'string') {
      switch (column.format) {
        case 'date': {
          if (!value || value === '-') return '-';
          const date = new Date(value);
          // Verificar se a data é válida
          if (isNaN(date.getTime())) return '-';
          return date.toLocaleDateString('pt-BR');
        }
        case 'datetime': {
          if (!value || value === '-') return '-';
          const dateTime = new Date(value);
          // Verificar se a data é válida
          if (isNaN(dateTime.getTime())) return '-';
          const day = String(dateTime.getDate()).padStart(2, '0');
          const month = String(dateTime.getMonth() + 1).padStart(2, '0');
          const year = String(dateTime.getFullYear()).slice(-2);
          const hours = String(dateTime.getHours()).padStart(2, '0');
          const minutes = String(dateTime.getMinutes()).padStart(2, '0');
          return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
        case 'time': {
          if (!value || value === '-') return '-';
          const time = new Date(value);
          // Verificar se a data é válida
          if (isNaN(time.getTime())) return '-';
          return time.toLocaleTimeString('pt-BR');
        }
        case 'currency': {
          if (value === null || value === undefined || value === '-') return '-';
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(value);
        }
        case 'number': {
          if (value === null || value === undefined || value === '-') return '-';
          return new Intl.NumberFormat('pt-BR').format(value);
        }
        default:
          return value;
      }
    }
  }
  
  return value;
}

function getImageSrc(value) {
  if (!value) return '';
  // Se já começar com data:, retornar como está
  if (typeof value === 'string' && value.startsWith('data:')) {
    return value;
  }
  // Se for string base64, adicionar prefixo data:image/png;base64,
  if (typeof value === 'string') {
    return `data:image/png;base64,${value}`;
  }
  return '';
}

function getBadgeColor(column, row) {
  const value = getColumnValue(column, row);
  
  // Se tiver badgeMap, usar ele
  if (column.badgeMap && typeof column.badgeMap === 'object') {
    const badgeConfig = column.badgeMap[value];
    if (badgeConfig && badgeConfig.color) {
      return badgeConfig.color;
    }
  }
  
  // Fallback para boolean
  if (typeof value === 'boolean') {
    return value ? 'positive' : 'negative';
  }
  
  return 'info';
}

function getBadgeLabel(column, row) {
  const value = getColumnValue(column, row);
  
  // Se tiver badgeMap, usar ele
  if (column.badgeMap && typeof column.badgeMap === 'object') {
    const badgeConfig = column.badgeMap[value];
    if (badgeConfig && badgeConfig.label) {
      return badgeConfig.label;
    }
  }
  
  // Fallback para boolean
  if (typeof value === 'boolean') {
    return value ? (column.badgeTrueLabel || 'Ativo') : (column.badgeFalseLabel || 'Inativo');
  }
  
  return String(value);
}

function canDeleteRow(row) {
  // Nunca permitir exclusão em cruds somente leitura
  if (props.config.readOnly) return false;
  if (!permissions.canDelete) return false;
  if (props.config.canDelete) {
    return typeof props.config.canDelete === 'function' 
      ? props.config.canDelete(row) 
      : props.config.canDelete;
  }
  return true;
}

function handleRowClick(evt, row) {
  // Verificar se pode editar (se config.canEdit for função, chamar, senão verificar propriedade)
  const canEdit = props.config.canEdit 
    ? (typeof props.config.canEdit === 'function' ? props.config.canEdit(row) : props.config.canEdit)
    : permissions.canMaintain;
  
  if (canEdit) {
    emit('row-click', row);
    if (props.config.editRoute) {
      router.push(props.config.editRoute(row));
    } else {
      emit('edit', row);
    }
  }
}

function handleCreate() {
  emit('create');
  if (props.config.createRoute) {
    const route = typeof props.config.createRoute === 'function' 
      ? props.config.createRoute() 
      : props.config.createRoute;
    router.push(route);
  }
}

function handleDelete(row) {
  $q.dialog({
    title: 'Confirmar exclusão',
    message: props.config.deleteMessage 
      ? props.config.deleteMessage(row)
      : `Deseja realmente excluir este item?`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    deleteItem(row);
  });
}

async function deleteItem(row) {
  try {
    await api.delete(`${props.config.endpoint}/${row[props.config.rowKey || 'id']}`);
    $q.notify({
      color: 'positive',
      message: props.config.deleteSuccessMessage || 'Item excluído com sucesso!',
      icon: 'check'
    });
    fetchItems();
    emit('delete', row);
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao excluir item',
      icon: 'warning'
    });
  }
}

onMounted(() => {
  fetchItems();
});
</script>

