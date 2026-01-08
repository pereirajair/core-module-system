<template>
  <q-page class="models-page">
    <PageHeader
      :title="'Database'"
      :icon="'storage'"
      :show-search="false"
    >
      <template v-slot:actions>
        <!-- Ações Secundárias (máximo 2) -->
        <q-btn
          color="primary"
          icon="add"
          label="Nova Model"
          @click="createNewModel"
          class="q-mr-sm"
          unelevated
        />
        
        <!-- Ações Terciárias (menu com ...) -->
        <q-btn
          flat
          round
          dense
          icon="more_vert"
          class="q-mr-sm"
        >
          <q-menu>
            <q-list style="min-width: 200px">
              <q-item-label header>Banco de Dados</q-item-label>
              <q-item clickable v-close-popup @click="runMigrations">
                <q-item-section avatar>
                  <q-icon name="play_arrow" color="warning" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Executar Migrations</q-item-label>
                  <q-item-label caption>Rodar migrations pendentes</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="runSeeders">
                <q-item-section avatar>
                  <q-icon name="play_arrow" color="info" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Executar Seeders</q-item-label>
                  <q-item-label caption>Popular banco de dados</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="confirmRecreateDatabase">
                <q-item-section avatar>
                  <q-icon name="refresh" color="negative" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Recriar Banco</q-item-label>
                  <q-item-label caption>Apagar e recriar do zero</q-item-label>
                </q-item-section>
              </q-item>
              
              <q-separator />
              
              <q-item-label header>Visualização</q-item-label>
              <q-item clickable v-close-popup @click="goToMermaidDiagram">
                <q-item-section avatar>
                  <q-icon name="account_tree" color="secondary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Diagrama ER</q-item-label>
                  <q-item-label caption>Visualizar relacionamentos</q-item-label>
                </q-item-section>
              </q-item>
              
              <q-separator />
              
              <q-item-label header>Módulos</q-item-label>
              <q-item clickable v-close-popup @click="openInstallModuleDialog">
                <q-item-section avatar>
                  <q-icon name="download" color="positive" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Instalar Módulo</q-item-label>
                  <q-item-label caption>Instalar via npm ou Git</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="openCreateModuleDialog">
                <q-item-section avatar>
                  <q-icon name="folder_plus" color="secondary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Novo Módulo</q-item-label>
                  <q-item-label caption>Criar novo módulo</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </template>
    </PageHeader>

    <!-- FAB Button - Ação Principal -->
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn
        fab
        color="primary"
        icon="add"
        @click="createNewModel"
      >
        <q-tooltip>Nova Model</q-tooltip>
      </q-btn>
    </q-page-sticky>

    <q-splitter
      v-model="splitterModel"
      :limits="[20, 80]"
      class="models-splitter"
    >
      <!-- Lado Esquerdo: Menu de Módulos -->
      <template v-slot:before>
        <div class="models-menu">
          <q-input
            v-model="searchQuery"
            placeholder="Buscar módulos ou models..."
            dense
            outlined
            class="q-ma-sm"
            clearable
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>

          <q-scroll-area class="models-menu-scroll">
            <!-- Models do Usuário agrupadas por Módulo -->
            <template v-for="moduleGroup in filteredModelsByModule" :key="moduleGroup.name">
              <q-card flat bordered class="module-card q-ma-sm">
                <q-expansion-item
                  expand-separator
                  :default-opened="false"
                  class="module-expansion"
                >
                  <template v-slot:header>
                    <q-item-section avatar>
                      <q-icon name="folder" size="sm" color="primary" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-body2 text-weight-medium">{{ moduleGroup.title }}</q-item-label>
                      <q-item-label caption class="text-caption">
                        <div class="row items-center q-gutter-xs">
                          <span>{{ moduleGroup.name }}</span>
                          <q-chip 
                            v-if="moduleGroup.version" 
                            color="info" 
                            text-color="white" 
                            dense 
                            size="xs"
                            icon="tag"
                          >
                            v{{ moduleGroup.version }}
                          </q-chip>
                          <q-chip 
                            v-if="moduleGroup.enabled !== undefined" 
                            :color="moduleGroup.enabled ? 'positive' : 'negative'" 
                            text-color="white" 
                            dense 
                            size="xs"
                            :icon="moduleGroup.enabled ? 'check_circle' : 'cancel'"
                          >
                            {{ moduleGroup.enabled ? 'Ativo' : 'Inativo' }}
                          </q-chip>
                        </div>
                        <div v-if="moduleGroup.description" class="text-caption text-grey-7 q-mt-xs">
                          {{ moduleGroup.description }}
                        </div>
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <div class="row items-center q-gutter-xs">
                        <q-btn
                          v-if="!moduleGroup.isSystem"
                          flat
                          round
                          dense
                          size="xs"
                          :icon="moduleGroup.enabled ? 'uninstall' : 'install_mobile'"
                          :color="moduleGroup.enabled ? 'negative' : 'positive'"
                          :loading="installingModules[moduleGroup.name]"
                          @click.stop="moduleGroup.enabled ? uninstallModule(moduleGroup.name) : installModule(moduleGroup.name)"
                        >
                          <q-tooltip>
                            {{ moduleGroup.enabled ? 'Desinstalar Módulo' : 'Instalar Módulo' }}
                          </q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          dense
                          size="xs"
                          icon="account_tree"
                          color="secondary"
                          @click.stop="viewModuleMermaid(moduleGroup.name)"
                        >
                          <q-tooltip>Ver Diagrama ER do Módulo</q-tooltip>
                        </q-btn>
                        <q-chip color="primary" text-color="white" dense size="xs">
                          {{ moduleGroup.models.length }}
                        </q-chip>
                      </div>
                    </q-item-section>
                  </template>

                  <q-list dense class="module-models-list">
                    <q-item
                      v-for="model in moduleGroup.models"
                      :key="model.name"
                      clickable
                      v-ripple
                      @click="selectModel(model)"
                      :active="selectedModel?.name === model.name"
                      active-class="bg-blue-1"
                      class="module-model-item"
                    >
                      <q-item-section>
                        <q-item-label class="text-caption">{{ model.className }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-expansion-item>
              </q-card>
            </template>

            <!-- Models de Sistema (Colapsado) -->
            <q-card v-if="filteredSystemModels.length > 0" flat bordered class="module-card q-ma-sm">
              <q-expansion-item
                expand-separator
                :default-opened="false"
                class="module-expansion"
              >
                <template v-slot:header>
                  <q-item-section avatar>
                    <q-icon name="security" size="sm" color="orange" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-body2 text-weight-medium">Models de Sistema</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-chip color="orange" text-color="white" dense size="xs">
                      {{ filteredSystemModels.length }}
                    </q-chip>
                  </q-item-section>
                </template>

                <q-list dense class="module-models-list">
                  <q-item
                    v-for="model in filteredSystemModels"
                    :key="model.name"
                    clickable
                    v-ripple
                    @click="selectModel(model)"
                    :active="selectedModel?.name === model.name"
                    active-class="bg-orange-1"
                    class="module-model-item"
                  >
                    <q-item-section>
                      <q-item-label class="text-caption">{{ model.className }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-expansion-item>
            </q-card>
          </q-scroll-area>
        </div>
      </template>

      <!-- Lado Direito: Edição de Model -->
      <template v-slot:after>
        <div class="models-editor">
          <router-view v-slot="{ Component }" :key="route.fullPath">
            <component v-if="Component" :is="Component" />
            <div v-else class="empty-state">
              <q-icon name="code" size="64px" color="grey-5" />
              <div class="text-h6 text-grey-6 q-mt-md">Selecione uma model para editar</div>
            </div>
          </router-view>
        </div>
      </template>
    </q-splitter>

    <!-- Dialog: Instalar Módulo via NPM -->
    <q-dialog v-model="showInstallModuleDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section class="bg-positive text-white">
          <div class="text-h6">
            <q-icon name="download" size="sm" class="q-mr-sm" />
            Instalar Módulo via NPM
          </div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="installPackageName"
            label="Nome do Pacote ou URL *"
            placeholder="@gestor/meu-modulo"
            hint="Exemplo: @gestor/locations ou https://github.com/user/repo.git"
            persistent-hint
            :rules="[val => !!val || 'Campo obrigatório']"
            class="q-mb-md"
            autofocus
          >
            <template v-slot:prepend>
              <q-icon name="package" />
            </template>
          </q-input>
          
          <q-banner class="bg-blue-1 text-blue-9 q-mb-md" rounded dense>
            <template v-slot:avatar>
              <q-icon name="info" color="blue" />
            </template>
            <div class="text-caption">
              <strong>Exemplos válidos:</strong><br>
              • <code>@gestor/locations</code> - Pacote npm com escopo<br>
              • <code>lodash</code> - Pacote npm sem escopo<br>
              • <code>https://github.com/user/module.git</code> - Repositório Git<br>
              • <code>file:../modules/meu-modulo</code> - Caminho local
            </div>
          </q-banner>

          <q-banner v-if="installResult" class="bg-positive text-white q-mb-md" rounded>
            <template v-slot:avatar>
              <q-icon name="check_circle" color="white" />
            </template>
            <div>
              <strong>{{ installResult.message }}</strong>
              <div v-if="installResult.nextSteps" class="q-mt-sm">
                <div class="text-subtitle2">Próximos passos:</div>
                <ul class="q-pl-md q-my-xs">
                  <li v-for="(step, index) in installResult.nextSteps" :key="index" class="text-caption">
                    {{ step }}
                  </li>
                </ul>
              </div>
            </div>
          </q-banner>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn 
            flat 
            label="Cancelar" 
            color="negative" 
            v-close-popup 
            :disable="installingFromNpm"
          />
          <q-btn 
            flat 
            label="Instalar" 
            color="positive" 
            @click="installModuleFromNpm" 
            :loading="installingFromNpm"
            icon="download"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Criar Novo Módulo -->
    <q-dialog v-model="showCreateModuleDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Criar Novo Módulo</div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="newModule.name"
            label="Nome do Módulo *"
            hint="Apenas letras minúsculas, números, hífens e underscores"
            :rules="[val => !!val || 'Nome é obrigatório', val => /^[a-z0-9_-]+$/.test(val) || 'Nome inválido']"
            class="q-mb-md"
          />
          <q-input
            v-model="newModule.title"
            label="Título do Módulo *"
            hint="Ex: Endereços, Produtos"
            :rules="[val => !!val || 'Título é obrigatório']"
            class="q-mb-md"
          />
          <q-input
            v-model="newModule.description"
            label="Descrição"
            type="textarea"
            rows="3"
            class="q-mb-md"
          />
          <q-input
            v-model="newModule.version"
            label="Versão"
            hint="Padrão: 1.0.0"
            class="q-mb-md"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="negative" v-close-popup />
          <q-btn flat label="Criar" color="primary" @click="createModule" :loading="creatingModule" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Visualizar Model de Sistema -->
    <q-dialog v-model="showViewSystemModelDialog" maximized>
      <q-card>
        <q-card-section class="bg-orange text-white">
          <div class="row items-center">
            <q-icon name="security" size="md" class="q-mr-sm" />
            <div class="text-h6">Visualizar Model: {{ selectedSystemModel?.name }}</div>
            <q-space />
            <q-btn flat round dense icon="close" v-close-popup />
          </div>
        </q-card-section>
        <q-card-section v-if="selectedSystemModel">
          <div class="row q-gutter-md q-mb-md">
            <div class="col-12 col-md-6">
              <div class="text-subtitle2 q-mb-xs">Nome da Model</div>
              <q-input :model-value="selectedSystemModel.name" outlined dense readonly />
            </div>
            <div class="col-12 col-md-6">
              <div class="text-subtitle2 q-mb-xs">Nome da Classe</div>
              <q-input :model-value="selectedSystemModel.className" outlined dense readonly />
            </div>
            <div class="col-12">
              <div class="text-subtitle2 q-mb-xs">Arquivo</div>
              <q-input :model-value="selectedSystemModel.file" outlined dense readonly />
            </div>
          </div>

          <q-separator class="q-my-md" />

          <div class="text-subtitle2 q-mb-sm">Campos</div>
          <q-table
            :rows="selectedSystemModelFields"
            :columns="fieldColumns"
            row-key="name"
            flat
            bordered
            :pagination="{ rowsPerPage: 20 }"
          >
            <template v-slot:body-cell-primaryKey="props">
              <q-td :props="props">
                <q-icon v-if="props.value" name="check" color="positive" />
                <q-icon v-else name="close" color="grey" />
              </q-td>
            </template>
            <template v-slot:body-cell-autoIncrement="props">
              <q-td :props="props">
                <q-icon v-if="props.value" name="check" color="positive" />
                <q-icon v-else name="close" color="grey" />
              </q-td>
            </template>
            <template v-slot:body-cell-allowNull="props">
              <q-td :props="props">
                <q-icon v-if="props.value" name="check" color="positive" />
                <q-icon v-else name="close" color="grey" />
              </q-td>
            </template>
          </q-table>

          <q-separator class="q-my-md" />

          <div class="text-subtitle2 q-mb-sm">Relações</div>
          <q-list v-if="selectedSystemModelAssociations.length > 0" bordered>
            <q-item
              v-for="(assoc, index) in selectedSystemModelAssociations"
              :key="index"
            >
              <q-item-section>
                <q-item-label>
                  <q-chip
                    :color="getAssociationTypeColor(assoc.type)"
                    text-color="white"
                    dense
                    size="sm"
                    class="q-mr-sm"
                  >
                    {{ assoc.type }}
                  </q-chip>
                  <strong>{{ selectedSystemModel.className }}</strong>
                  <q-icon name="arrow_forward" size="sm" class="q-mx-xs" />
                  <strong>{{ assoc.target }}</strong>
                </q-item-label>
                <q-item-label caption>
                  Foreign Key: {{ assoc.foreignKey || 'N/A' }}
                  <span v-if="assoc.through"> | Through: {{ assoc.through }}</span>
                  <span v-if="assoc.otherKey"> | Other Key: {{ assoc.otherKey }}</span>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
          <q-banner v-else class="bg-grey-2">
            Nenhuma relação definida
          </q-banner>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Fechar" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api } from '../boot/axios';
import { useQuasar } from 'quasar';
import PageHeader from '../components/PageHeader.vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const authStore = useAuthStore();

const models = ref([]);
const loading = ref(false);
const filter = ref('');
const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
});
const showViewSystemModelDialog = ref(false);
const selectedSystemModel = ref(null);
const selectedSystemModelFields = ref([]);
const selectedSystemModelAssociations = ref([]);
const showCreateModuleDialog = ref(false);
const creatingModule = ref(false);
const newModule = ref({
  name: '',
  title: '',
  description: '',
  version: '1.0.0'
});
const showInstallModuleDialog = ref(false);
const installingFromNpm = ref(false);
const installPackageName = ref('');
const installResult = ref(null);
const modulesInfo = ref([]);
const selectedModel = ref(null);
const searchQuery = ref('');
const splitterModel = ref(30);
const installingModules = ref({});

