<template>
  <q-page class="full-height">
    <PageHeader
      title="Diagrama ER - Models"
      icon="account_tree"
      :breadcrumbs="[
        { label: 'Início', to: '/' },
        { label: 'Models', to: '/admin/models' },
        { label: 'Diagrama ER' }
      ]"
      :show-search="false"
    >
      <template v-slot:actions>
        <q-select
          v-model="selectedModule"
          :options="availableModules"
          option-label="title"
          option-value="name"
          emit-value
          map-options
          outlined
          dense
          label="Módulo"
          hint="Filtrar por módulo"
          style="min-width: 200px"
          class="q-mr-sm"
          @update:model-value="onModuleChange"
        >
          <template v-slot:prepend>
            <q-icon name="folder" />
          </template>
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section avatar>
                <q-icon :name="scope.opt.isSystem ? 'lock' : 'folder'" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ scope.opt.title }}</q-item-label>
                <q-item-label caption>{{ scope.opt.name }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
        <q-btn
          color="info"
          icon="refresh"
          label="Atualizar do Disco"
          @click="reloadFromDisk"
          :loading="loading"
          size="sm"
          dense
          class="q-mr-sm"
        />
        <q-btn
          color="primary"
          icon="play_arrow"
          label="Executar"
          @click="executeWithAI"
          :loading="executingAI"
          size="sm"
          dense
        />
      </template>
    </PageHeader>

    <q-card flat class="full-height" style="display: flex; flex-direction: column;">
      <q-card-section class="q-pa-none" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
        <q-splitter
          v-if="!editorMinimized"
          v-model="splitterModel"
          :limits="[30, 70]"
          unit="%"
          style="height: calc(100vh - 110px);"
        >
          <template v-slot:before>
            <div class="full-height" style="display: flex; flex-direction: column;">
              <div class="row items-center justify-between q-pa-sm bg-grey-3">
                <div class="text-subtitle2 text-weight-medium">Editor de Código Mermaid</div>
                <q-btn
                  flat
                  round
                  dense
                  icon="chevron_left"
                  @click="toggleEditor"
                  size="sm"
                />
              </div>
              <div 
                ref="monacoContainer" 
                class="monaco-container full-height" 
                style="flex: 1; min-height: 0;"
              ></div>
            </div>
          </template>

          <template v-slot:after>
            <div class="q-pa-sm full-height" style="display: flex; flex-direction: column;">
              <div class="row items-center justify-between q-pa-sm bg-grey-3">
                <div class="text-subtitle2 text-weight-medium">Visualização do Diagrama</div>
              </div>
              <div 
                v-if="loading" 
                class="flex flex-center full-height"
              >
                <q-spinner color="primary" size="3em" />
              </div>
              <div 
                v-else-if="error" 
                class="q-pa-md"
              >
                <q-banner class="bg-negative text-white">
                  <template v-slot:avatar>
                    <q-icon name="error" />
                  </template>
                  {{ error }}
                </q-banner>
              </div>
              <div 
                v-else-if="mermaidCode" 
                ref="mermaidContainer" 
                class="mermaid-diagram-container full-height"
                style="flex: 1; min-height: 0; overflow: auto;"
              ></div>
              <div 
                v-else 
                class="text-center q-pa-md text-grey full-height flex flex-center"
              >
                Nenhum dado disponível
              </div>
            </div>
          </template>
        </q-splitter>
        
        <!-- Quando editor está minimizado, mostrar apenas o diagrama -->
        <div v-else class="full-height" style="display: flex; flex-direction: column;">
          <div class="full-height" style="display: flex; flex-direction: column;">
            <div class="row items-center justify-between bg-grey-3">
              <div class="text-subtitle2 text-weight-medium">Visualização do Diagrama</div>
              <q-btn
                flat
                round
                dense
                icon="code"
                @click="toggleEditor"
                size="sm"
                label="Abrir Editor"
              />
            </div>
            <div 
              v-if="loading" 
              class="flex flex-center full-height"
            >
              <q-spinner color="primary" size="3em" />
            </div>
            <div 
              v-else-if="error" 
              class="q-pa-md"
            >
              <q-banner class="bg-negative text-white">
                <template v-slot:avatar>
                  <q-icon name="error" />
                </template>
                {{ error }}
              </q-banner>
            </div>
            <div 
              v-else-if="mermaidCode" 
              ref="mermaidContainer" 
              class="mermaid-diagram-container full-height"
              style="flex: 1; min-height: 0; overflow: auto;"
            ></div>
            <div 
              v-else 
              class="text-center q-pa-md text-grey full-height flex flex-center"
            >
              Nenhum dado disponível
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- FAB Button para Executar -->
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn
        fab
        color="primary"
        icon="play_arrow"
        @click="executeWithAI"
        :loading="executingAI"
      >
        <q-tooltip>Executar com IA</q-tooltip>
      </q-btn>
    </q-page-sticky>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { api } from '../boot/axios';
import { useQuasar } from 'quasar';
import { useRouter, useRoute } from 'vue-router';
import loader from '@monaco-editor/loader';
import mermaid from 'mermaid';
import PageHeader from '../components/PageHeader.vue';

const $q = useQuasar();
const router = useRouter();
const route = useRoute();

const STORAGE_KEY = 'mermaid_diagram_editing';

const loading = ref(false);
const error = ref(null);
const modelsData = ref([]);
const filteredModelsData = ref([]);
const availableModules = ref([]);
const selectedModule = ref(null);
const mermaidCode = ref('');
const originalMermaidCode = ref(''); // Código original gerado automaticamente
const splitterModel = ref(40); // 40% para o editor, 60% para o diagrama
const editorMinimized = ref(false);
const executingAI = ref(false);
const mermaidContainer = ref(null);
const monacoContainer = ref(null);
let monacoEditor = null;
let updateTimeout = null;

// Inicializar Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  },
  er: {
    fontSize: 14
  }
});

