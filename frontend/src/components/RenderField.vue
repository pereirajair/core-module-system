<template>
  <div>
    <!-- File upload com preview -->
    <div v-if="field.type === 'file'">
      <div class="text-subtitle2 q-mb-sm">{{ field.label }}</div>
      <q-file
        :model-value="fileRefs[field.name]"
        :label="field.fileLabel || `Selecionar ${field.label} (${field.accept || 'arquivo'})`"
        :accept="field.accept || '*'"
        outlined
        @update:model-value="updateFileRef"
      >
        <template v-slot:prepend>
          <q-icon name="image" />
        </template>
      </q-file>
      <div v-if="formData[field.name]" class="q-mt-sm">
        <img 
          v-if="field.previewType === 'image'"
          :src="formData[field.name]" 
          :alt="field.label" 
          :style="field.previewStyle || 'max-width: 200px; max-height: 100px; object-fit: contain;'" 
        />
      </div>
    </div>
    
    <!-- TransferList para relações belongsToMany -->
    <TransferList
      v-else-if="field.type === 'transfer'"
      :available-items="getOptions(field)"
      :selected-items="formData[field.name] || []"
      :item-label="field.itemLabel || 'name'"
      :item-value="field.itemValue || 'id'"
      :available-label="field.availableLabel || 'Disponíveis'"
      :selected-label="field.selectedLabel || 'Selecionados'"
      :loading="loadingMap[field.name] || false"
      @update:selected-items="updateValue"
    />
    
    <!-- RelationMultiSelect -->
    <RelationMultiSelect
      v-else-if="field.type === 'multiselect'"
      :relation="field"
      :available-items="getOptions(field)"
      :selected-items="formData[field.name] || []"
      :loading="loadingMap[field.name] || false"
      @update:selected-items="updateValue"
    />
    
    <!-- RelationInlineForm -->
    <RelationInlineForm
      v-else-if="field.type === 'inline'"
      :relation="field"
      :model-value="formData[field.name] || []"
      :select-options="selectOptions"
      :options-map="optionsMap"
      :loading-map="loadingMap"
      @update:model-value="updateValue"
    />

    <!-- SubCrudTable -->
    <SubCrudTable
      v-else-if="field.type === 'sub-crud'"
      :relation="field"
      :model-value="formData[field.name] || []"
      :select-options="selectOptions"
      :options-map="optionsMap"
      :loading-map="loadingMap"
      @update:model-value="updateValue"
    />

    <!-- Campo customizado (component) -->
    <component
      v-else-if="field.type === 'component'"
      :is="field.component"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      v-bind="field.props || {}"
      :rules="field.rules || []"
    />
    
    <!-- Campo text -->
    <q-input
      v-else-if="field.type === 'text'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      :label="field.label"
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo email -->
    <q-input
      v-else-if="field.type === 'email'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      type="email"
      :label="field.label"
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo password -->
    <q-input
      v-else-if="field.type === 'password'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      type="password"
      :label="field.label"
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo number -->
    <q-input
      v-else-if="field.type === 'number'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      type="number"
      :label="field.label"
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo textarea -->
    <q-input
      v-else-if="field.type === 'textarea'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      type="textarea"
      :label="field.label"
      :rows="field.rows || 3"
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo select -->
    <q-select
      v-else-if="field.type === 'select'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      :label="field.label"
      :options="getOptions(field)"
      :option-label="field.optionLabel || field.itemLabel || 'label'"
      :option-value="field.optionValue || field.itemValue || 'value'"
      :loading="(field.optionsEndpoint || field.loading) && !getOptions(field).length"
      :clearable="field.clearable !== false"
      emit-value
      map-options
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo icon -->
    <IconPicker
      v-else-if="field.type === 'icon'"
      :model-value="formData[field.name]"
      :label="field.label"
      :rules="field.rules || []"
      @update:model-value="updateValue"
    />

    <!-- Campo color -->
    <q-input
      v-else-if="field.type === 'color'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      type="color"
      :label="field.label"
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo date -->
    <q-input
      v-else-if="field.type === 'date'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      type="date"
      :label="field.label"
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo boolean -->
    <q-toggle
      v-else-if="field.type === 'boolean'"
      :model-value="formData[field.name] || false"
      @update:model-value="updateValue"
      :label="field.label"
      :disable="field.disable || false"
      :dense="field.dense !== false"
    />
    
    <!-- Campo padrão (text) -->
    <q-input
      v-else
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      :label="field.label"
      outlined
      :rules="field.rules || []"
    />
  </div>
</template>

<script setup>
import TransferList from './TransferList.vue';
import RelationMultiSelect from './RelationMultiSelect.vue';
import RelationInlineForm from './RelationInlineForm.vue';
import SubCrudTable from './SubCrudTable.vue';
import IconPicker from './IconPicker.vue';

const props = defineProps({
  field: {
    type: Object,
    required: true
  },
  formData: {
    type: Object,
    required: true
  },
  fileRefs: {
    type: Object,
    default: () => ({})
  },
  selectOptions: {
    type: Object,
    default: () => ({})
  },
  // Mapa genérico de opções/itens disponíveis para selects e relações
  optionsMap: {
    type: Object,
    default: () => ({}) 
  },
  // Mapa de loading states
  loadingMap: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['file-upload', 'update:modelValue']);

// Helper para obter opções de select ou relations
function getOptions(field) {
  if (field.options) return field.options;
  // Tentar optionsMap (novo padrão) ou selectOptions (padrão antigo)
  return props.optionsMap[field.name] || props.selectOptions[field.name] || [];
}

function updateValue(value) {
  // Não mutar props diretamente - emitir evento para o pai atualizar
  emit('update:modelValue', { field: props.field.name, value });
}

function updateFileRef(file) {
  emit('file-upload', props.field, file);
}
</script>