const columns = [
  {
    name: 'className',
    required: true,
    label: 'Classe',
    align: 'left',
    field: 'className',
    sortable: true
  },
  {
    name: 'name',
    label: 'Nome',
    align: 'left',
    field: 'name',
    sortable: true
  },
  {
    name: 'actions',
    label: 'Ações',
    align: 'right',
    field: 'actions',
    sortable: false
  }
];

// Colunas simplificadas para os módulos (apenas Classe)
const moduleColumns = [
  {
    name: 'className',
    required: true,
    label: 'Classe',
    align: 'left',
    field: 'className',
    sortable: true
  }
];

const fieldColumns = [
  { name: 'name', label: 'Nome', field: 'name', align: 'left' },
  { name: 'type', label: 'Tipo', field: 'type', align: 'left' },
  { name: 'primaryKey', label: 'PK', field: 'primaryKey', align: 'center' },
  { name: 'autoIncrement', label: 'AI', field: 'autoIncrement', align: 'center' },
  { name: 'allowNull', label: 'Null', field: 'allowNull', align: 'center' }
];

const systemModels = computed(() => {
  return models.value.filter(m => m.isSystem);
});

const userModels = computed(() => {
  return models.value.filter(m => !m.isSystem);
});

// Filtrar models baseado na busca
const filteredUserModels = computed(() => {
  if (!searchQuery.value) return userModels.value;
  const query = searchQuery.value.toLowerCase();
  return userModels.value.filter(model => 
    model.className.toLowerCase().includes(query) ||
    model.name.toLowerCase().includes(query) ||
    (model.moduleTitle && model.moduleTitle.toLowerCase().includes(query)) ||
    (model.module && model.module.toLowerCase().includes(query))
  );
});