async function loadModules() {
  try {
    const response = await api.get('/api/modules');
    availableModules.value = response.data || [];
    // Adicionar opção "Todos" no início
    availableModules.value.unshift({ name: null, title: 'Todos os Módulos', isSystem: false });
  } catch (err) {
    console.error('Erro ao carregar módulos:', err);
  }
}

function filterModelsByModule() {
  if (!selectedModule.value) {
    filteredModelsData.value = modelsData.value;
  } else {
    filteredModelsData.value = modelsData.value.filter(model => model.module === selectedModule.value);
  }
  generateMermaidDiagram();
}

function onModuleChange() {
  filterModelsByModule();
}

async function loadModels() {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await api.get('/api/models/mermaid/diagram');
    modelsData.value = response.data || [];
    filterModelsByModule();
    
    // Aguardar a geração e renderização do diagrama antes de continuar
    await generateMermaidDiagram();
    
    // Salvar código original no localStorage para comparação futura
    if (mermaidCode.value) {
      localStorage.setItem(STORAGE_KEY + '_original', mermaidCode.value);
    }
  } catch (err) {
    console.error('Erro ao carregar models:', err);
    error.value = err.response?.data?.message || 'Erro ao carregar models';
    $q.notify({
      color: 'negative',
      message: 'Erro ao carregar models',
      icon: 'error'
    });
  } finally {
    loading.value = false;
  }
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return saved;
    }
  } catch (err) {
    console.error('Erro ao carregar do localStorage:', err);
  }
  return null;
}

function saveToLocalStorage(code) {
  try {
    if (code && code.trim()) {
      localStorage.setItem(STORAGE_KEY, code);
    }
  } catch (err) {
    console.error('Erro ao salvar no localStorage:', err);
  }
}

function clearLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Erro ao limpar localStorage:', err);
  }
}

