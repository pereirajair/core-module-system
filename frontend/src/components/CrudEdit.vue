<template>
  <q-page id="crud-edit-page">
    <PageHeader
      :title="isNew ? config.createTitle || `Novo ${config.title}` : config.editTitle || `Editar ${config.title}`"
      :icon="config.icon"
      :show-search="false"
    >
      <template v-slot:left-actions>
        <q-btn
          flat
          round
          dense
          icon="arrow_back"
          @click="goBack"
        />
      </template>
    </PageHeader>

    <q-card class="q-pa-md q-mb-md q-mt-md">
      <q-form @submit="saveItem" class="q-gutter-md">
        <!-- Renderizar com layouts se existirem -->
        <template v-if="config.layouts && config.layouts.length > 0">
          <div v-for="(layout, layoutIndex) in config.layouts" :key="layoutIndex" class="q-mb-md">
            <q-card v-if="layout.title" class="q-mb-sm" flat>
              <q-card-section class="q-pa-none">
                <div class="layout-title q-pa-sm bg-grey-2 text-subtitle2">{{ layout.title }}</div>
                <q-card-section>
                  <div v-for="(row, rowIndex) in layout.rows" :key="rowIndex" class="row q-mb-md crud-edit-row">
                    <div
                      v-for="(col, colIndex) in row.cols"
                      :key="colIndex"
                      class="col crud-edit-col"
                      :style="{ width: col.width || `${100 / row.cols.length}%` }"
                    >
                      <template v-for="field in col.fields" :key="field.name">
                        <RenderField 
                          :field="field" 
                          :form-data="formData" 
                          :file-refs="fileRefs" 
                          :select-options="selectOptions"
                          :options-map="availableRelations"
                          :loading-map="loadingRelations"
                          @file-upload="handleFileUpload"
                          @update:model-value="(payload) => formData[payload.field] = payload.value"
                        />
                      </template>
                    </div>
                  </div>
                </q-card-section>
              </q-card-section>              
            </q-card>
          </div>
        </template>
        
        <!-- Renderizar fields diretamente se não houver layouts -->
        <template v-else>
          <!-- Campos de cor em linha (Manter compatibilidade ou usar RenderField separado) -->
          <!-- Para garantir que funciona, vamos usar um v-for simples com div wrapper -->
          <div v-for="field in config.fields" :key="field.name" class="col-12 q-mb-md">
            <!-- Caso especial: inline colors (simplificado para usar renderfield, se precisar de layout inline, usar config.layout) -->
             <RenderField
                :field="field"
                :form-data="formData"
                :file-refs="fileRefs"
                :select-options="selectOptions"
                :options-map="availableRelations"
                :loading-map="loadingRelations"
                @file-upload="handleFileUpload"
                @update:model-value="(payload) => formData[payload.field] = payload.value"
              />
          </div>
        </template>

        <!-- Renderizar relations dentro do card principal -->
        <template v-if="config.relations">
          <div v-for="(relation, index) in Array.isArray(config.relations) ? config.relations : [config.relations]" :key="index" class="q-mb-md">
            <!-- Exibir apenas se não tiver dependência, ou se tiver dependência e o campo dependente estiver preenchido, ou se já tiver valor -->
            <q-card v-if="shouldShowRelation(relation)" class="q-mb-sm" flat>
              <q-card-section class="q-pa-none">
                <div class="layout-title q-pa-sm bg-grey-2 text-subtitle2">{{ relation.label }}</div>
                <q-card-section>
                  <RenderField
                    :field="{ ...relation, name: relation.field }"
                    :form-data="formData"
                    :file-refs="fileRefs"
                    :select-options="selectOptions"
                    :options-map="availableRelations"
                    :loading-map="loadingRelations"
                    @file-upload="handleFileUpload"
                    @update:model-value="(payload) => handleRelationUpdate(payload, relation)"
                  />
                </q-card-section>
              </q-card-section>
            </q-card>
          </div>
        </template>
      </q-form>
    </q-card>

    <!-- FAB Button para Salvar -->
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn
        fab
        color="primary"
        icon="save"
        @click="saveItem"
      >
        <q-tooltip>Salvar</q-tooltip>
      </q-btn>
    </q-page-sticky>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter, useRoute } from 'vue-router';