const filteredSystemModels = computed(() => {
  if (!searchQuery.value) return systemModels.value;
  const query = searchQuery.value.toLowerCase();
  return systemModels.value.filter(model => 
    model.className.toLowerCase().includes(query) ||
    model.name.toLowerCase().includes(query)
  );
});

// Agrupar models do usuário por módulo (filtrado)
const filteredModelsByModule = computed(() => {
  const grouped = {};
  
      // Primeiro, adicionar todos os módulos disponíveis (mesmo sem models)
      modulesInfo.value.forEach(moduleInfo => {
        if (!moduleInfo.isSystem) {
          grouped[moduleInfo.name] = {
            name: moduleInfo.name,
            title: moduleInfo.title || moduleInfo.name,
            description: moduleInfo.description || '',
            version: moduleInfo.version || '',
            enabled: moduleInfo.enabled !== undefined ? moduleInfo.enabled : true,
            isSystem: moduleInfo.isSystem || false,
            models: []
          };
        }
      });
  
  // Adicionar models aos seus módulos correspondentes
  filteredUserModels.value.forEach(model => {
    const moduleName = model.module || 'outros';
    const moduleTitle = model.moduleTitle || 'Outros';
    
    if (!grouped[moduleName]) {
      // Buscar informações completas do módulo
      const moduleInfo = modulesInfo.value.find(m => m.name === moduleName);
      
      grouped[moduleName] = {
        name: moduleName,
        title: moduleTitle,
        description: moduleInfo?.description || '',
        version: moduleInfo?.version || '',
        enabled: moduleInfo?.enabled !== undefined ? moduleInfo.enabled : true,
        isSystem: moduleInfo?.isSystem || false,
        models: []
      };
    }
    
    grouped[moduleName].models.push(model);
  });
  
  // Filtrar apenas se houver busca ativa e o módulo não corresponder à busca
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    return Object.values(grouped).filter(group => {
      // Manter se o nome/título do módulo corresponde à busca
      if (group.title.toLowerCase().includes(query) || group.name.toLowerCase().includes(query)) {
        return true;
      }
      // Manter se há models que correspondem à busca
      return group.models.length > 0;
    });
  }
  
  // Sem busca, retornar todos os módulos (mesmo sem models)
  return Object.values(grouped);
});