async function askUserToLoadVersion() {
  return new Promise((resolve) => {
    $q.dialog({
      title: 'Versão em Edição Encontrada',
      message: 'Foi encontrada uma versão do diagrama que estava sendo editada. Deseja carregar a versão do disco ou continuar editando a versão salva?',
      cancel: {
        label: 'Carregar do Disco',
        color: 'grey',
        flat: true
      },
      ok: {
        label: 'Continuar Edição',
        color: 'primary'
      },
      persistent: true
    }).onOk(() => {
      // Usuário escolheu continuar edição
      resolve(true);
    }).onCancel(() => {
      // Usuário escolheu carregar do disco
      resolve(false);
    });
  });
}

async function reloadFromDisk() {
  await loadModels();
  $q.notify({
    color: 'positive',
    message: 'Models atualizadas do disco com sucesso!',
    icon: 'check'
  });
}

function generateMermaidCodeFromModels(models) {
  if (!models || models.length === 0) {
    return '';
  }

  let code = 'erDiagram\n';
  
  // Criar mapa de entidades para evitar duplicatas
  const entitiesMap = new Map();
  
  // Gerar entidades com campos
  models.forEach(model => {
    const entityName = model.className || model.name;
    
    // Evitar duplicatas
    if (entitiesMap.has(entityName)) return;
    entitiesMap.set(entityName, true);
    
    code += `    ${entityName} {\n`;
    
    // Adicionar campos principais
    if (model.fields && model.fields.length > 0) {
      model.fields.forEach(field => {
        const fieldType = mapSequelizeTypeToMermaid(field.type);
        const pk = field.primaryKey ? ' PK' : '';
        const nullable = field.allowNull !== false ? '' : ' "NOT NULL"';
        code += `        ${fieldType} ${field.name}${pk}${nullable}\n`;
      });
    } else {
      code += `        int id PK\n`;
    }
    
    code += `    }\n\n`;
  });
  
  // Criar mapa de relacionamentos para evitar duplicatas
  const relationshipsMap = new Set();
  
  // Gerar relacionamentos
  models.forEach(model => {
    if (model.associations && model.associations.length > 0) {
      const sourceEntity = model.className || model.name;
      
      model.associations.forEach(assoc => {
        const targetEntity = assoc.target;
        
        // Criar chave única para o relacionamento
        const relKey = `${sourceEntity}-${assoc.type}-${targetEntity}`;
        if (relationshipsMap.has(relKey)) return;
        relationshipsMap.add(relKey);
        
        // Verificar se ambas as entidades existem
        if (!entitiesMap.has(sourceEntity) || !entitiesMap.has(targetEntity)) {
          return;
        }
        
        let relationship = '';
        switch (assoc.type) {
          case 'belongsTo':
            relationship = `    ${targetEntity} ||--o{ ${sourceEntity} : "possui"\n`;
            break;
          case 'hasMany':
            relationship = `    ${sourceEntity} ||--o{ ${targetEntity} : "possui"\n`;
            break;
          case 'hasOne':
            relationship = `    ${sourceEntity} ||--|| ${targetEntity} : "tem"\n`;
            break;
          case 'belongsToMany':
            relationship = `    ${sourceEntity} }o--o{ ${targetEntity} : "pertence"\n`;
            break;
          default:
            return;
        }
        
        code += relationship;
      });
    }
  });
  
  return code;
}

