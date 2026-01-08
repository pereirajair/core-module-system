<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated :style="headerStyle" :class="['main-header', { 'drawer-open': leftDrawerOpen && $q.screen.gt.sm }]">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          <div class="row items-center q-gutter-sm">
            <img 
              v-if="authStore.system?.logo" 
              :src="authStore.system.logo" 
              alt="Logo" 
              style="max-height: 32px; max-width: 120px; object-fit: contain;"
            />
            
            <!-- System Selector -->
            <q-select
              v-if="authStore.userSystems.length > 1"
              v-model="selectedSystem"
              :options="authStore.userSystems"
              option-label="name"
              dense
              borderless
              options-dense
              class="q-ml-sm"
              style="min-width: 150px"
              @update:model-value="onSystemChange"
            >
              <template v-slot:selected>
                <div class="text-white">{{ authStore.system?.name || 'Selecione o Sistema' }}</div>
              </template>
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.name }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <span v-else>{{ authStore.system?.name || 'Atende App' }}</span>
          </div>
        </q-toolbar-title>

        <!-- Organization Selector -->
        <div class="row items-center q-mr-md">
           <!-- Multiple Organizations: Show Dropdown -->
           <q-select
              v-if="authStore.userOrganizations.length > 1"
              v-model="selectedOrganization"
              :options="authStore.userOrganizations"
              option-label="name"
              label="Organização"
              dense
              filled
              bg-color="white"
              color="primary"
              options-dense
              style="min-width: 150px"
              @update:model-value="onOrganizationChange"
            />
            
            <!-- Single Organization: Show Text -->
            <div v-else-if="authStore.userOrganizations.length === 1" class="text-subtitle2 q-px-sm">
                {{ authStore.userOrganizations[0].name }}
            </div>
        </div>

        <div class="row items-center q-gutter-sm q-mr-sm">
          <q-chip 
            :color="authStore.system?.primaryColor || 'primary'"
            :text-color="authStore.system?.textColor || 'white'"
            size="sm"
          >
            <q-avatar :color="authStore.system?.secondaryColor || 'secondary'" :text-color="authStore.system?.textColor || 'white'" size="sm">
              {{ userInitials }}
            </q-avatar>
            {{ currentUserName }}
          </q-chip>

          <div v-if="authStore.isImpersonating" class="q-mr-sm">
            <q-chip 
              color="warning" 
              text-color="white" 
              size="sm"
              clickable
              @click="stopImpersonating"
            >
              <q-avatar icon="person" color="white" text-color="primary" size="sm" />
              Impersonando
              <q-tooltip>Clique para parar de impersonar</q-tooltip>
            </q-chip>
          </div>
        </div>

        <q-btn
          v-if="authStore.hasFunction('adm.impersonate_user')"
          flat
          dense
          round
          icon="switch_account"
          aria-label="Impersonar Usuário"
          @click="openImpersonateDialog"
        >
          <q-tooltip>Impersonar Usuário</q-tooltip>
        </q-btn>

        <q-btn
          flat
          dense
          round
          icon="logout"
          aria-label="Logout"
          @click="onLogout"
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      bordered
      :breakpoint="1024"
      :width="280"
      :overlay="$q.screen.lt.md"
      :behavior="$q.screen.lt.md ? 'mobile' : 'desktop'"
    >
      <q-list class="q-pt-sm">
        <!-- Menus dinâmicos do banco de dados -->
        <template v-for="menu in dynamicMenus" :key="menu.id">
          <q-item-label v-if="menu.name" header class="text-caption text-weight-bold q-py-xs">{{ menu.name }}</q-item-label>
          <q-item
            v-for="item in menu.items"
            :key="item.id"
            clickable
            v-ripple
            dense
            :to="item.route"
            :target="item.target_blank ? '_blank' : undefined"
            class="q-my-none"
            style="min-height: 32px;"
          >
            <q-item-section avatar style="min-width: 32px; padding-right: 8px;">
              <q-icon :name="item.icon || 'circle'" size="xs" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-body2" style="font-size: 0.85rem;">{{ item.name }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-separator v-if="menu.id !== dynamicMenus[dynamicMenus.length - 1]?.id" class="q-my-sm" />
        </template>

        <!-- Menus estáticos (canais) -->
        <!-- <q-item-label v-if="authStore.hasFunction('chan.visualizar_canais')" header class="text-caption text-weight-bold q-py-xs">Meus Canais</q-item-label> -->
        <!-- <div v-if="authStore.hasFunction('chan.visualizar_canais')">
        <q-item
          v-for="channel in channels"
          :key="channel.id"
          clickable
          v-ripple
          dense
          :to="`/channels/${channel.id}`"
          class="q-my-none"
          style="min-height: 32px;"
        >
          <q-item-section avatar style="min-width: 32px; padding-right: 8px;">
            <q-icon name="chat_bubble" size="xs" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-body2" style="font-size: 0.85rem;">{{ channel.name }}</q-item-label>
          </q-item-section>
        </q-item>
        </div> -->

      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Chat IA Component -->
    <ChatIA v-if="authStore.hasFunction('chatia.usar_chat')" />

    <!-- Dialog de Impersonação -->
    <q-dialog v-model="impersonateDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Impersonar Usuário</div>
        </q-card-section>

        <q-card-section>
          <q-select
            v-model="selectedUserId"
            :options="users"
            option-label="name"
            option-value="id"
            label="Selecione um usuário"
            :loading="loadingUsers"
            emit-value
            map-options
            clearable
          >
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <q-icon name="person" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ scope.opt.name }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.email }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
          <q-btn flat label="Impersonar" color="primary" @click="confirmImpersonate" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '../stores/auth'; // Import the auth store
