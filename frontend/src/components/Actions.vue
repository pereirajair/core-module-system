<template>
  <div class="actions-container q-gutter-xs">
    <template v-for="(item, index) in normalizedItems" :key="index">
      <q-btn
        v-if="shouldShowItem(item)"
        :icon="item.icon"
        :color="item.color || 'primary'"
        :label="item.label"
        :flat="item.flat !== false"
        :round="item.round || false"
        :dense="item.dense !== false"
        :size="item.size || 'sm'"
        :loading="loadingStates[item.type]"
        @click.stop="handleClick(item)"
      >
        <q-tooltip v-if="item.tooltip">{{ item.tooltip }}</q-tooltip>
      </q-btn>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useActions } from '../composables/useActions';
import { useAuthStore } from '../stores/auth';

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  row: {
    type: Object,
    default: () => ({})
  },
  context: {
    type: Object,
    default: () => ({})
  },
  onRefresh: {
    type: Function,
    default: null
  }
});

const emit = defineEmits(['action-executed', 'refresh']);

const { executeAction, executeActions, canExecuteAction, checkCondition } = useActions();
const authStore = useAuthStore();
const loadingStates = ref({});

/**
 * Normaliza os items de actions, expandindo abreviações
 */
const normalizedItems = computed(() => {
  return props.items.map(item => {
    // Se for string, converter para objeto básico
    if (typeof item === 'string') {
      return normalizeStringAction(item);
    }
    
    // Se já for objeto, garantir estrutura mínima
    if (typeof item === 'object' && item !== null) {
      return {
        type: item.type || 'action',
        icon: item.icon || getDefaultIcon(item.type),
        color: item.color || 'primary',
        label: item.label || '',
        tooltip: item.tooltip || '',
        flat: item.flat !== false,
        round: item.round || false,
        dense: item.dense !== false,
        size: item.size || 'sm',
        actions: item.actions || [],
        roles: item.roles || [],
        condition: item.condition || null,
        ...item
      };
    }
    
    return null;
  }).filter(item => item !== null);
});

/**
 * Normaliza uma action string para objeto
 */
function normalizeStringAction(str) {
  const shortcuts = {
    'edit': { type: 'edit', icon: 'edit', color: 'primary' },
    'delete': { type: 'delete', icon: 'delete', color: 'negative' },
    'view': { type: 'view', icon: 'visibility', color: 'info' },
    'refresh': { type: 'refresh', icon: 'refresh', color: 'primary' }
  };
  
  return shortcuts[str] || { type: 'action', icon: 'more_vert', label: str };
}

/**
 * Retorna ícone padrão baseado no tipo
 */
function getDefaultIcon(type) {
  const icons = {
    'edit': 'edit',
    'delete': 'delete',
    'view': 'visibility',
    'refresh': 'refresh',
    'add': 'add',
    'save': 'save',
    'cancel': 'cancel',
    'close': 'close',
    'download': 'download',
    'upload': 'upload',
    'print': 'print',
    'export': 'file_download',
    'import': 'file_upload'
  };
  
  return icons[type] || 'more_vert';
}

/**
 * Verifica se o item deve ser exibido
 */
function shouldShowItem(item) {
  // Verificar permissões
  if (!canExecuteAction(item, props.row)) {
    return false;
  }
  
  // Verificar condições
  if (!checkCondition(item, props.row, props.context)) {
    return false;
  }
  
  return true;
}

/**
 * Manipula o clique em um item de action
 */
async function handleClick(item) {
  loadingStates.value[item.type] = true;
  try {
    const context = {
      ...props.context,
      onRefresh: props.onRefresh || (() => emit('refresh'))
    };
    
    // Se tiver actions definidas, executá-las
    if (item.actions && Array.isArray(item.actions) && item.actions.length > 0) {
      await executeActions(item.actions, props.row, context);
    } else {
      // Se não tiver actions, executar a própria action diretamente
      await executeAction(item, props.row, context);
    }
    
    emit('action-executed', { item, row: props.row });
  } catch (error) {
    console.error('Erro ao executar action:', error);
  } finally {
    loadingStates.value[item.type] = false;
  }
}
</script>

<style scoped>
.actions-container {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>