async function generateMermaidDiagram() {
  const dataToUse = filteredModelsData.value.length > 0 ? filteredModelsData.value : modelsData.value;
  if (!dataToUse || dataToUse.length === 0) {
    mermaidCode.value = '';
    originalMermaidCode.value = '';
    return;
  }

  const code = generateMermaidCodeFromModels(dataToUse);
  
  mermaidCode.value = code;
  originalMermaidCode.value = code; // Salvar código original
  
  // Aguardar o próximo tick e garantir que o container esteja renderizado antes de renderizar
  await nextTick();
  
  // Aguardar um pouco mais para garantir que o DOM está completamente renderizado
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Renderizar diagrama apenas se o container estiver disponível
  if (mermaidContainer.value && mermaidCode.value) {
    await renderMermaidDiagram();
  }
  
  // Atualizar Monaco Editor se estiver inicializado (mas não sobrescrever se usuário está editando)
  if (monacoEditor) {
    const currentValue = monacoEditor.getValue();
    const savedCode = loadFromLocalStorage();
    // Só atualizar se não houver código salvo (não é edição do usuário)
    if (!savedCode || currentValue === savedCode) {
      if (currentValue !== code) {
        monacoEditor.setValue(code);
      }
    }
  }
}

function mapSequelizeTypeToMermaid(sequelizeType) {
  const typeMap = {
    'STRING': 'varchar',
    'TEXT': 'text',
    'INTEGER': 'int',
    'BIGINT': 'bigint',
    'FLOAT': 'float',
    'DOUBLE': 'double',
    'DECIMAL': 'decimal',
    'BOOLEAN': 'boolean',
    'DATE': 'date',
    'DATEONLY': 'date',
    'TIME': 'time',
    'UUID': 'varchar',
    'JSON': 'json',
    'JSONB': 'jsonb',
    'ENUM': 'varchar'
  };
  
  return typeMap[sequelizeType?.toUpperCase()] || 'varchar';
}

async function renderMermaidDiagram() {
  // Verificar se o container e o código estão disponíveis
  if (!mermaidContainer.value) {
    console.warn('⚠️ Container do diagrama não está disponível ainda, tentando novamente...');
    // Tentar novamente após um delay
    setTimeout(async () => {
      if (mermaidContainer.value && mermaidCode.value) {
        await renderMermaidDiagram();
      }
    }, 200);
    return;
  }
  
  if (!mermaidCode.value || mermaidCode.value.trim() === '') {
    console.warn('⚠️ Código Mermaid está vazio');
    return;
  }
  
  try {
    // Limpar container anterior
    mermaidContainer.value.innerHTML = '';
    
    // Criar elemento para o diagrama
    const diagramElement = document.createElement('div');
    diagramElement.className = 'mermaid';
    diagramElement.textContent = mermaidCode.value;
    mermaidContainer.value.appendChild(diagramElement);
    
    // Renderizar com Mermaid usando a API correta
    const id = `mermaid-${Date.now()}`;
    
    // Tentar usar render se disponível
    if (typeof mermaid.render === 'function') {
      const { svg } = await mermaid.render(id, mermaidCode.value);
      diagramElement.innerHTML = svg;
    } else {
      // Fallback: deixar o Mermaid processar automaticamente
      mermaid.contentLoaded();
    }
  } catch (err) {
    console.error('❌ Erro ao renderizar diagrama Mermaid:', err);
    $q.notify({
      color: 'negative',
      message: 'Erro ao renderizar diagrama: ' + (err.message || 'Erro desconhecido'),
      icon: 'error'
    });
  }
}

async function initMonacoEditor() {
  if (!monacoContainer.value) return;
  
  try {
    // Se já existe um editor, destruir antes de criar novo
    if (monacoEditor) {
      monacoEditor.dispose();
      monacoEditor = null;
    }
    
    const monaco = await loader.init();
    monacoEditor = monaco.editor.create(monacoContainer.value, {
      value: mermaidCode.value || '',
      language: 'plaintext',
      theme: 'vs', // Modo light
      readOnly: false,
      minimap: { enabled: false }, // Desabilitar minimap
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      lineNumbers: 'on',
      fontSize: 14
    });
    
    // Listener para atualização automática (live editor)
    monacoEditor.onDidChangeModelContent(() => {
      const newCode = monacoEditor.getValue();
      
      // Salvar no localStorage
      saveToLocalStorage(newCode);
      
      // Debounce para atualizar o diagrama (aguardar 800ms após última edição)
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      
      updateTimeout = setTimeout(async () => {
        if (newCode && newCode.trim()) {
          mermaidCode.value = newCode;
          await nextTick();
          try {
            await renderMermaidDiagram();
          } catch (err) {
            // Erro silencioso - diagrama pode estar com sintaxe inválida temporariamente durante edição
            console.log('Erro ao renderizar (pode ser temporário durante edição):', err.message);
          }
        }
      }, 800);
    });
    
    // Atualizar quando o código mudar externamente (quando models são carregadas)
    watch(() => mermaidCode.value, (newValue) => {
      if (monacoEditor && monacoEditor.getValue() !== newValue) {
        monacoEditor.setValue(newValue || '');
      }
    });
  } catch (err) {
    console.error('Erro ao inicializar Monaco Editor:', err);
  }
}