// Agrupar models do usuário por módulo (original, para referência)
const modelsByModule = computed(() => {
  const grouped = {};
  
  userModels.value.forEach(model => {
    const moduleName = model.module || 'outros';
    const moduleTitle = model.moduleTitle || 'Outros';
    
    if (!grouped[moduleName]) {
      // Buscar informações completas do módulo
      const moduleInfo = modulesInfo.value.find(m => m.name === moduleName);
      
      grouped[moduleName] = {
        name: moduleName,
        title: moduleTitle,
        description: moduleInfo?.description || '',
        version: moduleInfo?.version || '',
        enabled: moduleInfo?.enabled !== undefined ? moduleInfo.enabled : true,
        isSystem: moduleInfo?.isSystem || false,
        models: []
      };
    }
    
    grouped[moduleName].models.push(model);
  });
  
  return Object.values(grouped);
});

async function loadModules() {
  try {
    const response = await api.get('/api/modules');
    modulesInfo.value = response.data || [];
  } catch (error) {
    console.error('Erro ao carregar módulos:', error);
  }
}

async function installModule(moduleName) {
  try {
    installingModules.value[moduleName] = true;
    
    // Verificar dependências primeiro
    const depResponse = await api.get(`/api/modules/${moduleName}/dependencies`);
    const depCheck = depResponse.data;
    
    if (!depCheck.allInstalled && depCheck.missing && depCheck.missing.length > 0) {
      const missingDeps = depCheck.missing.join(', ');
      const installDeps = await $q.dialog({
        title: 'Dependências Necessárias',
        message: `O módulo "${moduleName}" requer os seguintes módulos: ${missingDeps}. Deseja instalar automaticamente?`,
        cancel: true,
        persistent: true
      });
      
      if (!installDeps) {
        installingModules.value[moduleName] = false;
        return;
      }
    }
    
    const response = await api.post(`/api/modules/${moduleName}/install`);
    
    $q.notify({
      color: 'positive',
      message: response.data.message || 'Módulo instalado com sucesso!',
      icon: 'check_circle'
    });
    
    // Recarregar módulos e models
    await loadModules();
    await loadModels();
  } catch (error) {
    console.error('Erro ao instalar módulo:', error);
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao instalar módulo',
      icon: 'error'
    });
  } finally {
    installingModules.value[moduleName] = false;
  }
}