import { api } from '../boot/axios';
import { useAuthStore } from '../stores/auth';
import PageHeader from './PageHeader.vue';
import RenderField from './RenderField.vue';

const props = defineProps({
  config: {
    type: Object,
    required: true,
  validator: (config) => {
    return config.title && config.endpoint && (config.fields || config.layouts);
  }
  }
});

const emit = defineEmits(['save', 'cancel']);

const $q = useQuasar();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const itemId = ref(null);

const isNew = computed(() => {
  const id = route.params.id;
  return !id || id === 'new' || id === undefined;
});

const formData = ref({});
const fileRefs = ref({});
const availableRelations = ref({});
const loadingRelations = ref({});
const selectOptions = ref({});

async function initializePage() {
  const id = route.params.id;
  
  // Carregar opções de selects que vêm de API primeiro (necessário para inicialização)
  await loadSelectOptions();
  
  // Inicializar ou carregar dados do formulário ANTES de carregar relações
  // Isso garante que os valores estejam no formData quando loadRelations for chamado
  if (id === 'new' || id === undefined || !id) {
    initializeForm();
  } else {
    itemId.value = id;
    await loadItem();
  }
  
  // Carregar relações disponíveis DEPOIS de carregar o item (necessário para TransferList e selects dependentes)
  if (props.config.relations) {
    await loadRelations();
  }
}

onMounted(() => {
  initializePage();
});

// Observar mudanças na rota para reinicializar quando necessário
watch(() => route.params.id, async (newId, oldId) => {
  if (newId !== oldId) {
    // Limpar dados anteriores
    formData.value = {};
    itemId.value = null;
    
    // Reinicializar página
    await initializePage();
  }
});

// Observar mudanças nos campos dependentes para recarregar relações dependentes
watch(() => formData.value, (newFormData, oldFormData) => {
  console.log('[CrudEdit] Watcher acionado - formData mudou', { newFormData, oldFormData });
  
  if (!props.config.relations) {
    console.log('[CrudEdit] Nenhuma relação configurada');
    return;
  }
  
  const relations = Array.isArray(props.config.relations) ? props.config.relations : [props.config.relations];
  console.log('[CrudEdit] Relações encontradas:', relations.map(r => ({ field: r.field, dependsOn: r.dependsOn, payloadField: r.payloadField })));
  
  relations.forEach(relation => {
    // Se a relação depende de outro campo
    if (relation.dependsOn) {
      console.log(`[CrudEdit] Processando relação ${relation.field} que depende de ${relation.dependsOn}`);
      
      // Encontrar o campo correto no formData
      // dependsOn pode ser:
      // 1. O nome do campo no formData (ex: 'state_id')
      // 2. O field de outra relação (ex: 'State')
      let dependentField = relation.dependsOn;
      
      // Verificar se dependsOn é o field de outra relação
      const dependentRelation = relations.find(r => r.field === relation.dependsOn);
      if (dependentRelation && dependentRelation.payloadField) {
        // Se for uma relação, usar o payloadField para buscar no formData
        dependentField = dependentRelation.payloadField;
        console.log(`[CrudEdit] dependsOn é uma relação, usando payloadField: ${dependentField}`);
      }
      
      const newValue = newFormData[dependentField];
      const oldValue = oldFormData?.[dependentField];
      
      console.log(`[CrudEdit] Valores do campo dependente ${dependentField}:`, { newValue, oldValue });
      
      // Se o valor do campo dependente mudou
      if (newValue !== oldValue) {
        console.log(`[CrudEdit] Campo dependente ${dependentField} mudou de ${oldValue} para ${newValue}`);
        
        // Se o novo valor está vazio, limpar as opções da relação dependente
        if (!newValue || newValue === '' || newValue === null || newValue === undefined) {
          console.log(`[CrudEdit] Valor vazio, limpando relação ${relation.field}`);
          availableRelations.value[relation.field] = [];
          // Limpar também o valor do campo dependente se houver
          if (relation.field && formData.value[relation.field]) {
            formData.value[relation.field] = null;
          }
          if (relation.payloadField && formData.value[relation.payloadField]) {
            formData.value[relation.payloadField] = null;
          }
        } else {
          // Se o valor mudou (não está vazio), limpar o campo dependente antes de carregar
          // Isso garante que quando selecionar um País, o Estado seja limpo
          console.log(`[CrudEdit] Campo dependente ${dependentField} mudou, limpando relação ${relation.field} antes de recarregar`);
          if (relation.field && formData.value[relation.field]) {
            formData.value[relation.field] = null;
          }
          if (relation.payloadField && formData.value[relation.payloadField]) {
            formData.value[relation.payloadField] = null;
          }
          
          // Carregar a relação dependente com o filtro (sem selecionar automaticamente)
          console.log(`[CrudEdit] Carregando relação ${relation.field} com filtro ${dependentField}=${newValue}`);
          loadRelation(relation, newValue);
        }
      } else {
        console.log(`[CrudEdit] Campo dependente ${dependentField} não mudou (${newValue} === ${oldValue})`);
        // Mesmo que não tenha mudado, se o valor existe e a relação ainda não foi carregada, carregar
        if (newValue && newValue !== '' && newValue !== null && newValue !== undefined) {
          const hasOptions = availableRelations.value[relation.field] && availableRelations.value[relation.field].length > 0;
          const isLoading = loadingRelations.value[relation.field];
          if (!hasOptions && !isLoading) {
            console.log(`[CrudEdit] Campo dependente ${dependentField} tem valor mas relação ${relation.field} não foi carregada, carregando agora`);
            loadRelation(relation, newValue);
          } else if (hasOptions) {
            console.log(`[CrudEdit] Relação ${relation.field} já foi carregada com ${availableRelations.value[relation.field].length} itens`);
          } else if (isLoading) {
            console.log(`[CrudEdit] Relação ${relation.field} já está sendo carregada`);
          }
        }
      }
    }
  });
}, { deep: true });