function toggleEditor() {
  editorMinimized.value = !editorMinimized.value;
  
  // Quando reabrir o editor, restaurar para 40%
  if (!editorMinimized.value) {
    splitterModel.value = 40;
    
    // Aguardar o próximo tick para garantir que o splitter foi renderizado
    nextTick(() => {
      // Aguardar um pouco mais para garantir que o container está disponível
      setTimeout(() => {
        if (monacoEditor && monacoContainer.value) {
          monacoEditor.layout();
        }
      }, 100);
    });
  }
}

// Função removida - agora é automática via live editor

async function executeWithAI() {
  if (!monacoEditor) {
    $q.notify({
      color: 'warning',
      message: 'Editor não está inicializado',
      icon: 'warning'
    });
    return;
  }
  
  executingAI.value = true;
  
  try {
    const editedCode = monacoEditor.getValue();
    
    if (!editedCode || editedCode.trim() === '') {
      $q.notify({
        color: 'warning',
        message: 'O código Mermaid está vazio',
        icon: 'warning'
      });
      return;
    }
    
    // Se não houver diagrama original, atualizar do disco primeiro
    if (!originalMermaidCode.value || originalMermaidCode.value.trim() === '') {
      $q.notify({
        color: 'info',
        message: 'Atualizando models do disco...',
        icon: 'info'
      });
      
      // Carregar models do disco
      await loadModels();
      
      // Aguardar um pouco para garantir que o código foi gerado
      await nextTick();
    }
    
    // Limpar localStorage após executar (trabalho foi aplicado)
    clearLocalStorage();
    
    // Preparar mensagem baseada se há diagrama original ou não
    let message = '';
    
    if (!originalMermaidCode.value || originalMermaidCode.value.trim() === '') {
      // Caso: Disco vazio - criar novo diagrama
      // Extrair módulo do diagrama se existir
      const moduleMatch = editedCode.match(/%%module:\s*(\w+)/i);
      const moduleName = moduleMatch ? moduleMatch[1].toLowerCase() : null;
      
      let moduleInstructions = '';
      if (moduleName) {
        moduleInstructions = `
CRÍTICO - MÓDULO ESPECIFICADO NO DIAGRAMA:
- O diagrama especifica o módulo: "${moduleName}"
- ANTES de criar qualquer model, você DEVE:
  1. Chamar getModules para verificar se o módulo "${moduleName}" existe
  2. Se não existir, criar o módulo usando createModule com name: "${moduleName}"
  3. TODAS as chamadas de createModel DEVEM incluir module: "${moduleName}"
  4. As migrations e seeders serão criadas automaticamente em src/modules/${moduleName}/migrations e src/modules/${moduleName}/seeders/
- NÃO crie migrations ou seeders na raiz (src/migrations ou src/seeders)
- NÃO verifique tabelas de outros módulos que não existem - apenas use tabelas do sistema (sys_*) ou do módulo atual

`;
      } else {
        moduleInstructions = `
ATENÇÃO - MÓDULO NÃO ESPECIFICADO:
- O diagrama não especifica um módulo (%%module: nome_modulo)
- Você DEVE perguntar ao usuário qual módulo usar OU usar um módulo padrão baseado no contexto
- TODAS as chamadas de createModel DEVEM incluir o parâmetro module
- NÃO crie migrations ou seeders na raiz (src/migrations ou src/seeders)

`;
      }
      
      message = `Crie as models e seus relacionamentos baseado no seguinte diagrama Mermaid ER:

${moduleInstructions}DIAGRAMA MERMAID:
${editedCode}

Por favor, analise o diagrama acima e:
1. ${moduleName ? `Verificar/criar o módulo "${moduleName}" primeiro` : 'Identificar ou perguntar qual módulo usar'}
2. Crie todas as models necessárias com seus campos, tipos e relacionamentos${moduleName ? ` (TODAS com module: "${moduleName}")` : ' (TODAS com o parâmetro module especificado)'}
3. As migrations serão criadas automaticamente no módulo correto quando você usar createModel
4. Execute as migrations para criar as tabelas no banco de dados
5. Crie as Interfaces (CRUDs) para cada model criada
6. Crie os itens de menu e permissões para o Admin (roleId: 1)

IMPORTANTE: 
- Execute TODAS as funções necessárias para criar completamente o sistema baseado neste diagrama
- Não pare após criar apenas uma model - crie todas as models, migrations, execute as migrations, crie os CRUDs, menus e permissões
- ${moduleName ? `TODAS as models devem ser criadas no módulo "${moduleName}"` : 'TODAS as models devem incluir o parâmetro module'}
- Migrations e seeders serão criados automaticamente no módulo correto quando você usar createModel com o parâmetro module`;
    } else {
      // Caso: Comparar diferenças entre original e editado
      // Extrair módulo do diagrama editado se existir
      const moduleMatch = editedCode.match(/%%module:\s*(\w+)/i);
      const moduleName = moduleMatch ? moduleMatch[1].toLowerCase() : null;
      
      let moduleInstructions = '';
      if (moduleName) {
        moduleInstructions = `
CRÍTICO - MÓDULO ESPECIFICADO NO DIAGRAMA:
- O diagrama editado especifica o módulo: "${moduleName}"
- Verifique se o módulo "${moduleName}" existe usando getModules
- Se não existir, crie o módulo usando createModule
- TODAS as novas models devem ser criadas com module: "${moduleName}"
- Migrations e seeders serão criados automaticamente no módulo correto

`;
      }
      
      message = `Analise as diferenças entre o diagrama Mermaid atual das models no disco e o diagrama Mermaid editado pelo usuário. 

${moduleInstructions}DIAGRAMA ORIGINAL (do disco):
${originalMermaidCode.value}

DIAGRAMA EDITADO (pelo usuário):
${editedCode}

Por favor, identifique todas as diferenças entre os dois diagramas e atualize as models no disco para refletir as alterações feitas pelo usuário no diagrama editado. Isso pode incluir:
- Adicionar novos campos às models existentes
- Remover campos das models
- Modificar tipos de campos
- Adicionar novas models${moduleName ? ` (no módulo "${moduleName}")` : ''}
- Remover models
- Adicionar/modificar relacionamentos entre models
- Modificar chaves primárias ou estrangeiras

IMPORTANTE: 
- Execute TODAS as funções necessárias para aplicar essas alterações, incluindo criar/atualizar models, criar migrations, executar migrations, atualizar CRUDs, menus e permissões
- ${moduleName ? `Novas models devem ser criadas no módulo "${moduleName}"` : 'Novas models devem incluir o parâmetro module'}
- Migrations e seeders serão criados automaticamente no módulo correto quando você usar createModel com o parâmetro module`;
    }
    
    // Disparar evento customizado para enviar mensagem diretamente ao ChatIA
    window.dispatchEvent(new CustomEvent('send-chat-ia-message', {
      detail: { message }
    }));
    
    // Abrir ChatIA também
    window.dispatchEvent(new CustomEvent('open-chat-ia'));
    
    $q.notify({
      color: 'positive',
      message: originalMermaidCode.value ? 
        'Mensagem enviada para o Chat IA! Verifique o Chat IA para acompanhar a execução.' :
        'Novo diagrama enviado para o Chat IA! Verifique o Chat IA para acompanhar a criação das models.',
      icon: 'check',
      timeout: 5000,
      position: 'top'
    });
    
  } catch (err) {
    console.error('Erro ao executar com IA:', err);
    $q.notify({
      color: 'negative',
      message: 'Erro ao preparar mensagem para IA: ' + (err.message || 'Erro desconhecido'),
      icon: 'error'
    });
  } finally {
    executingAI.value = false;
  }
}