async function uninstallModule(moduleName) {
  try {
    const confirm = await $q.dialog({
      title: 'Confirmar Desinstalação',
      message: `Deseja realmente desinstalar o módulo "${moduleName}"? Esta ação pode remover dados relacionados.`,
      cancel: true,
      persistent: true
    });
    
    if (!confirm) return;
    
    installingModules.value[moduleName] = true;
    
    const response = await api.post(`/api/modules/${moduleName}/uninstall`);
    
    $q.notify({
      color: 'positive',
      message: response.data.message || 'Módulo desinstalado com sucesso!',
      icon: 'check_circle'
    });
    
    // Recarregar módulos e models
    await loadModules();
    await loadModels();
  } catch (error) {
    console.error('Erro ao desinstalar módulo:', error);
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao desinstalar módulo',
      icon: 'error'
    });
  } finally {
    installingModules.value[moduleName] = false;
  }
}

async function loadModels() {
  loading.value = true;
  try {
    const response = await api.get('/api/models');
    // O backend agora retorna { data: [...], count: ..., page: ..., limit: ..., totalPages: ... }
    // ou um array direto (compatibilidade)
    let data = response.data;
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
      // Formato com paginação
      models.value = data.data;
    } else if (Array.isArray(data)) {
      // Formato array direto (compatibilidade)
      models.value = data;
    } else {
      models.value = [];
    }
    pagination.value.rowsNumber = userModels.value.length;
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao carregar models',
      icon: 'error'
    });
  } finally {
    loading.value = false;
  }
}