// Função para obter o campo dependente de uma relação
function getDependentField(relation) {
  if (!relation.dependsOn) {
    console.log(`[CrudEdit] getDependentField: relação ${relation.field} não tem dependsOn`);
    return null;
  }
  
  const relations = Array.isArray(props.config.relations) ? props.config.relations : [props.config.relations];
  let dependentField = relation.dependsOn;
  const dependentRelation = relations.find(r => r.field === relation.dependsOn);
  if (dependentRelation && dependentRelation.payloadField) {
    dependentField = dependentRelation.payloadField;
    console.log(`[CrudEdit] getDependentField: dependsOn é uma relação, usando payloadField: ${dependentField}`);
  } else {
    console.log(`[CrudEdit] getDependentField: usando dependsOn diretamente: ${dependentField}`);
  }
  return dependentField;
}

// Função para verificar se deve exibir uma relação
function shouldShowRelation(relation) {
  // Se não tem dependência, sempre exibir
  if (!relation.dependsOn) {
    console.log(`[CrudEdit] shouldShowRelation: relação ${relation.field} não tem dependência, exibindo`);
    return true;
  }
  
  // Se tem dependência, verificar se o campo dependente está preenchido
  const dependentField = getDependentField(relation);
  if (!dependentField) {
    console.log(`[CrudEdit] shouldShowRelation: não encontrou campo dependente para ${relation.field}, exibindo`);
    return true;
  }
  
  const dependentValue = formData.value[dependentField];
  
  // Exibir se:
  // 1. O campo dependente está preenchido, OU
  // 2. A relação já tem um valor no field (ex: 'Country'), OU
  // 3. A relação já tem um valor no payloadField (ex: 'country_id') - editando um registro existente
  const hasDependentValue = dependentValue && dependentValue !== '' && dependentValue !== null && dependentValue !== undefined;
  const hasRelationFieldValue = formData.value[relation.field] && formData.value[relation.field] !== null && formData.value[relation.field] !== undefined && formData.value[relation.field] !== '';
  const hasRelationPayloadValue = relation.payloadField && formData.value[relation.payloadField] && formData.value[relation.payloadField] !== null && formData.value[relation.payloadField] !== undefined && formData.value[relation.payloadField] !== '';
  
  const shouldShow = hasDependentValue || hasRelationFieldValue || hasRelationPayloadValue;
  console.log(`[CrudEdit] shouldShowRelation: relação ${relation.field}`, {
    dependentField,
    dependentValue,
    hasDependentValue,
    hasRelationFieldValue,
    hasRelationPayloadValue,
    shouldShow
  });
  
  return shouldShow;
}

