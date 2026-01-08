<template>
  <CrudViewer v-if="crudConfig" :config="crudConfig">
    <!-- Slot customizado para coluna system em roles -->
    <template v-slot:body-cell-system="props">
      <q-td :props="props">
        <template v-if="crudConfig?.resource === 'permissions'">
          {{ props.row.System?.name || '-' }}
        </template>
      </q-td>
    </template>
    
    <!-- Slot customizado para coluna permissions (Roles) em users -->
    <template v-slot:body-cell-permissions="props">
      <q-td :props="props">
        <template v-if="crudConfig?.resource === 'users'">
          <div class="q-gutter-xs">
            <q-chip
              v-for="role in (props.row.Roles || [])"
              :key="role.id"
              size="sm"
              color="primary"
              text-color="white"
            >
              {{ role.name }}
            </q-chip>
            <span v-if="!props.row.Roles || props.row.Roles.length === 0">-</span>
          </div>
        </template>
      </q-td>
    </template>
    
    <!-- Slot customizado para coluna organizations em users -->
    <template v-slot:body-cell-organizations="props">
      <q-td :props="props">
        <template v-if="crudConfig?.resource === 'users'">
          <div class="q-gutter-xs">
            <q-chip
              v-for="org in (props.row.Organizations || [])"
              :key="org.id"
              size="sm"
              color="secondary"
              text-color="white"
            >
              {{ org.name }}
            </q-chip>
            <span v-if="!props.row.Organizations || props.row.Organizations.length === 0">-</span>
          </div>
        </template>
      </q-td>
    </template>
    
    <!-- Slot customizado para coluna users em organizations -->
    <template v-slot:body-cell-users="props">
      <q-td :props="props">
        <template v-if="crudConfig?.resource === 'organizations'">
          <div class="q-gutter-xs">
            <q-chip
              v-for="user in (props.row.Users || [])"
              :key="user.id"
              size="sm"
              color="info"
              text-color="white"
            >
              {{ user.name }}
            </q-chip>
            <span v-if="!props.row.Users || props.row.Users.length === 0">-</span>
          </div>
        </template>
      </q-td>
    </template>
    
  </CrudViewer>
  <q-page v-else class="flex flex-center">
    <q-spinner color="primary" size="3em" />
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../boot/axios';
import CrudViewer from '../components/CrudViewer.vue';

const route = useRoute();
const crudConfig = ref(null);

async function loadCrudConfig(crudName) {
  try {
    const response = await api.get(`/api/cruds/name/${crudName}`);
    
    if (response.data && response.data.config) {
      // Converter funções string para funções reais
      const config = { ...response.data.config };
      
      // Converter createRoute de string para função se necessário
      if (config.createRoute && typeof config.createRoute === 'string') {
        const routePath = config.createRoute;
        config.createRoute = () => routePath;
      }
      
      // Converter editRoute de string para função se necessário
      if (config.editRoute && typeof config.editRoute === 'string') {
        const routePath = config.editRoute;
        config.editRoute = (row) => {
          const id = row[config.rowKey || 'id'];
          return routePath.replace(':id', id).replace('${id}', id);
        };
      }
      
      // Converter deleteMessage de string para função se necessário
      if (config.deleteMessage && typeof config.deleteMessage === 'string') {
        const messageTemplate = config.deleteMessage;
        config.deleteMessage = (row) => {
          let message = messageTemplate;
          // Substituir variáveis comuns
          message = message.replace(/\$\{row\.name\}/g, row.name || 'este item');
          message = message.replace(/\$\{row\.title\}/g, row.title || 'este item');
          message = message.replace(/\$\{row\.id\}/g, row.id || '');
          return message;
        };
      }
      
      // Garantir que relations seja array
      if (config.relations && !Array.isArray(config.relations)) {
        config.relations = [config.relations];
      }
      
      // Converter campos de coluna que são paths aninhados ou arrays para funções
      if (config.columns) {
        config.columns = config.columns.map(col => {
          if (typeof col.field === 'string' && col.field.includes('.')) {
            // Converter path aninhado (ex: 'System.name') para função
            const parts = col.field.split('.');
            col.field = (row) => {
              let value = row;
              for (const part of parts) {
                if (value === undefined || value === null) return '-';
                value = value[part];
              }
              return value !== undefined && value !== null ? value : '-';
            };
          } else if (col.format === 'array' && typeof col.field === 'string') {
            // Converter array de objetos relacionados para string formatada
            const fieldName = col.field;
            col.field = (row) => {
              const array = row[fieldName];
              if (!array || !Array.isArray(array) || array.length === 0) {
                return '-';
              }
              // Retornar array para que o slot customizado possa processar
              return array;
            };
          }
          return col;
        });
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

// Observar mudanças no parâmetro name da rota
watch(() => route.params.name, (newName, oldName) => {
  if (newName && newName !== oldName) {
    crudConfig.value = null; // Limpar config anterior
    loadCrudConfig(newName);
  }
});
</script>