function selectModel(model) {
  // Forçar reload mesmo quando é a mesma rota com parâmetros diferentes
  if (selectedModel.value?.name === model.name) {
    return; // Já está selecionada
  }
  selectedModel.value = model;
  router.push({ path: `/admin/models/${model.name}` });
}

function editModel(name) {
  const model = models.value.find(m => m.name === name);
  if (model) {
    selectModel(model);
  }
}

function confirmDeleteModel(model) {
  $q.dialog({
    title: 'Confirmar Exclusão',
    message: `Tem certeza que deseja excluir a model "${model.name}"? Esta ação não pode ser desfeita.`,
    cancel: true,
    persistent: true,
    color: 'negative'
  }).onOk(() => {
    deleteModel(model.name);
  });
}

async function deleteModel(name) {
  $q.loading.show({ message: 'Excluindo model...' });
  try {
    await api.delete(`/api/models/${name}`);
    $q.notify({
      color: 'positive',
      message: 'Model excluída com sucesso!',
      icon: 'check'
    });
    loadModels();
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao excluir model',
      icon: 'error'
    });
  } finally {
    $q.loading.hide();
  }
}

function createNewModel() {
  selectedModel.value = null;
  router.push({ path: '/admin/models/new', replace: true });
}

function openInstallModuleDialog() {
  // Resetar formulário
  installPackageName.value = '';
  installResult.value = null;
  showInstallModuleDialog.value = true;
}