// Observar mudança no splitter para atualizar layout do editor
watch(splitterModel, () => {
  nextTick(() => {
    if (monacoEditor) {
      monacoEditor.layout();
    }
  });
});

onMounted(async () => {
  // Carregar módulos primeiro
  await loadModules();
  
  // Verificar se há parâmetro de módulo na query string
  if (route.query.module) {
    selectedModule.value = route.query.module;
  }
  
  // Aguardar o próximo tick para garantir que o DOM está renderizado
  await nextTick();
  
  // Aguardar um pouco mais para garantir que os containers estão disponíveis
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Se houver módulo selecionado via query, aplicar filtro antes de carregar
  if (selectedModule.value) {
    // Aguardar um pouco mais para garantir que os módulos foram carregados
    await nextTick();
  }
  
  // Verificar se há versão em edição no localStorage
  const savedCode = loadFromLocalStorage();
  let useSaved = false;
  
  if (savedCode) {
    // Perguntar ao usuário qual versão carregar
    useSaved = await askUserToLoadVersion();
    
    if (useSaved) {
      // Carregar versão salva
      mermaidCode.value = savedCode;
      // Carregar models do disco para ter o original para comparação (sem sobrescrever código editado)
      loading.value = true;
      try {
        const response = await api.get('/api/models/mermaid/diagram');
        modelsData.value = response.data || [];
        filterModelsByModule();
        // Gerar código original apenas para comparação (não sobrescrever mermaidCode.value)
        if (modelsData.value.length > 0) {
          const dataToUse = filteredModelsData.value.length > 0 ? filteredModelsData.value : modelsData.value;
          const originalCode = generateMermaidCodeFromModels(dataToUse);
          originalMermaidCode.value = originalCode;
          localStorage.setItem(STORAGE_KEY + '_original', originalCode);
        } else {
          originalMermaidCode.value = '';
        }
      } catch (err) {
        console.error('Erro ao carregar models:', err);
      } finally {
        loading.value = false;
      }
      // Renderizar diagrama com código editado - aguardar DOM estar pronto
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));
      await renderMermaidDiagram();
    } else {
      // Carregar do disco
      await loadModels();
      // Limpar versão salva
      clearLocalStorage();
    }
  } else {
    // Não há versão salva, carregar do disco normalmente
    await loadModels();
  }
  
  // Inicializar editor após garantir que tudo foi carregado
  await nextTick();
  setTimeout(() => {
    initMonacoEditor();
    // Se houver código salvo e usuário escolheu continuar edição, garantir que está no editor
    if (savedCode && useSaved) {
      setTimeout(() => {
        if (monacoEditor && monacoEditor.getValue() !== savedCode) {
          monacoEditor.setValue(savedCode);
        }
      }, 100);
    }
  }, 200);
});

onBeforeUnmount(() => {
  // Limpar timeout se existir
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
  
  if (monacoEditor) {
    monacoEditor.dispose();
  }
});
</script>

<style scoped>
.mermaid-diagram-container {
  padding: 10px;
  background: white;
  border-radius: 4px;
}

.monaco-container {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.full-height {
  height: 100%;
}
</style>