import { api } from '../boot/axios'; // Import api
import ChatIA from '../components/ChatIA.vue';

const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore(); // Use the auth store

const channels = ref([]);
const leftDrawerOpen = ref(false);
const users = ref([]);
const impersonateDialog = ref(false);
const selectedUserId = ref(null);
const loadingUsers = ref(false);
const dynamicMenus = ref([]);

// Local state for selectors (synced with store)
const selectedSystem = ref(null);
const selectedOrganization = ref(null);

const currentUserName = computed(() => {
  return authStore.user?.name || authStore.user?.email || 'Usuário';
});

const userInitials = computed(() => {
  const name = authStore.user?.name || '';
  if (!name) return 'U';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
});

const headerStyle = computed(() => {
  const style = {};
  if (authStore.system?.primaryColor) {
    style.backgroundColor = authStore.system.primaryColor;
  }
  // Ajustar left baseado no estado do drawer em desktop
  if (leftDrawerOpen.value && $q.screen.gt.sm) {
    style.left = '280px';
  } else {
    style.left = '0px';
  }
  return style;
});

const hasAdminItems = computed(() => {
  return authStore.hasFunction('user.visualizar_usuarios') ||
         authStore.hasFunction('role.visualizar_roles') ||
         authStore.hasFunction('org.visualizar_organizacoes') ||
         authStore.hasFunction('sys.visualizar_sistemas') ||
         authStore.hasFunction('func.visualizar_funcoes');
});

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function onLogout () {
  try {
    await authStore.logout();
    $q.notify({
      color: 'positive',
      message: 'Logged out successfully!',
      icon: 'check'
    });
    router.push('/login');
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.message || 'An error occurred during logout',
      icon: 'warning'
    });
  }
}


async function fetchUsers() {
  loadingUsers.value = true;
  try {
    const response = await api.get('/api/users');
    users.value = response.data;
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao carregar usuários',
      icon: 'warning'
    });
  } finally {
    loadingUsers.value = false;
  }
}

function openImpersonateDialog() {
  impersonateDialog.value = true;
  if (users.value.length === 0) {
    fetchUsers();
  }
}

async function confirmImpersonate() {
  if (!selectedUserId.value) {
    $q.notify({
      color: 'warning',
      message: 'Selecione um usuário',
      icon: 'warning'
    });
    return;
  }

  try {
    const result = await authStore.impersonate(selectedUserId.value);
    impersonateDialog.value = false;
    $q.notify({
      color: 'positive',
      message: `Agora você está impersonando ${result.user.name}`,
      icon: 'check'
    });

  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao impersonar usuário',
      icon: 'warning'
    });
  }
}