// Função para lidar com atualizações de relações
function handleRelationUpdate(payload, relation) {
  console.log(`[CrudEdit] handleRelationUpdate: campo ${payload.field} atualizado para ${payload.value}`, { payload, relation });
  
  // Atualizar o campo da relação (ex: 'State')
  const oldValue = formData.value[payload.field];
  formData.value[payload.field] = payload.value;
  
  // Se a relação tem payloadField, também atualizar esse campo (ex: 'state_id')
  // Isso é importante para que o watcher detecte a mudança
  if (relation.payloadField && relation.payloadField !== payload.field) {
    const oldPayloadValue = formData.value[relation.payloadField];
    console.log(`[CrudEdit] handleRelationUpdate: também atualizando payloadField ${relation.payloadField} de ${oldPayloadValue} para ${payload.value}`);
    formData.value[relation.payloadField] = payload.value;
    
    // Se o payloadField mudou, verificar se há relações dependentes que precisam ser recarregadas
    if (oldPayloadValue !== payload.value && props.config.relations) {
      const relations = Array.isArray(props.config.relations) ? props.config.relations : [props.config.relations];
      relations.forEach(dependentRelation => {
        if (dependentRelation.dependsOn === relation.payloadField || dependentRelation.dependsOn === relation.field) {
          console.log(`[CrudEdit] handleRelationUpdate: relação ${dependentRelation.field} depende de ${relation.payloadField}, recarregando`);
          
          // Se o valor foi limpo (null/undefined/vazio), limpar também as relações dependentes
          if (!payload.value || payload.value === '' || payload.value === null || payload.value === undefined) {
            console.log(`[CrudEdit] handleRelationUpdate: valor limpo, limpando relação dependente ${dependentRelation.field}`);
            availableRelations.value[dependentRelation.field] = [];
            // Limpar o campo da relação dependente
            if (dependentRelation.field && formData.value[dependentRelation.field]) {
              formData.value[dependentRelation.field] = null;
            }
            if (dependentRelation.payloadField && formData.value[dependentRelation.payloadField]) {
              formData.value[dependentRelation.payloadField] = null;
            }
          } else {
            // Se tem valor, recarregar a relação dependente (mas não selecionar automaticamente)
            loadRelation(dependentRelation, payload.value);
          }
        }
      });
    }
  }
  
  // Se esta relação tem dependência e foi alterada, pode afetar outras relações
  // (não precisa fazer nada aqui, o watcher já cuida disso)
}

function initializeForm() {
  // Criar objeto inicial com todos os campos
  const initialData = {};
  
  // Coletar campos de layouts ou fields diretos
  let fieldsToProcess = [];
  if (props.config.layouts && props.config.layouts.length > 0) {
    props.config.layouts.forEach(layout => {
      layout.rows.forEach(row => {
        row.cols.forEach(col => {
          col.fields.forEach(field => {
            fieldsToProcess.push(field);
          });
        });
      });
    });
  } else if (props.config.fields) {
    fieldsToProcess = props.config.fields;
  }
  
  fieldsToProcess.forEach(field => {
    initialData[field.name] = field.default !== undefined ? field.default : '';
    if (field.type === 'file') {
      if (!fileRefs.value[field.name]) {
        fileRefs.value[field.name] = null;
      }
    }
  });
  
  // Inicializar relações vazias se existirem
  if (props.config.relations) {
    const relations = Array.isArray(props.config.relations) ? props.config.relations : [props.config.relations];
    relations.forEach(relation => {
      // Inicializar array para relações hasMany ou belongsToMany
      if (relation.type !== 'select') {
        initialData[relation.field] = [];
      } else {
         initialData[relation.field] = null;
      }
    });
  }
  
  // Atualizar formData de uma vez para garantir reatividade
  formData.value = { ...initialData };
}

