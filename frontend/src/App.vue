<template>
  <div :style="systemStyles">
    <router-view />
  </div>
</template>

<script setup>
import { computed, watch, onMounted } from 'vue';
import { useAuthStore } from './stores/auth';
import { useQuasar } from 'quasar';

const authStore = useAuthStore();
const $q = useQuasar();

const systemStyles = computed(() => {
  if (!authStore.system) {
    return {};
  }
  
  return {
    '--system-primary': authStore.system.primaryColor || '#1976D2',
    '--system-secondary': authStore.system.secondaryColor || '#26A69A',
    '--system-text': authStore.system.textColor || '#FFFFFF',
  };
});

watch(() => authStore.system, (system) => {
  if (system) {
    // Atualizar cores do Quasar dinamicamente
    $q.dark.set(false);
    // As cores serão aplicadas via CSS variables
  }
}, { immediate: true });

onMounted(async () => {
  // Verificar autenticação e carregar dados do usuário ao inicializar
  await authStore.checkAuth();
});
</script>

<style>
:root {
  --system-primary: #1976D2;
  --system-secondary: #26A69A;
  --system-text: #FFFFFF;
}

/* Aplicar cores do sistema quando disponíveis */
.bg-primary {
  background-color: var(--system-primary) !important;
}

.bg-secondary {
  background-color: var(--system-secondary) !important;
}

.text-primary {
  color: var(--system-primary) !important;
}

.text-secondary {
  color: var(--system-secondary) !important;
}
</style>
