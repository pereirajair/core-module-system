<template>
  <div class="row q-gutter-md">
    <!-- Lista de itens disponíveis -->
    <div class="col">
      <div class="text-subtitle2 q-mb-sm">{{ availableLabel }}</div>
      <q-card class="transfer-list-container">
        <!-- Header com busca e select all -->
        <div class="q-px-sm q-py-xs bg-grey-2 border-bottom flex items-center no-wrap q-gutter-sm">
          <q-checkbox
            :model-value="availableSelectionState"
            @click="toggleAllAvailable"
            dense
          >
             <q-tooltip>Selecionar/Desfazer todos visíveis</q-tooltip>
          </q-checkbox>
          <q-input
            v-model="availableSearch"
            dense
            outlined
            placeholder="Pesquisar..."
            class="full-width"
            bg-color="white"
          >
            <template v-slot:append>
              <q-icon name="search" size="xs" />
              <q-icon 
                v-if="availableSearch" 
                name="close" 
                size="xs" 
                class="cursor-pointer" 
                @click="availableSearch = ''" 
              />
            </template>
          </q-input>
        </div>

        <q-list bordered separator>
          <q-item
            v-for="item in availableItemsFinal"
            :key="getItemValue(item)"
            clickable
            v-ripple
            @click="toggleAvailableSelection(item)"
          >
            <q-item-section avatar>
              <q-checkbox
                :model-value="isAvailableSelected(item)"
                @update:model-value="toggleAvailableSelection(item)"
                @click.stop
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ getItemLabel(item) }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-if="availableItemsFinal.length === 0">
            <q-item-section>
              <q-item-label class="text-grey-6">Nenhum item disponível</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </div>

    <!-- Botões de transferência -->
    <div class="col-auto flex flex-center">
      <div class="column q-gutter-sm">
        <q-btn
          round
          color="primary"
          icon="arrow_forward"
          :disable="selectedAvailableValues.length === 0"
          @click="moveToSelected"
        >
          <q-tooltip>Adicionar selecionados</q-tooltip>
        </q-btn>
        <q-btn
          round
          color="primary"
          icon="arrow_back"
          :disable="selectedInSelectedValues.length === 0"
          @click="moveToAvailable"
        >
          <q-tooltip>Remover selecionados</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Lista de itens selecionados -->
    <div class="col">
      <div class="text-subtitle2 q-mb-sm">{{ selectedLabel }}</div>
      <q-card class="transfer-list-container">
        <!-- Header com busca e select all -->
        <div class="q-px-sm q-py-xs bg-grey-2 border-bottom flex items-center no-wrap q-gutter-sm">
          <q-checkbox
            :model-value="selectedInSelectedState"
            @click="toggleAllSelected"
            dense
          >
             <q-tooltip>Selecionar/Desfazer todos visíveis</q-tooltip>
          </q-checkbox>
          <q-input
            v-model="selectedSearch"
            dense
            outlined
            placeholder="Pesquisar..."
            class="full-width"
            bg-color="white"
          >
            <template v-slot:append>
              <q-icon name="search" size="xs" />
              <q-icon 
                v-if="selectedSearch" 
                name="close" 
                size="xs" 
                class="cursor-pointer" 
                @click="selectedSearch = ''" 
              />
            </template>
          </q-input>
        </div>

        <q-list bordered separator>
          <q-item
            v-for="item in selectedItemsFinal"
            :key="getItemValue(item)"
            clickable
            v-ripple
            @click="toggleSelectedSelection(item)"
          >
            <q-item-section avatar>
              <q-checkbox
                :model-value="isSelectedSelected(item)"
                @update:model-value="toggleSelectedSelection(item)"
                @click.stop
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ getItemLabel(item) }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-if="selectedItemsFinal.length === 0">
            <q-item-section>
              <q-item-label class="text-grey-6">Nenhum item selecionado</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  availableItems: {
    type: Array,
    required: true,
    default: () => []
  },
  selectedItems: {
    type: Array,
    required: true,
    default: () => []
  },
  itemLabel: {
    type: [String, Function],
    default: 'name'
  },
  itemValue: {
    type: [String, Function],
    default: 'id'
  },
  availableLabel: {
    type: String,
    default: 'Disponíveis'
  },
  selectedLabel: {
    type: String,
    default: 'Selecionados'
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:selectedItems']);

const availableSearch = ref('');
const selectedSearch = ref('');

const selectedAvailableValues = ref([]);
const selectedInSelectedValues = ref([]);
const selectedItemsInternal = ref([...props.selectedItems]);

function getItemLabel(item) {
  if (typeof props.itemLabel === 'function') {
    return props.itemLabel(item);
  }
  return item[props.itemLabel];
}

function getItemValue(item) {
  if (typeof props.itemValue === 'function') {
    return props.itemValue(item);
  }
  return item[props.itemValue];
}

// Atualizar lista selecionada quando props mudarem
watch(() => props.selectedItems, (newVal) => {
  selectedItemsInternal.value = [...newVal];
  selectedInSelectedValues.value = [];
}, { deep: true });

// Filtrar itens disponíveis (remover os que já estão selecionados)
const availableItemsFiltered = computed(() => {
  const selectedValues = selectedItemsInternal.value.map(item => getItemValue(item));
  return props.availableItems.filter(item => {
    const value = getItemValue(item);
    return !selectedValues.includes(value);
  });
});

// Busca nos disponíveis
const availableItemsFinal = computed(() => {
  if (!availableSearch.value) return availableItemsFiltered.value;
  const search = availableSearch.value.toLowerCase();
  return availableItemsFiltered.value.filter(item => 
    getItemLabel(item).toLowerCase().includes(search)
  );
});

// Busca nos selecionados
const selectedItemsFinal = computed(() => {
  if (!selectedSearch.value) return selectedItemsInternal.value;
  const search = selectedSearch.value.toLowerCase();
  return selectedItemsInternal.value.filter(item => 
    getItemLabel(item).toLowerCase().includes(search)
  );
});

// Estado da seleção para o checkbox "Select All" da esquerda
const availableSelectionState = computed(() => {
  const visible = availableItemsFinal.value.map(i => getItemValue(i));
  if (visible.length === 0) return false;
  const selected = visible.filter(v => selectedAvailableValues.value.includes(v));
  if (selected.length === visible.length) return true;
  if (selected.length > 0) return 'maybe';
  return false;
});

// Estado da seleção para o checkbox "Select All" da direita
const selectedInSelectedState = computed(() => {
  const visible = selectedItemsFinal.value.map(i => getItemValue(i));
  if (visible.length === 0) return false;
  const selected = visible.filter(v => selectedInSelectedValues.value.includes(v));
  if (selected.length === visible.length) return true;
  if (selected.length > 0) return 'maybe';
  return false;
});

function toggleAllAvailable() {
  const visibleValues = availableItemsFinal.value.map(i => getItemValue(i));
  const alreadySelected = visibleValues.filter(v => selectedAvailableValues.value.includes(v));
  
  if (alreadySelected.length === visibleValues.length) {
    // Desmarcar todos os visíveis
    selectedAvailableValues.value = selectedAvailableValues.value.filter(v => !visibleValues.includes(v));
  } else {
    // Marcar todos os visíveis
    const s = new Set([...selectedAvailableValues.value, ...visibleValues]);
    selectedAvailableValues.value = Array.from(s);
  }
}

function toggleAllSelected() {
  const visibleValues = selectedItemsFinal.value.map(i => getItemValue(i));
  const alreadySelected = visibleValues.filter(v => selectedInSelectedValues.value.includes(v));
  
  if (alreadySelected.length === visibleValues.length) {
    // Desmarcar todos os visíveis
    selectedInSelectedValues.value = selectedInSelectedValues.value.filter(v => !visibleValues.includes(v));
  } else {
    // Marcar todos os visíveis
    const s = new Set([...selectedInSelectedValues.value, ...visibleValues]);
    selectedInSelectedValues.value = Array.from(s);
  }
}

function isAvailableSelected(item) {
  const value = getItemValue(item);
  return selectedAvailableValues.value.includes(value);
}

function isSelectedSelected(item) {
  const value = getItemValue(item);
  return selectedInSelectedValues.value.includes(value);
}

function toggleAvailableSelection(item) {
  const value = getItemValue(item);
  const index = selectedAvailableValues.value.indexOf(value);
  if (index > -1) {
    selectedAvailableValues.value.splice(index, 1);
  } else {
    selectedAvailableValues.value.push(value);
  }
}

function toggleSelectedSelection(item) {
  const value = getItemValue(item);
  const index = selectedInSelectedValues.value.indexOf(value);
  if (index > -1) {
    selectedInSelectedValues.value.splice(index, 1);
  } else {
    selectedInSelectedValues.value.push(value);
  }
}

function moveToSelected() {
  if (selectedAvailableValues.value.length === 0) return;
  
  // Encontrar os itens completos baseado nos valores selecionados
  const itemsToAdd = props.availableItems.filter(item => {
    const value = getItemValue(item);
    return selectedAvailableValues.value.includes(value);
  });
  
  // Adicionar à lista selecionada
  const newSelected = [...selectedItemsInternal.value, ...itemsToAdd];
  
  // Remover duplicatas baseado no valor
  const uniqueSelected = newSelected.filter((item, index, self) => {
    const value = getItemValue(item);
    return index === self.findIndex(i => getItemValue(i) === value);
  });
  
  selectedItemsInternal.value = uniqueSelected;
  selectedAvailableValues.value = [];
  
  emit('update:selectedItems', uniqueSelected);
}

function moveToAvailable() {
  if (selectedInSelectedValues.value.length === 0) return;
  
  // Remover itens selecionados da lista direita
  const newSelected = selectedItemsInternal.value.filter(item => {
    const value = getItemValue(item);
    return !selectedInSelectedValues.value.includes(value);
  });
  
  selectedItemsInternal.value = newSelected;
  selectedInSelectedValues.value = [];
  
  emit('update:selectedItems', newSelected);
}
</script>

<style scoped>
.col {
  min-width: 200px;
}

.transfer-list-container {
  height: 300px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.transfer-list-container .q-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>

