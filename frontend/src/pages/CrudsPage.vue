<template>
  <CrudViewer :config="crudConfig">
    <template v-slot:body-cell-icon_title="props">
      <q-td :props="props">
        <div class="row items-center q-gutter-sm">
          <q-icon :name="props.row.icon || 'settings'" size="md" color="primary" />
          <span>{{ props.row.title }}</span>
        </div>
      </q-td>
    </template>
    <template v-slot:body-cell-isSystem="props">
      <q-td :props="props">
        <q-chip
          v-if="props.row.isSystem"
          color="orange"
          text-color="white"
          icon="lock"
          size="sm"
        >
          {{ props.row.isSystemDisplay || 'Sistema' }}
        </q-chip>
        <!-- <q-chip
          v-else
          color="blue"
          text-color="white"
          icon="edit"
          size="sm"
        ></q-chip> -->
      </q-td>
    </template>
  </CrudViewer>
</template>

<script setup>
import CrudViewer from '../components/CrudViewer.vue';

const crudConfig = {
  title: 'Interfaces',
  icon: 'view_module',
  resource: 'cruds',
  endpoint: '/api/cruds',
  rowKey: 'id',
  createRoute: () => '/admin/cruds/new',
  editRoute: (row) => `/admin/cruds/${row.id}`,
  deleteMessage: (row) => `Deseja realmente excluir a Interface "${row.title}"?`,
  deleteSuccessMessage: 'Interface excluída com sucesso!',
  columns: [
    {
      name: 'icon_title',
      required: true,
      label: 'Interface',
      align: 'left',
      field: 'icon_title',
      sortable: true
    },
    {
      name: 'name',
      required: true,
      label: 'Nome',
      align: 'left',
      field: 'name',
      sortable: true
    },
    {
      name: 'resource',
      label: 'Recurso',
      align: 'left',
      field: 'resource',
      sortable: true
    },
    {
      name: 'endpoint',
      label: 'Endpoint',
      align: 'left',
      field: 'endpoint',
      sortable: true
    },
    {
      name: 'active',
      label: 'Ativo',
      align: 'center',
      field: 'active',
      sortable: true
    },
    {
      name: 'isSystem',
      label: 'Tipo',
      align: 'center',
      field: 'isSystem',
      sortable: true
    }
  ],
  transform: (data) => {
    return data.map(item => {
      // Converter isSystem para boolean para garantir verificação correta
      const isSystemBool = Boolean(item.isSystem === true || item.isSystem === 1);
      return {
        ...item,
        active: item.active ? 'Sim' : 'Não',
        isSystemDisplay: isSystemBool ? 'Sistema' : 'Personalizada', // Para exibição
        isSystem: isSystemBool // Manter o valor boolean original para verificações
      };
    });
  },
  canEdit: (row) => {
    // Se não for sistema, sempre pode editar
    if (!row.isSystem) return true;
    
    // Se for sistema, verificar DEV_MODE
    // No Quasar/Vite, variáveis de ambiente devem começar com VITE_ para serem expostas ao frontend
    const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true' || import.meta.env.DEV_MODE === 'true';
    // Nota: canEdit é chamado antes do componente estar montado, então não podemos usar authStore aqui
    // A verificação final de admin será feita no CrudEditPage
    return DEV_MODE; // Permitir editar se DEV_MODE estiver ativo (verificação de admin será no CrudEditPage)
  },
  canDelete: (row) => !row.isSystem
};
</script>

