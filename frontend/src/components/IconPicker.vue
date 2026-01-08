<template>
  <div>
    <q-input
      :model-value="modelValue"
      :label="label"
      outlined
      dense
      :rules="rules"
      :hint="hint"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <template v-slot:prepend>
        <q-icon :name="modelValue || 'help'" />
      </template>
      <template v-slot:append>
        <q-btn
          flat
          dense
          round
          icon="search"
          @click="showDialog = true"
        >
          <q-tooltip>Selecionar ícone</q-tooltip>
        </q-btn>
      </template>
    </q-input>

    <!-- Dialog de Seleção de Ícones -->
    <q-dialog v-model="showDialog" maximized>
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Selecionar Ícone</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="iconSearch"
            placeholder="Buscar ícone..."
            dense
            outlined
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
          <div class="icon-grid">
            <div
              v-for="icon in filteredIcons"
              :key="icon"
              class="icon-item"
              :class="{ 'icon-selected': modelValue === icon }"
              @click="selectIcon(icon)"
            >
              <q-icon :name="icon" size="md" />
              <div class="text-caption">{{ icon }}</div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Ícone'
  },
  rules: {
    type: Array,
    default: () => []
  },
  hint: {
    type: String,
    default: 'Digite ou selecione um ícone'
  }
});

const emit = defineEmits(['update:modelValue']);

const showDialog = ref(false);
const iconSearch = ref('');

// Lista de ícones Material Icons comuns
const commonIcons = [
  'home', 'settings', 'people', 'person', 'group', 'business', 'store', 'shopping_cart',
  'dashboard', 'menu', 'list', 'view_list', 'view_module', 'grid_view', 'table_view',
  'edit', 'create', 'add', 'delete', 'remove', 'save', 'cancel', 'check', 'close',
  'search', 'filter', 'sort', 'arrow_back', 'arrow_forward', 'arrow_up', 'arrow_down',
  'lock', 'lock_open', 'security', 'admin_panel_settings', 'verified_user', 'account_circle',
  'email', 'phone', 'location_on', 'calendar_today', 'schedule', 'notifications',
  'folder', 'file', 'image', 'video', 'audio', 'description', 'attach_file',
  'link', 'share', 'download', 'upload', 'cloud', 'cloud_upload', 'cloud_download',
  'favorite', 'star', 'thumb_up', 'thumb_down', 'comment', 'chat', 'message',
  'info', 'help', 'warning', 'error', 'check_circle', 'info_outline',
  'refresh', 'sync', 'autorenew', 'update', 'cached', 'restart_alt',
  'visibility', 'visibility_off', 'vpn_key', 'key',
  'apps', 'widgets', 'extension', 'build', 'construction', 'engineering',
  'computer', 'laptop', 'phone_android', 'tablet', 'devices',
  'code', 'terminal', 'bug_report', 'functions',
  'calculate', 'analytics', 'insights', 'assessment', 'data_usage', 'storage',
  'trending_up', 'trending_down', 'show_chart', 'bar_chart', 'pie_chart',
  'bookmark', 'label', 'tag', 'category',
  'archive', 'inbox', 'send', 'mail',
  'print', 'picture_as_pdf', 'article',
  'language', 'translate', 'public', 'globe',
  'history', 'event', 'today', 'date_range', 'access_time',
  'school', 'work', 'sports', 'fitness_center',
  'restaurant', 'local_dining', 'hotel', 'flight',
  'directions_car', 'train', 'bus', 'bike',
  'shopping_bag', 'receipt', 'payment', 'credit_card', 'account_balance'
];

const filteredIcons = computed(() => {
  if (!iconSearch.value) return commonIcons;
  const search = iconSearch.value.toLowerCase();
  return commonIcons.filter(icon => icon.toLowerCase().includes(search));
});

function selectIcon(icon) {
  emit('update:modelValue', icon);
  showDialog.value = false;
}
</script>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-item:hover {
  background: rgba(25, 118, 210, 0.1);
  border-color: rgba(25, 118, 210, 0.3);
}

.icon-selected {
  background: rgba(25, 118, 210, 0.2);
  border-color: #1976d2;
}
</style>

