<template>
  <div class="relation-multi-select">
    <q-select
      v-model="selectedValues"
      :options="availableOptions"
      :label="relation.label || 'Selecionar'"
      :option-label="relation.itemLabel || 'name'"
      :option-value="relation.itemValue || 'id'"
      :loading="loading"
      multiple
      emit-value
      map-options
      outlined
      dense
      use-chips
      :hint="relation.hint || 'Selecione múltiplos itens'"
      @update:model-value="onSelectionChange"
    >
      <template v-slot:option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section>
            <q-item-label>{{ getItemLabel(scope.opt) }}</q-item-label>
            <q-item-label v-if="relation.itemCaption" caption>
              {{ getItemCaption(scope.opt) }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-select>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  relation: {
    type: Object,
    required: true
  },
  availableItems: {
    type: Array,
    default: () => []
  },
  selectedItems: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:selectedItems']);

const selectedValues = ref([]);

// Converter selectedItems para array de valores
const selectedValuesComputed = computed(() => {
  return props.selectedItems.map(item => {
    if (typeof item === 'object') {
      return item[props.relation.itemValue || 'id'];
    }
    return item;
  });
});

watch(() => selectedValuesComputed.value, (newVal) => {
  selectedValues.value = [...newVal];
}, { immediate: true });

const availableOptions = computed(() => {
  return props.availableItems || [];
});

function getItemLabel(item) {
  const labelField = props.relation.itemLabel || 'name';
  if (typeof labelField === 'function') {
    return labelField(item);
  }
  return item[labelField] || '';
}

function getItemCaption(item) {
  if (!props.relation.itemCaption) return '';
  const captionField = props.relation.itemCaption;
  if (typeof captionField === 'function') {
    return captionField(item);
  }
  return item[captionField] || '';
}

function onSelectionChange(values) {
  selectedValues.value = values;
  // Converter valores de volta para objetos completos
  const selectedObjects = values.map(value => {
    return props.availableItems.find(item => {
      const itemValue = typeof props.relation.itemValue === 'function'
        ? props.relation.itemValue(item)
        : item[props.relation.itemValue || 'id'];
      return itemValue === value;
    }) || value;
  });
  emit('update:selectedItems', selectedObjects);
}
</script>

<style scoped>
.relation-multi-select {
  width: 100%;
}
</style>

