<template>
  <div class="relation-inline-form">
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
        @click="addItem"
      />
    </div>

    <div v-if="items.length === 0" class="text-center q-pa-md text-grey">
      Nenhum item adicionado. Clique em "{{ relation.addLabel || 'Adicionar' }}" para começar.
    </div>

    <q-card
      v-for="(item, index) in items"
      :key="index"
      class="q-mb-md"
      flat
      bordered
    >
      <q-card-section class="q-pa-sm">
        <div class="row items-center q-mb-sm">
          <div class="text-subtitle2">{{ relation.itemLabel || `Item ${index + 1}` }}</div>
          <q-space />
          <q-btn
            flat
            round
            dense
            color="negative"
            icon="delete"
            size="sm"
            @click="removeItem(index)"
          />
        </div>

        <!-- Renderizar campos do formulário relacionado -->
        <div class="row q-gutter-sm">
          <div
            v-for="field in relation.fields"
            :key="field.name"
            :class="field.colClass || 'col'"
          >
            <RenderField
              :field="field"
              :form-data="item"
              :file-refs="fileRefs[index] || {}"
              :select-options="selectOptions"
              :options-map="optionsMap"
              :loading-map="loadingMap"
              @file-upload="(payload) => handleFileUpload(index, payload)"
              @update:model-value="(payload) => updateItemField(index, payload.field, payload.value)"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import RenderField from './RenderField.vue';

const props = defineProps({
  relation: {
    type: Object,
    required: true
  },
  modelValue: {
    type: Array,
    default: () => []
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

const items = ref([...props.modelValue]);
const fileRefs = ref({});

// Observar mudanças externas
watch(() => props.modelValue, (newVal) => {
  items.value = [...newVal];
  // Inicializar fileRefs para novos itens
  newVal.forEach((_, index) => {
    if (!fileRefs.value[index]) {
      fileRefs.value[index] = {};
    }
  });
}, { deep: true });

function addItem() {
  // Criar item vazio com campos padrão
  const newItem = {};
  if (props.relation.fields) {
    props.relation.fields.forEach(field => {
      newItem[field.name] = field.default !== undefined ? field.default : '';
    });
  }
  items.value.push(newItem);
  fileRefs.value[items.value.length - 1] = {};
  emit('update:modelValue', items.value);
}

function removeItem(index) {
  items.value.splice(index, 1);
  delete fileRefs.value[index];
  // Reindexar fileRefs
  const newFileRefs = {};
  items.value.forEach((_, i) => {
    if (fileRefs.value[i]) {
      newFileRefs[i] = fileRefs.value[i];
    }
  });
  fileRefs.value = newFileRefs;
  emit('update:modelValue', items.value);
}

function updateItemField(index, fieldName, value) {
  if (items.value[index]) {
    items.value[index][fieldName] = value;
    emit('update:modelValue', items.value);
  }
}

function handleFileUpload(index, payload) {
  const { field, file } = payload;
  if (file && field.type === 'file') {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (items.value[index]) {
        items.value[index][field.name] = e.target.result;
        emit('update:modelValue', items.value);
      }
    };
    reader.readAsDataURL(file);
  }
}
</script>

<style scoped>
.relation-inline-form {
  width: 100%;
}
</style>