function handleFileUpload(field, file) {
  if (file && field.type === 'file') {
    const reader = new FileReader();
    reader.onload = (e) => {
      formData.value[field.name] = e.target.result;
      if (field.onUpload) {
        field.onUpload(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  }
}

async function loadItem() {
  try {
    const loadEndpoint = typeof props.config.loadItemEndpoint === 'function'
      ? props.config.loadItemEndpoint(itemId.value)
      : `${props.config.endpoint}/${itemId.value}`;
    
    // id_organization é obtido automaticamente do token, não precisa enviar como query param
    const response = await api.get(loadEndpoint);
    const data = response.data;
    
    // Coletar campos de layouts ou fields diretos
    let fieldsToProcess = [];
    if (props.config.layouts && props.config.layouts.length > 0) {
      props.config.layouts.forEach(layout => {
        layout.rows.forEach(row => {
          row.cols.forEach(col => {
            col.fields.forEach(field => {
              fieldsToProcess.push(field);
            });
          });
        });
      });
    } else if (props.config.fields) {
      fieldsToProcess = props.config.fields;
    }
    
    fieldsToProcess.forEach(field => {
      const value = data[field.name];
      formData.value[field.name] = value !== undefined && value !== null ? value : (field.default !== undefined ? field.default : '');
    });
    
    // Carregar dados das relações para o formData
    if (props.config.relations) {
      const relations = Array.isArray(props.config.relations) ? props.config.relations : [props.config.relations];
      relations.forEach(relation => {
        const value = data[relation.field];
        
        if (relation.type === 'select') {
           // Para select (belongsTo) - valor único (ID ou Objeto, se objeto pegar ID)
           // Se for objeto, pegar itemValue, senão usar o valor direto
           const itemValue = relation.itemValue || 'id';
           const relationValue = (value && typeof value === 'object') ? value[itemValue] : value;
           formData.value[relation.field] = relationValue;
           
           // Também preencher o payloadField se for diferente do field
           // Isso é importante para que os campos dependentes funcionem corretamente
           if (relation.payloadField && relation.payloadField !== relation.field) {
             // Se o payloadField já existe nos dados (ex: country_id direto), usar ele
             // Senão, usar o valor da relação
             const payloadValue = data[relation.payloadField] !== undefined ? data[relation.payloadField] : relationValue;
             formData.value[relation.payloadField] = payloadValue;
             console.log(`[CrudEdit] loadItem: preenchendo ${relation.payloadField} com valor ${payloadValue} para relação ${relation.field}`);
           }
        } else {
           // Para outros (listas), garantir array
           formData.value[relation.field] = Array.isArray(value) ? value : [];
        }
      });
    }
    
    console.log('[CrudEdit] loadItem: formData após carregar item:', formData.value);
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || `Erro ao carregar ${props.config.title.toLowerCase()}`,
      icon: 'warning'
    });
    goBack();
  }
}

async function loadSelectOptions() {
  // Verificar se fields existe e é um array
  if (!props.config.fields || !Array.isArray(props.config.fields)) {
    return;
  }
  
  const selectFields = props.config.fields.filter(field => field.type === 'select' && field.optionsEndpoint);
  
  for (const field of selectFields) {
    try {
      // id_organization é obtido automaticamente do token, não precisa enviar como query param
      const response = await api.get(field.optionsEndpoint);
      let data = response.data;
      
      // O backend agora retorna { data: [...], count: ..., page: ..., limit: ..., totalPages: ... }
      // ou um array direto (compatibilidade)
      if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        // Formato com paginação - extrair o array data
        data = data.data;
      } else if (!Array.isArray(data)) {
        // Se não for array nem objeto com data, usar array vazio
        data = [];
      }
      
      selectOptions.value[field.name] = field.transformOptions 
        ? field.transformOptions(data) 
        : data;
    } catch (error) {
      console.error(`Error loading options for ${field.name}:`, error);
      selectOptions.value[field.name] = [];
    }
  }
}