async function installModuleFromNpm() {
  if (!installPackageName.value) {
    $q.notify({
      color: 'negative',
      message: 'Nome do pacote é obrigatório',
      icon: 'error'
    });
    return;
  }

  installingFromNpm.value = true;
  installResult.value = null;

  try {
    const response = await api.post('/api/modules/npm/install', {
      packageName: installPackageName.value
    });

    if (response.data.success) {
      installResult.value = response.data;
      
      // Mensagem de sucesso principal
      $q.notify({
        color: 'positive',
        message: response.data.message || 'Módulo instalado com sucesso!',
        icon: 'check_circle',
        timeout: 3000
      });

      // Informar sobre migrations
      if (response.data.migrations) {
        $q.notify({
          color: response.data.migrations.executed ? 'positive' : 'warning',
          message: response.data.migrations.message,
          icon: response.data.migrations.executed ? 'done' : 'warning',
          timeout: 3000,
          position: 'top'
        });
      }

      // Informar sobre seeders
      if (response.data.seeders) {
        $q.notify({
          color: response.data.seeders.executed ? 'positive' : 'warning',
          message: response.data.seeders.message,
          icon: response.data.seeders.executed ? 'done' : 'warning',
          timeout: 3000,
          position: 'top'
        });
      }

      // Informar sobre reload de rotas dinâmicas
      if (response.data.dynamicRoutes) {
        $q.notify({
          color: response.data.dynamicRoutes.reloaded ? 'positive' : 'warning',
          message: response.data.dynamicRoutes.message,
          icon: response.data.dynamicRoutes.reloaded ? 'done' : 'warning',
          timeout: 3000,
          position: 'top'
        });
      }

      // Aguardar 2 segundos para o usuário ver todas as notificações
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Fechar dialog e recarregar módulos
      showInstallModuleDialog.value = false;
      await loadModules();
      await loadModels();
    } else {
      throw new Error(response.data.message || 'Erro ao instalar módulo');
    }
  } catch (error) {
    console.error('Erro ao instalar módulo via npm:', error);
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'Erro ao instalar módulo via npm';
    
    $q.notify({
      color: 'negative',
      message: errorMessage,
      icon: 'error',
      timeout: 8000,
      multiLine: true,
      html: true
    });
  } finally {
    installingFromNpm.value = false;
  }
}

function openCreateModuleDialog() {
  // Resetar formulário
  newModule.value = {
    name: '',
    title: '',
    description: '',
    version: '1.0.0'
  };
  showCreateModuleDialog.value = true;
}

async function createModule() {
  if (!newModule.value.name || !newModule.value.title) {
    $q.notify({
      color: 'negative',
      message: 'Nome e título são obrigatórios',
      icon: 'error'
    });
    return;
  }

  if (!/^[a-z0-9_-]+$/.test(newModule.value.name)) {
    $q.notify({
      color: 'negative',
      message: 'Nome do módulo deve conter apenas letras minúsculas, números, hífens e underscores',
      icon: 'error'
    });
    return;
  }

  creatingModule.value = true;
  try {
    await api.post('/api/modules', {
      name: newModule.value.name,
      title: newModule.value.title,
      description: newModule.value.description,
      version: newModule.value.version || '1.0.0',
      isSystem: false
    });
    
    $q.notify({
      color: 'positive',
      message: 'Módulo criado com sucesso!',
      icon: 'check'
    });
    
    // Resetar formulário
    newModule.value = {
      name: '',
      title: '',
      description: '',
      version: '1.0.0'
    };
    
    showCreateModuleDialog.value = false;
    
    // Recarregar models para mostrar o novo módulo
    loadModels();
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao criar módulo',
      icon: 'error'
    });
  } finally {
    creatingModule.value = false;
  }
}

function goToMermaidDiagram() {
  router.push('/admin/models/mermaid');
}

function viewModuleMermaid(moduleName) {
  router.push({ path: '/admin/models/mermaid', query: { module: moduleName } });
}