function stopImpersonating() {
  $q.dialog({
    title: 'Parar Impersonação',
    message: 'Deseja parar de impersonar e voltar ao seu usuário original?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      // Voltar ao usuário original sem deslogar
      authStore.stopImpersonating();
      $q.notify({
        color: 'positive',
        message: 'Voltou ao seu usuário original',
        icon: 'check'
      });
    } catch (error) {
      $q.notify({
        color: 'negative',
        message: error.message || 'Erro ao parar impersonação',
        icon: 'warning'
      });
    }
  });
}

async function fetchMenus() {
  try {
    const params = {
      systemId: authStore.system?.id,
      id_organization: authStore.currentOrganization?.id
    };
    const response = await api.get('/api/menus/user', { params });
    dynamicMenus.value = response.data || [];
  } catch (error) {
    console.error('Erro ao carregar menus:', error);
    // Não mostrar erro ao usuário, apenas logar
  }
}

async function onSystemChange(newSystem) {
  if (newSystem) {
    authStore.setSystem(newSystem);
    // Não recarregar a página imediatamente, apenas navegar para a primeira rota
    // O fetchUserContext já vai lidar com a organização se necessário
    await reloadToFirstMenu();
  }
}

async function onOrganizationChange(newOrg) {
  if (newOrg) {
    await authStore.setOrganization(newOrg);
    // Recarregar a página atual após atualizar o token
    window.location.reload();
  }
}

async function reloadToFirstMenu() {
  try {
    // 1. Fetch menus for the new context
    const params = {
      systemId: authStore.system?.id,
      id_organization: authStore.currentOrganization?.id
    };
    const response = await api.get('/api/menus/user', { params });
    const menus = response.data || [];
    
    // 2. Find the first available route
    let firstRoute = '/';
    if (menus.length > 0 && menus[0].items.length > 0) {
      firstRoute = menus[0].items[0].route;
    }
    
    // 3. Force reload to that route
    window.location.href = `/#${firstRoute}`;
    window.location.reload();
    
  } catch (error) {
    console.error('Error reloading context:', error);
    window.location.reload(); // Fallback
  }
}

// Watchers to keep local state in sync with store (e.g. after login/refresh)
watch(() => authStore.system, (newSys) => {
  selectedSystem.value = newSys;
});

watch(() => authStore.currentOrganization, (newOrg) => {
  selectedOrganization.value = newOrg;
});

// Recarregar menus quando o usuário mudar (ex: impersonação)
watch(() => authStore.user?.id, () => {
  if (authStore.isAuthenticated) {
    fetchMenus();
  }
});

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await authStore.fetchUserContext();
    selectedSystem.value = authStore.system;
    selectedOrganization.value = authStore.currentOrganization;
    fetchMenus();
  }
});

</script>

<style>
/* Garantir que o padding-left seja exatamente 280px quando o drawer estiver aberto */
/* Resetar o padding padrão do Quasar */
.q-page-container {
  padding-left: 0 !important;
}

/* Quando o drawer está aberto em desktop (behavior="desktop") */
@media (min-width: 1024px) {

  /* Seletor para quando o drawer está aberto e não está em modo overlay */
  .q-drawer--left.q-drawer--on-left:not(.q-drawer--overlay) ~ .q-page-container {
    padding-left: 280px !important;
  }
  
  /* Fallback para outros casos */
  .q-drawer--left.q-drawer--on-left ~ .q-page-container {
    padding-left: 280px !important;
  }
  
  /* Garantir que o header tenha o posicionamento correto quando drawer está aberto */
  .q-header.main-header.drawer-open {
    left: 280px !important;
  }
  
  /* Quando o drawer está fechado, header volta ao normal */
  .q-header.main-header:not(.drawer-open) {
    left: 0 !important;
  }
}

/* Quando o drawer está fechado */
.q-drawer--left:not(.q-drawer--on-left) ~ .q-page-container {
  padding-left: 0 !important;
}

/* Em mobile, quando o drawer usa overlay, não deve ter padding */
@media (max-width: 1023px) {
  .q-drawer--left.q-drawer--overlay ~ .q-page-container {
    padding-left: 0 !important;
  }
  
  /* Em mobile, o header sempre fica em left: 0 quando drawer usa overlay */
  .q-header.main-header {
    left: 0 !important;
  }
}
</style>