async function loadRelations() {
  const relations = Array.isArray(props.config.relations) ? props.config.relations : [props.config.relations];
  
  for (const relation of relations) {
    // Para relações inline/sub-crud (hasMany), não precisa carregar lista de disponíveis
    if (relation.type === 'inline' || relation.type === 'sub-crud') {
      continue;
    }
    
    // Se a relação depende de outro campo, não carregar agora (será carregada quando o campo dependente mudar)
    if (relation.dependsOn) {
      // Limpar opções anteriores e aguardar seleção do campo dependente
      availableRelations.value[relation.field] = [];
      
      // Encontrar o campo correto no formData
      // dependsOn pode ser o nome do campo (ex: 'state_id') ou o field de outra relação (ex: 'State')
      let dependentField = relation.dependsOn;
      const dependentRelation = relations.find(r => r.field === relation.dependsOn);
      if (dependentRelation && dependentRelation.payloadField) {
        // Se for uma relação, usar o payloadField para buscar no formData
        dependentField = dependentRelation.payloadField;
      }
      
      // Se já houver valor no campo dependente, carregar imediatamente
      // Também verificar se a relação já tem valor (editando um registro existente)
      const dependentValue = formData.value[dependentField];
      const relationValue = formData.value[relation.field] || formData.value[relation.payloadField];
      
      if (dependentValue) {
        console.log(`[CrudEdit] loadRelations: relação ${relation.field} depende de ${dependentField} que tem valor ${dependentValue}, carregando`);
        await loadRelation(relation, dependentValue);
      } else if (relationValue) {
        // Se não tem valor no campo dependente mas a relação tem valor, tentar carregar
        // Isso pode acontecer quando editando um registro que já tem os valores
        console.log(`[CrudEdit] loadRelations: relação ${relation.field} tem valor ${relationValue} mas campo dependente ${dependentField} não tem valor, tentando carregar sem filtro`);
        // Não passar filterValue para carregar todas as opções (pode ser necessário para exibir o valor atual)
        await loadRelation(relation);
      }
      continue;
    }
    
    await loadRelation(relation);
  }
}

async function loadRelation(relation, filterValue = null) {
  console.log(`[CrudEdit] loadRelation chamado para ${relation.field}`, { relation, filterValue });
  
  // Para relações inline/sub-crud (hasMany), não precisa carregar lista de disponíveis
  if (relation.type === 'inline' || relation.type === 'sub-crud') {
    console.log(`[CrudEdit] loadRelation: relação ${relation.field} é inline/sub-crud, ignorando`);
    return;
  }
  
  loadingRelations.value[relation.field] = true;
  try {
    // Construir parâmetros da requisição
    const params = {};
    
    // Adicionar ordenação pelo campo que está sendo exibido (itemLabel)
    // Isso garante que os itens apareçam ordenados alfabeticamente
    const sortField = relation.itemLabel || 'name';
    params.sortBy = sortField;
    params.desc = 'false'; // Sempre ordenar em ordem crescente (A-Z)
    
    // Se a relação tem dependência e foi passado um valor de filtro, adicionar ao params
    if (relation.dependsOn && filterValue !== null && filterValue !== undefined && filterValue !== '') {
      const filterParam = relation.filterParam || relation.dependsOn;
      params[filterParam] = filterValue;
      console.log(`[CrudEdit] loadRelation: adicionando filtro ${filterParam}=${filterValue}`);
    }
    
    // Se não tem valor de filtro mas tem dependência, verificar se há valor na relação (editando)
    if (relation.dependsOn && (filterValue === null || filterValue === undefined || filterValue === '')) {
      // Se a relação já tem um valor (editando), carregar todas as opções para permitir exibir o valor atual
      const relationValue = formData.value[relation.field] || formData.value[relation.payloadField];
      if (relationValue) {
        console.log(`[CrudEdit] loadRelation: relação ${relation.field} tem dependência mas sem filtro, mas tem valor ${relationValue} (editando), carregando todas as opções`);
        // Não aplicar filtro, carregar todas as opções para permitir exibir o valor atual
        // Isso pode não ser ideal para performance, mas necessário para exibir valores ao editar
      } else {
        console.log(`[CrudEdit] loadRelation: relação ${relation.field} tem dependência mas sem valor de filtro e sem valor na relação, limpando`);
        availableRelations.value[relation.field] = [];
        loadingRelations.value[relation.field] = false;
        return;
      }
    }
    
    console.log(`[CrudEdit] loadRelation: fazendo requisição para ${relation.endpoint} com params:`, params);
    // id_organization é obtido automaticamente do token, não precisa enviar como query param
    const response = await api.get(relation.endpoint, { params });
    let data = response.data;
    console.log(`[CrudEdit] loadRelation: resposta recebida para ${relation.field}:`, data);
    
    // O backend agora retorna { data: [...], count: ..., page: ..., limit: ..., totalPages: ... }
    // ou um array direto (compatibilidade)
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
      // Formato com paginação - extrair o array data
      data = data.data;
    } else if (!Array.isArray(data)) {
      // Se não for array nem objeto com data, usar array vazio
      data = [];
    }
    
    availableRelations.value[relation.field] = data;
    console.log(`[CrudEdit] loadRelation: ${relation.field} carregado com ${data.length} itens`);
  } catch (error) {
    console.error(`[CrudEdit] loadRelation: erro ao carregar ${relation.field}:`, error);
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || `Erro ao carregar ${relation.label.toLowerCase()}`,
      icon: 'warning'
    });
    availableRelations.value[relation.field] = [];
  } finally {
    loadingRelations.value[relation.field] = false;
  }
}