async function runMigrations() {
  $q.loading.show({ message: 'Executando migrations...' });
  try {
    const response = await api.post('/api/models/migrations/run');
    $q.notify({
      color: 'positive',
      message: 'Migrations executadas com sucesso!',
      icon: 'check',
      timeout: 5000
    });
    console.log('Output:', response.data.output);
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao executar migrations',
      icon: 'error',
      timeout: 5000
    });
    if (error.response?.data?.output) {
      console.error('Output:', error.response.data.output);
    }
  } finally {
    $q.loading.hide();
  }
}

async function runSeeders() {
  $q.loading.show({ message: 'Executando seeders...' });
  try {
    const response = await api.post('/api/models/seeders/run');
    $q.notify({
      color: 'positive',
      message: 'Seeders executados com sucesso!',
      icon: 'check',
      timeout: 5000
    });
    console.log('Output:', response.data.output);
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao executar seeders',
      icon: 'error',
      timeout: 5000
    });
    if (error.response?.data?.output) {
      console.error('Output:', error.response.data.output);
    }
  } finally {
    $q.loading.hide();
  }
}

function confirmRecreateDatabase() {
  const q = $q;
  q.dialog({
    title: 'Confirmar Recriação do Banco',
    message: 'Esta ação irá apagar TODOS os dados do banco e recriar do zero. Tem certeza?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    recreateDatabase();
  });
}

async function recreateDatabase() {
  try {
    // $q.loading.show({ message: 'Recriando banco de dados... Isso pode levar alguns minutos.' });
    const response = await api.post('/api/models/database/recreate');
    $q.notify({
      color: 'positive',
      message: 'Banco recriado com sucesso!',
      icon: 'check',
      timeout: 5000
    });
    console.log('Output:', response.data.output);
  } catch (error) {
    console.error('Error:', error);
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao recriar banco',
      icon: 'error',
      timeout: 5000
    });
    if (error.response?.data?.output) {
      console.error('Output:', error.response.data.output);
    }
  } finally {
    if ($q && $q.loading) {
      // $q.loading.hide();
    }
  }
}

function getAssociationTypeColor(type) {
  const colors = {
    belongsTo: 'blue',
    hasMany: 'green',
    hasOne: 'teal',
    belongsToMany: 'purple'
  };
  return colors[type] || 'grey';
}

async function viewSystemModel(model) {
  selectModel(model);
}

// Sincronizar selectedModel com a rota atual
watch(() => route.params.name, (name) => {
  if (name && name !== 'new') {
    const model = models.value.find(m => m.name === name);
    if (model) {
      selectedModel.value = model;
    } else {
      selectedModel.value = null;
    }
  } else {
    selectedModel.value = null;
  }
}, { immediate: true });

onMounted(async () => {
  await loadModules();
  await loadModels();
  
  // Sincronizar com rota atual após carregar models
  if (route.params.name && route.params.name !== 'new') {
    const model = models.value.find(m => m.name === route.params.name);
    if (model) {
      selectedModel.value = model;
    }
  }
});
</script>

<style scoped>
.models-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
}

.models-splitter {
  flex: 1;
  height: 100%;
}

.models-menu {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fafafa;
}

.models-menu-scroll {
  flex: 1;
  height: calc(100% - 80px);
}

.models-editor {
  height: 100%;
  overflow: auto;
  background-color: #ffffff;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px;
}

/* Estilos para os cards de módulos */
.module-card {
  border-radius: 8px;
  font-size: 0.875rem;
}

.module-expansion :deep(.q-item) {
  min-height: 40px;
  padding: 8px 12px;
}

.module-expansion :deep(.q-item__label) {
  font-size: 0.875rem;
}

.module-models-list {
  padding: 4px 0;
}

.module-model-item {
  min-height: 32px;
  padding: 4px 12px;
}

.module-model-item :deep(.q-item__section) {
  padding: 0;
}

.module-model-item :deep(.q-item__label) {
  font-size: 0.75rem;
  line-height: 1.4;
}

/* Estilo para code tags em banners */
code {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}
</style>

