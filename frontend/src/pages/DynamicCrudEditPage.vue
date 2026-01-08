<template>
  <CrudEdit v-if="crudConfig" :config="crudConfig" />
  <q-page v-else class="flex flex-center">
    <q-spinner color="primary" size="3em" />
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../boot/axios';
import CrudEdit from '../components/CrudEdit.vue';

const route = useRoute();
const crudConfig = ref(null);

async function loadCrudConfig(crudName) {
  const id = route.params.id;
  
  try {
    const response = await api.get(`/api/cruds/name/${crudName}`);
    
    if (response.data && response.data.config) {
      const config = { ...response.data.config };
      
      // Adicionar listRoute baseado no nome do CRUD
      config.listRoute = `/crud/${crudName}`;
      
      // Converter createRoute de string para função se necessário
      if (config.createRoute && typeof config.createRoute === 'string') {
        const routePath = config.createRoute;
        config.createRoute = () => routePath;
      }
      
      // Converter editRoute de string para função se necessário
      if (config.editRoute && typeof config.editRoute === 'string') {
        const routePath = config.editRoute;
        config.editRoute = (row) => {
          const rowId = row[config.rowKey || 'id'];
          return routePath.replace(':id', rowId).replace('${id}', rowId);
        };
      }
      
      // Garantir que relations seja array
      if (config.relations && !Array.isArray(config.relations)) {
        config.relations = [config.relations];
      }
      
      crudConfig.value = config;
    }
  } catch (error) {
    console.error('Erro ao carregar CRUD dinâmico:', error);
    crudConfig.value = null;
  }
}

onMounted(() => {
  loadCrudConfig(route.params.name);
});

// Observar mudanças nos parâmetros da rota
watch(() => [route.params.name, route.params.id], ([newName, newId], [oldName, oldId]) => {
  if (newName && (newName !== oldName || newId !== oldId)) {
    crudConfig.value = null; // Limpar config anterior
    loadCrudConfig(newName);
  }
}, { immediate: false });
</script>