function goBack() {
  emit('cancel');
  router.push(props.config.listRoute || '/');
}

async function saveItem() {
  try {
    const payload = { ...formData.value };
    
    // Coletar todos os campos de layouts ou fields diretos
    let allFields = [];
    if (props.config.layouts && props.config.layouts.length > 0) {
      props.config.layouts.forEach(layout => {
        layout.rows.forEach(row => {
          row.cols.forEach(col => {
            col.fields.forEach(field => {
              allFields.push(field);
            });
          });
        });
      });
    } else if (props.config.fields) {
      allFields = props.config.fields;
    }
    
    // Remover campos vazios que não devem ser enviados
    Object.keys(payload).forEach(key => {
      if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
        const field = allFields.find(f => f.name === key);
        if (field && field.skipIfEmpty) {
          delete payload[key];
        }
      }
    });
    
    // Processar campos relacionais no payload
    if (props.config.relations) {
      const relations = Array.isArray(props.config.relations) ? props.config.relations : [props.config.relations];
      relations.forEach(relation => {
        if (relation.type === 'inline' || relation.type === 'sub-crud') {
          // Já está no payload correto (array de objetos)
          if (relation.payloadField && relation.payloadField !== relation.field) {
             payload[relation.payloadField] = payload[relation.field];
             delete payload[relation.field];
          }
        } else if (relation.type === 'select') {
           // Já está no payload (ID)
           if (relation.payloadField && relation.payloadField !== relation.field) {
             payload[relation.payloadField] = payload[relation.field];
             delete payload[relation.field];
          }
        } else {
          // Para transfer e multiselect (belongsToMany), enviar apenas IDs
          const items = payload[relation.field] || [];
          const relationIds = items.map(item => 
            typeof item === 'object' ? item[relation.itemValue || 'id'] : item
          );
          
          // Usar payloadField se definido, ou sufixo Ids
          const targetField = relation.payloadField || `${relation.field}Ids`;
          payload[targetField] = relationIds;
          
          // Remover campo original se nome for diferente (evitar envio duplicado ou incorreto)
          if (targetField !== relation.field) {
              delete payload[relation.field];
          }
        }
      });
    }

    if (isNew.value) {
      await api.post(props.config.endpoint, payload);
      $q.notify({
        color: 'positive',
        message: props.config.createSuccessMessage || `${props.config.title} criado com sucesso!`,
        icon: 'check'
      });
    } else {
      await api.put(`${props.config.endpoint}/${itemId.value}`, payload);
      
      // Atualizar relações separadamente se necessário (apenas para transfer/multiselect)
      // OBS: Se o backend suportar updateHasManyAssociations (nossa implementação recente),
      // isso pode ser redundante, mas mantemos para compatibilidade com endpoints antigos.
      if (props.config.relations) {
        const relations = Array.isArray(props.config.relations) ? props.config.relations : [props.config.relations];
        for (const relation of relations) {
          // Relações inline/sub-crud são enviadas no payload principal
          if (relation.type === 'inline' || relation.type === 'sub-crud') {
            continue;
          }
          
          if (relation.updateEndpoint) {
            const items = formData.value[relation.field] || [];
            const relationIds = items.map(item => 
              typeof item === 'object' ? item[relation.itemValue || 'id'] : item
            );
            await api.put(`${props.config.endpoint}/${itemId.value}/${relation.updateEndpoint}`, {
              [relation.payloadField || `${relation.field}Ids`]: relationIds
            });
          }
        }
      }
      
      $q.notify({
        color: 'positive',
        message: props.config.updateSuccessMessage || `${props.config.title} atualizado com sucesso!`,
        icon: 'check'
      });
    }
    
    emit('save', payload);
    goBack();
  } catch (error) {
    console.error('Erro ao salvar:', error);
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error?.message ||
                        error.message ||
                        `Erro ao salvar ${props.config.title.toLowerCase()}`;
    
    // Se houver erros de validação, mostrar detalhes
    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const validationErrors = error.response.data.errors
        .map(err => err.message || err.msg || `${err.path}: ${err.message}`)
        .join(', ');
      $q.notify({
        color: 'negative',
        message: `Erro de validação: ${validationErrors}`,
        icon: 'warning',
        timeout: 5000
      });
    } else {
      $q.notify({
        color: 'negative',
        message: errorMessage,
        icon: 'warning'
      });
    }
  }
}
</script>

