<template>
  <div class="sub-crud-table">
    <div class="row q-mb-md items-center">
      <div class="text-subtitle2">{{ relation.label || 'Itens Relacionados' }}</div>
      <q-space />
      <q-btn
        outline
        color="primary"
        icon="add"
        :label="relation.addLabel || 'Adicionar'"
        size="sm"
        dense
        @click="openDialog()"
      />
    </div>

    <!-- Tabela de Itens -->
    <q-table
      :rows="items"
      :columns="tableColumns"
      row-key="__index"
      flat
      bordered
      :pagination="{ rowsPerPage: 10 }"
      :loading="loading || loadingCrud"
      no-data-label="Nenhum item adicionado"
    >
      <template v-for="col in tableColumns.filter(c => c.name !== 'actions')" :key="col.name" v-slot:[`body-cell-${col.name}`]="props">
        <q-td :props="props">
          <q-icon v-if="col.type === 'icon'" :name="getColumnValue(col, props.row)" size="sm" />
          <template v-else>
            {{ getColumnValue(col, props.row) }}
          </template>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            flat
            round
            dense
            color="primary"
            icon="edit"
            size="sm"
            @click="openDialog(props.row, props.rowIndex)"
          >
            <q-tooltip>Editar</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            color="negative"
            icon="delete"
            size="sm"
            @click="deleteItem(props.rowIndex)"
          >
             <q-tooltip>Excluir</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <!-- Dialog de Add/Edit -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card style="min-width: 500px; max-width: 80vw;">
        <q-card-section>
          <div class="text-h6">{{ editingIndex !== null ? 'Editar Item' : 'Novo Item' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit="saveItem" class="q-gutter-md">
            <template v-for="field in formFields" :key="field.name">
              <RenderField
                :field="field"
                :form-data="currentItem"
                :file-refs="currentItemFileRefs"
                :select-options="selectOptions"
                :options-map="optionsMap"
                :loading-map="loadingMap"
                @file-upload="handleFileUpload"
                @update:model-value="(payload) => currentItem[payload.field] = payload.value"
              />
            </template>
          </q-form>
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn flat label="Salvar" color="primary" @click="saveItem" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { api } from '../boot/axios';
import RenderField from './RenderField.vue';

const props = defineProps({
  relation: {
    type: Object,
    required: true
  },
  modelValue: {
    type: Array, // Array of objects
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  selectOptions: {
    type: Object,
    default: () => ({})
  },
  optionsMap: {
    type: Object,
    default: () => ({})
  },
  loadingMap: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue']);

// Local state for items
// We add an __index property if it doesn't exist to track rows in q-table if needed,
// but usually we can rely on rowIndex from q-table slots.
const items = ref([]);

// CRUD referenciado (quando usa recursividade)
const referencedCrud = ref(null);
const loadingCrud = ref(false);

// Sync props to local state
watch(() => props.modelValue, (newVal) => {
  // Ensure we don't cause infinite loop if values are identical
  if (JSON.stringify(newVal) !== JSON.stringify(items.value)) {
    items.value = Array.isArray(newVal) ? [...newVal] : [];
  }
}, { immediate: true, deep: true });

// Carregar CRUD referenciado se houver crudName ou id_crud
async function loadReferencedCrud() {
  const crudName = props.relation.crudName;
  const idCrud = props.relation.id_crud;
  
  if (!crudName && !idCrud) {
    // Se não há referência, usar columns e fields diretamente da relação (compatibilidade)
    return;
  }
  
  loadingCrud.value = true;
  try {
    let response;
    if (idCrud) {
      // Buscar por ID
      response = await api.get(`/api/cruds/${idCrud}`);
    } else if (crudName) {
      // Buscar por nome
      response = await api.get(`/api/cruds/name/${crudName}`);
    }
    
    if (response && response.data) {
      referencedCrud.value = response.data;
    }
  } catch (error) {
    console.error('Erro ao carregar CRUD referenciado:', error);
  } finally {
    loadingCrud.value = false;
  }
}

// Table Columns configuration - usar do CRUD referenciado ou da relação
const tableColumns = computed(() => {
  let cols = [];
  
  if (referencedCrud.value && referencedCrud.value.config && referencedCrud.value.config.columns) {
    // Usar columns do CRUD referenciado
    cols = referencedCrud.value.config.columns;
  } else if (props.relation.columns) {
    // Usar columns diretamente da relação (compatibilidade)
    cols = props.relation.columns;
  }
  
  // Add actions column if not present
  return [
    ...cols,
    { name: 'actions', label: 'Ações', field: 'actions', align: 'right', sortable: false }
  ];
});

// Fields para o formulário - usar do CRUD referenciado ou da relação
const formFields = computed(() => {
  if (referencedCrud.value && referencedCrud.value.config && referencedCrud.value.config.fields) {
    // Usar fields do CRUD referenciado
    return referencedCrud.value.config.fields;
  } else if (props.relation.fields) {
    // Usar fields diretamente da relação (compatibilidade)
    return props.relation.fields;
  }
  return [];
});

// Dialog State
const dialogOpen = ref(false);
const editingIndex = ref(null); // null means new item
const currentItem = ref({});
const currentItemFileRefs = ref({});

function openDialog(item = null, index = null) {
  editingIndex.value = index;
  
  if (item) {
    currentItem.value = { ...item };
  } else {
    // Initialize defaults usando formFields (que pode vir do CRUD referenciado ou da relação)
    const newItem = {};
    formFields.value.forEach(f => {
      newItem[f.name] = f.default !== undefined ? f.default : (f.defaultValue !== undefined ? f.defaultValue : '');
    });
    currentItem.value = newItem;
  }
  
  // Clear file refs for the dialog
  currentItemFileRefs.value = {};
  
  dialogOpen.value = true;
}

function saveItem() {
  // Validate item? (Basic HTML validation happens in q-form, but here we manually click save)
  // For proper validation, we'd need a ref to the form.
  // Assuming basic valid for now or manual check.

  if (editingIndex.value !== null) {
    // Update existing
    items.value[editingIndex.value] = { ...currentItem.value };
  } else {
    // Add new
    items.value.push({ ...currentItem.value });
  }

  emit('update:modelValue', items.value);
  dialogOpen.value = false;
}

function deleteItem(index) {
  if (confirm('Tem certeza que deseja remover este item?')) {
    items.value.splice(index, 1);
    emit('update:modelValue', items.value);
  }
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

function handleFileUpload(payload) {
  const { field, file } = payload;
  if (file && field.type === 'file') {
    const reader = new FileReader();
    reader.onload = (e) => {
      currentItem.value[field.name] = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

// Carregar CRUD referenciado quando o componente for montado ou quando a relação mudar
watch(() => [props.relation.crudName, props.relation.id_crud], () => {
  loadReferencedCrud();
}, { immediate: true });

onMounted(() => {
  loadReferencedCrud();
});

</script>

<style scoped>
.sub-crud-table {
  width: 100%;
}
</style>