<style scoped>
/* Corrigir problema de margin-left do q-gutter que quebra as colunas */
.crud-edit-row {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.crud-edit-row > .crud-edit-col {
  margin-left: 0 !important;
  padding-left: 8px;
  padding-right: 8px;
}

.crud-edit-row > .crud-edit-col:first-child {
  padding-left: 0;
}

.crud-edit-row > .crud-edit-col:last-child {
  padding-right: 0;
}

/* Estilo do título do layout */
.layout-title {
  background-color: #f5f5f5;
  font-size: 0.875rem;
  font-weight: 500;
  color: #424242;
}
</style>

<style>
/* CSS global com máxima especificidade para sobrescrever Quasar */
/* Usar ID para garantir especificidade máxima */
#crud-edit-page .crud-edit-row .q-gutter-x-xs > *,
#crud-edit-page .crud-edit-row .q-gutter-xs > *,
#crud-edit-page .crud-edit-col .q-gutter-x-xs > *,
#crud-edit-page .crud-edit-col .q-gutter-xs > * {
  margin-left: 0 !important;
}

#crud-edit-page .crud-edit-row .q-gutter-x-xs,
#crud-edit-page .crud-edit-row .q-gutter-xs,
#crud-edit-page .crud-edit-col .q-gutter-x-xs,
#crud-edit-page .crud-edit-col .q-gutter-xs {
  margin-left: 0 !important;
}

/* Aplicar também para elementos filhos diretos com maior especificidade */
#crud-edit-page .crud-edit-col > .q-gutter-x-xs > *,
#crud-edit-page .crud-edit-col > .q-gutter-xs > *,
#crud-edit-page .crud-edit-row > .crud-edit-col .q-gutter-x-xs > *,
#crud-edit-page .crud-edit-row > .crud-edit-col .q-gutter-xs > * {
  margin-left: 0 !important;
}

/* Forçar remoção mesmo em elementos profundamente aninhados */
#crud-edit-page .crud-edit-row * .q-gutter-x-xs > *,
#crud-edit-page .crud-edit-row * .q-gutter-xs > *,
#crud-edit-page .crud-edit-col * .q-gutter-x-xs > *,
#crud-edit-page .crud-edit-col * .q-gutter-xs > * {
  margin-left: 0 !important;
}

/* Seletores ainda mais específicos incluindo q-page */
.q-page#crud-edit-page .crud-edit-row .q-gutter-x-xs > *,
.q-page#crud-edit-page .crud-edit-row .q-gutter-xs > *,
.q-page#crud-edit-page .crud-edit-col .q-gutter-x-xs > *,
.q-page#crud-edit-page .crud-edit-col .q-gutter-xs > * {
  margin-left: 0 !important;
}
</style>

