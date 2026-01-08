<template>
  <q-page class="model-edit-page">
    <!-- Card Principal que contém tudo -->
    <q-card flat bordered class="q-mb-md model-main-card">
      <!-- Card Header com ícone e título -->
      <q-card-section class="q-pa-sm model-header-section">
        <div class="row items-center justify-between">
          <div class="row items-center">
            <q-icon 
              :name="isNewModel ? 'add_box' : 'edit_note'" 
              size="md" 
              :color="isNewModel ? 'primary' : 'secondary'"
              class="q-mr-sm"
            />
            <div class="text-h6 text-weight-medium">
              {{ isNewModel ? 'Nova Model' : `${modelName}` }}
            </div>
          </div>
          <!-- Ações Terciárias (menu com ...) -->
          <q-btn
            v-if="!isNewModel && !isSystemModel"
            flat
            round
            dense
            icon="more_vert"
          >
            <q-menu>
              <q-list style="min-width: 200px">
                <q-item-label header>Geração</q-item-label>
                <q-item clickable v-close-popup @click="generateMigration">
                  <q-item-section avatar>
                    <q-icon name="file_download" color="secondary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Gerar Migration</q-item-label>
                    <q-item-label caption>Criar migration para esta model</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="showSeederDialog = true">
                  <q-item-section avatar>
                    <q-icon name="file_download" color="info" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Gerar Seeder</q-item-label>
                    <q-item-label caption>Criar seeder para esta model</q-item-label>
                  </q-item-section>
                </q-item>
                
                <q-separator />
                
                <q-item-label header>Ações</q-item-label>
                <q-item clickable v-close-popup @click="confirmDeleteModel">
                  <q-item-section avatar>
                    <q-icon name="delete" color="negative" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Excluir Model</q-item-label>
                    <q-item-label caption>Remover permanentemente</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </q-card-section>
      
      <q-separator />
      
      <!-- Conteúdo Principal dentro do card -->
      <q-card-section class="q-pa-sm">
        <div class="row q-gutter-sm model-content-row">
          <!-- Conteúdo Principal -->
          <div class="col-12 col-md-9 model-content-col">
            <!-- Informações Básicas -->
            <q-card flat bordered class="q-mb-sm section-card">
            <q-card-section class="section-header">
              <div class="row items-center">
                <q-icon name="info" size="sm" class="q-mr-sm" color="primary" />
                <div class="text-subtitle1 text-weight-medium">Informações Básicas</div>
              </div>
            </q-card-section>
            <q-card-section class="section-body">
              <div class="row q-gutter-md" style="margin-left: 0; margin-right: 0;">
                <!-- Módulo e Nome da Model na mesma linha -->
                  <q-select
                    v-model="selectedModule"
                    label="Módulo"
                    outlined
                    dense
                    :options="availableModules"
                    option-label="title"
                    option-value="name"
                    emit-value
                    map-options
                    class="col-6"
                    :hint="isNewModel ? 'Selecione o módulo onde a model será criada' : 'Módulo onde a model está localizada (somente leitura)'"
                    :disable="!isNewModel || isSystemModel"
                    :readonly="!isNewModel || isSystemModel"
                  >
                    <template v-slot:prepend>
                      <q-icon name="folder" />
                    </template>
                  </q-select>
                  <q-input
                    v-model="modelData.name"
                    label="Nome da Model (arquivo)"
                    outlined
                    dense
                    class="col-6" 
                    :disable="!isNewModel || isSystemModel"
                    :readonly="!isNewModel || isSystemModel"
                    :rules="[val => !!val || 'Nome é obrigatório', val => /^[a-z][a-z0-9_]*$/.test(val) || 'Apenas letras minúsculas, números e underscore']"
                  />
                <!-- Nome da Classe sempre visível -->
                <q-input
                  v-model="modelData.className"
                  label="Nome da Classe"
                  outlined
                  dense
                  class='col-6' 
                  :disable="isSystemModel"
                  :rules="[val => !!val || 'Nome da classe é obrigatório']"
                />
                <!-- Nome da Tabela apenas se preenchido -->
                <q-input
                  v-model="modelData.options.tableName"
                  label="Nome da Tabela"
                  outlined
                  dense
                  class="col-6"
                  :disable="isSystemModel"
                />
              </div>
            </q-card-section>
          </q-card>

          <!-- Campos -->
          <q-card flat bordered class="q-mb-sm section-card fields-card">
            <q-card-section class="section-header">
              <div class="row items-center justify-between">
                <div class="row items-center">
                  <q-icon name="view_column" size="sm" class="q-mr-sm" color="secondary" />
                  <div class="text-subtitle1 text-weight-medium">Campos</div>
                </div>
                <q-btn
                  color="secondary"
                  icon="add"
                  label="Adicionar Campo"
                  @click="addField"
                  size="sm"
                  unelevated
                  :disable="isSystemModel"
                />
              </div>
            </q-card-section>
            <q-card-section class="q-pa-none">
              <q-table
                :rows="fieldsWithReferences"
                :columns="fieldColumns"
                row-key="__index"
                :pagination="{ rowsPerPage: 20 }"
                hide-bottom
                flat
                class="fields-table"
              >
                <template v-slot:body-cell-name="props">
                  <q-td :props="props" class="q-pa-xs">
                    <q-input
                      v-if="props.row.__fieldRef.name !== 'id' && !isSystemModel"
                      :model-value="props.row.__fieldRef.name"
                      @update:model-value="(val) => props.row.__fieldRef.name = val"
                      outlined
                      dense
                      class="q-ma-none"
                    />
                    <span v-else>{{ props.row.__fieldRef.name }}</span>
                  </q-td>
                </template>
                <template v-slot:body-cell-type="props">
                  <q-td :props="props" class="q-pa-xs">
                    <q-select
                      v-if="props.row.__fieldRef.name !== 'id' && !isSystemModel"
                      :model-value="props.row.__fieldRef.type"
                      @update:model-value="(val) => props.row.__fieldRef.type = val"
                      :options="fieldTypes"
                      outlined
                      dense
                      emit-value
                      map-options
                      class="q-ma-none"
                    />
                    <span v-else>{{ props.row.__fieldRef.type }}</span>
                  </q-td>
                </template>
                <template v-slot:body-cell-primaryKey="props">
                  <q-td :props="props" class="q-pa-xs">
                    <q-checkbox 
                      :model-value="props.row.__fieldRef.primaryKey"
                      @update:model-value="(val) => props.row.__fieldRef.primaryKey = val"
                      :disable="props.row.__fieldRef.name === 'id' || isSystemModel"
                    />
                  </q-td>
                </template>
                <template v-slot:body-cell-autoIncrement="props">
                  <q-td :props="props" class="q-pa-xs">
                    <q-checkbox 
                      :model-value="props.row.__fieldRef.autoIncrement"
                      @update:model-value="(val) => props.row.__fieldRef.autoIncrement = val"
                      :disable="props.row.__fieldRef.name === 'id' || isSystemModel"
                    />
                  </q-td>
                </template>
                <template v-slot:body-cell-allowNull="props">
                  <q-td :props="props" class="q-pa-xs">
                    <q-checkbox 
                      :model-value="props.row.__fieldRef.allowNull"
                      @update:model-value="(val) => props.row.__fieldRef.allowNull = val"
                      :disable="props.row.__fieldRef.name === 'id' || isSystemModel"
                    />
                  </q-td>
                </template>
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props" class="q-pa-xs">
                    <q-btn
                      v-if="props.row.__fieldRef.name !== 'id' && !isSystemModel"
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      size="sm"
                      @click="removeFieldByIndex(props.row.__index)"
                    />
                  </q-td>
                </template>
              </q-table>
            </q-card-section>
          </q-card>
          </div>

          <!-- Sidebar de Relações -->
          <div class="col-12 col-md-3 model-relations-col">
            <q-card flat bordered class="section-card model-relations-card">
              <q-card-section class="section-header">
            <div class="row items-center justify-between">
              <div class="row items-center">
                <q-icon name="share" size="sm" class="q-mr-sm" color="accent" />
                <div class="text-subtitle1 text-weight-medium">Relações</div>
              </div>
              <q-btn
                color="accent"
                icon="add"
                round
                dense
                unelevated
                @click="showAddAssociationDialog = true"
              />
            </div>
          </q-card-section>
          <q-card-section style="flex: 1; overflow: hidden; padding: 0;">

          <q-scroll-area style="flex: 1; height: 100%;">
            <div class="q-pa-sm">
              <q-card
                v-for="(assoc, index) in modelData.associations"
                :key="index"
                flat
                bordered
                class="q-mb-sm relation-card"
              >
                <q-card-section class="q-pa-sm">
                  <div class="row items-center justify-between">
                    <div class="col">
                      <div class="text-subtitle2 q-mb-xs">
                        <q-chip
                          :color="getAssociationTypeColor(assoc.type)"
                          text-color="white"
                          dense
                          size="sm"
                          class="q-mr-sm"
                        >
                          {{ assoc.type }}
                        </q-chip>
                        <strong>{{ modelData.className }}</strong>
                        <q-icon name="arrow_forward" size="sm" class="q-mx-xs" />
                        <strong>{{ assoc.target }}</strong>
                      </div>
                      <div class="text-caption text-grey-7 q-mt-xs">
                        <div><strong>Foreign Key:</strong> {{ assoc.foreignKey || 'N/A' }}</div>
                        <div v-if="assoc.through"><strong>Through:</strong> {{ assoc.through }}</div>
                        <div v-if="assoc.otherKey"><strong>Other Key:</strong> {{ assoc.otherKey }}</div>
                      </div>
                    </div>
                    <div class="col-auto">
                      <q-btn
                        flat
                        round
                        dense
                        icon="delete"
                        color="negative"
                        size="sm"
                        :disable="isSystemModel"
                        @click="removeAssociation(index)"
                      />
                    </div>
                  </div>
                </q-card-section>
              </q-card>
              <q-card
                v-if="modelData.associations.length === 0"
                flat
                bordered
                class="text-center q-pa-sm"
              >
                <q-icon name="link_off" size="48px" color="grey-5" />
                <div class="text-body2 text-grey-6 q-mt-sm">Nenhuma relação definida</div>
              </q-card>
            </div>
          </q-scroll-area>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- FAB Button - Ação Principal -->
    <q-page-sticky v-if="!isSystemModel" position="bottom-right" :offset="[18, 18]">
      <q-btn
        fab
        color="primary"
        icon="save"
        @click="saveModel"
        :disable="isSystemModel"
      >
        <q-tooltip>Salvar Model</q-tooltip>
      </q-btn>
    </q-page-sticky>

    <!-- FAB Button - Ação Principal -->
    <q-page-sticky v-if="!isSystemModel" position="bottom-right" :offset="[18, 18]">
      <q-btn
        fab
        color="primary"
        icon="save"
        @click="saveModel"
        :disable="isSystemModel"
      >
        <q-tooltip>Salvar Model</q-tooltip>
      </q-btn>
    </q-page-sticky>

    <!-- Dialog: Adicionar Campo -->
    <q-dialog v-model="showAddFieldDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Adicionar Campo</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="newField.name" label="Nome" outlined dense class="q-mb-sm" />
          <q-select
            v-model="newField.type"
            :options="fieldTypes"
            label="Tipo"
            outlined
            dense
          />
          <q-toggle v-model="newField.primaryKey" label="Primary Key" />
          <q-toggle v-model="newField.autoIncrement" label="Auto Increment" />
          <q-toggle v-model="newField.allowNull" label="Allow Null" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
          <q-btn flat label="Adicionar" color="primary" @click="addFieldFromDialog" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Adicionar Relação -->
    <q-dialog v-model="showAddAssociationDialog">
      <q-card style="min-width: 600px; max-width: 700px">
        <q-card-section class="bg-accent text-white">
          <div class="row items-center">
            <q-icon name="link" size="md" class="q-mr-sm" />
            <div class="text-h6">Adicionar Relação</div>
          </div>
        </q-card-section>
        <q-card-section>
          <q-select
            v-model="newAssociation.type"
            :options="associationTypes"
            label="Tipo de Relação"
            outlined
            dense
            class="q-mb-md"
            @update:model-value="onAssociationTypeChange"
          />
          
          <!-- Explicação do tipo de relação -->
          <q-card flat bordered class="q-mb-md q-pa-sm bg-blue-1">
            <q-card-section class="q-pa-sm">
              <div class="text-body2">
                <div v-if="newAssociation.type === 'belongsTo'">
                  <strong>belongsTo:</strong> Esta model pertence a outra model. 
                  Exemplo: <code>Message.belongsTo(User)</code> - Uma mensagem pertence a um usuário.
                  A foreign key fica nesta model.
                </div>
                <div v-else-if="newAssociation.type === 'hasMany'">
                  <strong>hasMany:</strong> Esta model tem muitos registros de outra model.
                  Exemplo: <code>User.hasMany(Message)</code> - Um usuário tem muitas mensagens.
                  A foreign key fica na model alvo.
                </div>
                <div v-else-if="newAssociation.type === 'hasOne'">
                  <strong>hasOne:</strong> Esta model tem um único registro de outra model.
                  Exemplo: <code>User.hasOne(Profile)</code> - Um usuário tem um perfil.
                  A foreign key fica na model alvo.
                </div>
                <div v-else-if="newAssociation.type === 'belongsToMany'">
                  <strong>belongsToMany:</strong> Relação muitos-para-muitos através de uma tabela intermediária.
                  Exemplo: <code>User.belongsToMany(Role, { through: 'UserRoles' })</code> - Um usuário tem muitos papéis.
                  Requer uma tabela intermediária (through).
                </div>
                <div v-else class="text-grey-6">
                  Selecione um tipo de relação para ver a explicação.
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-select
            v-model="newAssociation.target"
            :options="availableModels"
            option-label="className"
            option-value="className"
            label="Model Alvo"
            outlined
            dense
            class="q-mb-md"
            @update:model-value="onTargetModelChange"
            emit-value
            map-options
          />
          <q-input
            v-model="newAssociation.foreignKey"
            label="Foreign Key"
            outlined
            dense
            class="q-mb-md"
            hint="Será preenchido automaticamente baseado no tipo de relação e model selecionada"
          />
          <q-input
            v-if="newAssociation.type === 'belongsToMany'"
            v-model="newAssociation.through"
            label="Through (Tabela Intermediária)"
            outlined
            dense
            class="q-mb-md"
            hint="Nome da tabela que conecta as duas models (ex: UserRoles)"
          />
          <q-input
            v-if="newAssociation.type === 'belongsToMany'"
            v-model="newAssociation.otherKey"
            label="Other Key"
            outlined
            dense
            class="q-mb-md"
            hint="Chave estrangeira na tabela intermediária que referencia a model alvo"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
          <q-btn unelevated color="accent" label="Adicionar" @click="addAssociationFromDialog" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Gerar Seeder -->
    <q-dialog v-model="showSeederDialog">
      <q-card style="min-width: 600px">
        <q-card-section>
          <div class="text-h6">Gerar Seeder</div>
        </q-card-section>
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Dados do Seeder (JSON Array)</div>
          <q-input
            v-model="seederData"
            type="textarea"
            outlined
            :rows="10"
            placeholder='[{"id": 1, "name": "Exemplo"}, {"id": 2, "name": "Outro"}]'
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
          <q-btn flat label="Gerar" color="primary" @click="generateSeeder" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api } from '../boot/axios';
import { useQuasar } from 'quasar';
import PageHeader from '../components/PageHeader.vue';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();

const isNew = ref(false);
const modelName = ref('');
const showAddFieldDialog = ref(false);
const showAddAssociationDialog = ref(false);
const showSeederDialog = ref(false);
const seederData = ref('[]');
const availableModels = ref([]);
const availableModules = ref([]);
const selectedModule = ref(null);
const isSystemModel = ref(false);

// Função helper para obter o nome da model da rota
function getModelNameFromRoute() {
  // Tentar diferentes formas de obter o parâmetro
  const routeName = route.params.name;
  const fullPath = route.fullPath;
  const path = route.path;
  
  console.log('[getModelNameFromRoute] route.params:', route.params);
  console.log('[getModelNameFromRoute] route.fullPath:', fullPath);
  console.log('[getModelNameFromRoute] route.path:', path);
  console.log('[getModelNameFromRoute] route.matched:', route.matched);
  
  // Se tem parâmetro name, usar ele
  if (routeName) {
    return routeName;
  }
  
  // Tentar extrair da URL
  if (fullPath.includes('/new')) {
    return 'new';
  }
  
  // Tentar extrair do path
  const pathMatch = path.match(/\/admin\/models\/(.+)$/);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }
  
  return null;
}

// Computed para garantir que isNew seja reativo baseado na rota
// Sempre verifica a rota primeiro, depois o estado interno como fallback
const isNewModel = computed(() => {
  const routeName = getModelNameFromRoute();
  console.log('[isNewModel computed] routeName extraído:', routeName, 'isNew.value:', isNew.value);
  
  if (routeName === 'new') {
    console.log('[isNewModel computed] Retornando TRUE (rota é new)');
    return true;
  }
  if (routeName && routeName !== 'undefined') {
    console.log('[isNewModel computed] Retornando FALSE (rota tem nome válido)');
    return false;
  }
  console.log('[isNewModel computed] Retornando fallback:', isNew.value);
  return isNew.value; // Fallback para estado interno
});

const modelData = ref({
  name: '',
  className: '',
  fields: [],
  associations: [],
  options: {
    tableName: ''
  }
});

const fieldTypes = [
  'STRING', 'TEXT', 'INTEGER', 'BIGINT', 'FLOAT', 'DOUBLE', 'DECIMAL',
  'BOOLEAN', 'DATE', 'DATEONLY', 'TIME', 'UUID', 'JSON', 'JSONB', 'BLOB', 'ENUM'
];

const associationTypes = [
  { label: 'belongsTo', value: 'belongsTo' },
  { label: 'hasMany', value: 'hasMany' },
  { label: 'hasOne', value: 'hasOne' },
  { label: 'belongsToMany', value: 'belongsToMany' }
];

const fieldColumns = [
  { name: 'name', label: 'Nome', field: 'name', align: 'left' },
  { name: 'type', label: 'Tipo', field: 'type', align: 'left' },
  { name: 'primaryKey', label: 'PK', field: 'primaryKey', align: 'center' },
  { name: 'autoIncrement', label: 'AI', field: 'autoIncrement', align: 'center' },
  { name: 'allowNull', label: 'Null', field: 'allowNull', align: 'center' },
  { name: 'actions', label: 'Ações', field: 'actions', align: 'right' }
];

const newField = ref({
  name: '',
  type: 'STRING',
  primaryKey: false,
  autoIncrement: false,
  allowNull: true,
  references: { model: '', key: '' }
});

const newAssociation = ref({
  type: 'belongsTo',
  target: '',
  foreignKey: '',
  through: '',
  otherKey: ''
});

const fieldsWithReferences = computed(() => {
  // Obter foreign keys das relações existentes
  const relationForeignKeys = new Set();
  modelData.value.associations.forEach(assoc => {
    if (assoc.foreignKey) {
      relationForeignKeys.add(assoc.foreignKey);
    }
  });
  
  // Filtrar campos que não são foreign keys de relações e adicionar índice estável baseado na posição original
  return modelData.value.fields
    .map((field, originalIndex) => {
      if (relationForeignKeys.has(field.name)) {
        return null; // Marcar para filtrar depois
      }
      // Retornar o campo original diretamente com propriedades adicionais
      // Isso mantém a reatividade e permite que v-model funcione corretamente
      return {
        ...field,
        references: field.references || { model: '', key: '' },
        __index: originalIndex, // Usar índice original do array como chave estável
        __fieldRef: field // Referência ao campo original para garantir reatividade
      };
    })
    .filter(field => field !== null);
});

function generateModelFileCode() {
  const modelName = modelData.value.className || modelData.value.name.charAt(0).toUpperCase() + modelData.value.name.slice(1);
  const tableName = modelData.value.options?.tableName || `${modelName}s`;
  
  let content = `'use strict';\n`;
  content += `const {\n`;
  content += `  Model\n`;
  content += `} = require(require('../utils/pathResolver').getBackendPath() + '/node_modules/sequelize');\n`;
  content += `module.exports = (sequelize, DataTypes) => {\n`;
  content += `  class ${modelName} extends Model {\n`;
  content += `    /**\n`;
  content += `     * Helper method for defining associations.\n`;
  content += `     * This method is not a part of Sequelize lifecycle.\n`;
  content += `     * The \`models/index\` file will call this method automatically.\n`;
  content += `     */\n`;
  content += `    static associate(models) {\n`;
  
  // Gerar associações
  if (modelData.value.associations && modelData.value.associations.length > 0) {
    modelData.value.associations.forEach(assoc => {
      if (assoc.type === 'belongsToMany') {
        content += `      ${modelName}.belongsToMany(models.${assoc.target}, { `;
        if (assoc.through) content += `through: '${assoc.through}', `;
        if (assoc.foreignKey) content += `foreignKey: '${assoc.foreignKey}', `;
        if (assoc.otherKey) content += `otherKey: '${assoc.otherKey}'`;
        content += ` });\n`;
      } else if (assoc.type === 'belongsTo') {
        content += `      ${modelName}.belongsTo(models.${assoc.target}, { `;
        if (assoc.foreignKey) content += `foreignKey: '${assoc.foreignKey}'`;
        content += ` });\n`;
      } else if (assoc.type === 'hasMany') {
        content += `      ${modelName}.hasMany(models.${assoc.target}, { `;
        if (assoc.foreignKey) content += `foreignKey: '${assoc.foreignKey}'`;
        content += ` });\n`;
      } else if (assoc.type === 'hasOne') {
        content += `      ${modelName}.hasOne(models.${assoc.target}, { `;
        if (assoc.foreignKey) content += `foreignKey: '${assoc.foreignKey}'`;
        content += ` });\n`;
      }
    });
  }
  
  content += `    }\n`;
  content += `  }\n`;
  content += `  ${modelName}.init({\n`;
  
  // Gerar campos
  if (modelData.value.fields && modelData.value.fields.length > 0) {
    modelData.value.fields.forEach((field, index) => {
      content += `    ${field.name}: `;
      
      if (field.primaryKey || field.autoIncrement || field.references || !field.allowNull) {
        content += `{\n`;
        content += `      type: DataTypes.${field.type.toUpperCase()}`;
        if (field.primaryKey) content += `,\n      primaryKey: true`;
        if (field.autoIncrement) content += `,\n      autoIncrement: true`;
        if (field.references && field.references.model) {
          content += `,\n      references: {\n`;
          content += `        model: '${field.references.model}',\n`;
          content += `        key: '${field.references.key || 'id'}'\n`;
          content += `      }`;
        }
        content += `\n    }`;
      } else {
        content += `DataTypes.${field.type.toUpperCase()}`;
      }
      
      if (index < modelData.value.fields.length - 1) content += `,`;
      content += `\n`;
    });
  }
  
  content += `  }, {\n`;
  content += `    sequelize,\n`;
  content += `    modelName: '${modelName}'`;
  if (modelData.value.options?.tableName) {
    content += `,\n    tableName: '${tableName}'`;
  }
  content += `\n  });\n`;
  content += `  return ${modelName};\n`;
  content += `};\n`;
  
  return content;
}


function ensureReferencesObject(field) {
  if (!field.references) {
    field.references = { model: '', key: '' };
  }
}

function getFieldValue(index, key) {
  // Obter o índice real no array modelData.value.fields
  const relationForeignKeys = new Set();
  modelData.value.associations.forEach(assoc => {
    if (assoc.foreignKey) {
      relationForeignKeys.add(assoc.foreignKey);
    }
  });
  
  let realIndex = 0;
  for (let i = 0; i < modelData.value.fields.length; i++) {
    if (!relationForeignKeys.has(modelData.value.fields[i].name)) {
      if (realIndex === index) {
        const field = modelData.value.fields[i];
        return field[key];
      }
      realIndex++;
    }
  }
  return '';
}

function setFieldValue(index, key, value) {
  // Obter o índice real no array modelData.value.fields
  const relationForeignKeys = new Set();
  modelData.value.associations.forEach(assoc => {
    if (assoc.foreignKey) {
      relationForeignKeys.add(assoc.foreignKey);
    }
  });
  
  let realIndex = 0;
  for (let i = 0; i < modelData.value.fields.length; i++) {
    if (!relationForeignKeys.has(modelData.value.fields[i].name)) {
      if (realIndex === index) {
        modelData.value.fields[i][key] = value;
        return;
      }
      realIndex++;
    }
  }
}

function getFieldReference(index, key) {
  // Obter o índice real no array modelData.value.fields
  const relationForeignKeys = new Set();
  modelData.value.associations.forEach(assoc => {
    if (assoc.foreignKey) {
      relationForeignKeys.add(assoc.foreignKey);
    }
  });
  
  let realIndex = 0;
  for (let i = 0; i < modelData.value.fields.length; i++) {
    if (!relationForeignKeys.has(modelData.value.fields[i].name)) {
      if (realIndex === index) {
        const field = modelData.value.fields[i];
        if (!field.references) {
          field.references = { model: '', key: '' };
        }
        return field.references[key] || '';
      }
      realIndex++;
    }
  }
  return '';
}

function setFieldReference(index, key, value) {
  // Obter o índice real no array modelData.value.fields
  const relationForeignKeys = new Set();
  modelData.value.associations.forEach(assoc => {
    if (assoc.foreignKey) {
      relationForeignKeys.add(assoc.foreignKey);
    }
  });
  
  let realIndex = 0;
  for (let i = 0; i < modelData.value.fields.length; i++) {
    if (!relationForeignKeys.has(modelData.value.fields[i].name)) {
      if (realIndex === index) {
        const field = modelData.value.fields[i];
        if (!field.references) {
          field.references = { model: '', key: '' };
        }
        field.references[key] = value;
        return;
      }
      realIndex++;
    }
  }
}

function ensureAllFieldsHaveReferences() {
  modelData.value.fields.forEach(field => {
    if (!field.references) {
      field.references = { model: '', key: '' };
    }
  });
}

async function loadAvailableModels() {
  try {
    const response = await api.get('/api/models');
    // O backend agora retorna { data: [...], count: ..., page: ..., limit: ..., totalPages: ... }
    // ou um array direto (compatibilidade)
    let data = response.data;
    let modelsArray = [];
    
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
      // Formato com paginação
      modelsArray = data.data;
    } else if (Array.isArray(data)) {
      // Formato array direto (compatibilidade)
      modelsArray = data;
    }
    
    availableModels.value = modelsArray.filter(m => m.name !== modelName.value);
  } catch (error) {
    console.error('Erro ao carregar models:', error);
  }
}

async function loadAvailableModules() {
  try {
    const response = await api.get('/api/modules');
    const modules = response.data || [];
    // Adicionar opção "Nenhum" para models sem módulo (pasta padrão)
    availableModules.value = [
      { name: null, title: 'Nenhum (Pasta Padrão)', isSystem: false },
      ...modules
    ];
    // Se for nova model e não houver módulo selecionado, selecionar o primeiro não-sistema
    if (isNew.value && !selectedModule.value && availableModules.value.length > 0) {
      const nonSystemModule = availableModules.value.find(m => !m.isSystem && m.name !== null);
      if (nonSystemModule) {
        selectedModule.value = nonSystemModule.name;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar módulos:', error);
  }
}

function onTargetModelChange(targetClassName) {
  if (targetClassName && newAssociation.value.type) {
    const targetModel = availableModels.value.find(m => m.className === targetClassName);
    if (targetModel) {
      // Auto-preencher foreignKey baseado no tipo de relação apenas se não estiver preenchido manualmente
      // Verificar se o foreignKey atual foi gerado automaticamente (começa com id_)
      const currentForeignKey = newAssociation.value.foreignKey || '';
      const shouldAutoFill = !currentForeignKey || currentForeignKey.startsWith('id_');
      
      if (shouldAutoFill) {
        if (newAssociation.value.type === 'belongsTo') {
          // belongsTo: foreignKey fica na model atual, referenciando a target
          // Exemplo: User.belongsTo(Role) -> foreignKey: id_role na tabela Users
          const targetName = targetModel.name || targetClassName.toLowerCase();
          newAssociation.value.foreignKey = `id_${targetName}`;
        } else if (newAssociation.value.type === 'hasMany' || newAssociation.value.type === 'hasOne') {
          // hasMany/hasOne: foreignKey fica na target, referenciando a model atual
          // Exemplo: User.hasMany(Message) -> foreignKey: id_user na tabela Messages
          const currentModelName = modelData.value.name || modelData.value.className.toLowerCase();
          newAssociation.value.foreignKey = `id_${currentModelName}`;
        }
      }
    }
  }
}

function onAssociationTypeChange(newType) {
  // Quando o tipo muda, recalcular foreignKey se target já estiver selecionado
  // Mas apenas se o foreignKey atual foi gerado automaticamente
  if (newType && newAssociation.value.target) {
    const currentForeignKey = newAssociation.value.foreignKey || '';
    const shouldRecalculate = !currentForeignKey || currentForeignKey.startsWith('id_');
    
    if (shouldRecalculate) {
      onTargetModelChange(newAssociation.value.target);
    }
  } else if (!newType) {
    // Se o tipo foi limpo, limpar também o foreignKey
    newAssociation.value.foreignKey = '';
  }
}

async function loadModel() {
  if (!modelName.value) {
    console.warn('Tentativa de carregar model sem nome');
    return;
  }
  try {
    const response = await api.get(`/api/models/${modelName.value}`);
    let fields = (response.data.fields || []).map(field => ({
      ...field,
      references: field.references || { model: '', key: '' }
    }));
    
    // Verificar se é model de sistema
    isSystemModel.value = response.data.isSystem || false;
    
    // Carregar módulo da model se existir
    // Aguardar que os módulos estejam carregados antes de setar o valor
    await nextTick();
    // Aguardar um pouco mais para garantir que o DOM está atualizado
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (response.data.module) {
      // Verificar se o módulo existe nas opções disponíveis
      const moduleExists = availableModules.value.some(m => m.name === response.data.module);
      if (moduleExists) {
        selectedModule.value = response.data.module;
        console.log('Módulo setado:', response.data.module, 'Opções disponíveis:', availableModules.value.map(m => ({ name: m.name, title: m.title })));
      } else {
        console.warn('Módulo da model não encontrado nas opções disponíveis:', response.data.module, 'Opções:', availableModules.value.map(m => m.name));
        selectedModule.value = null;
      }
    } else {
      selectedModule.value = null;
      console.log('Model não possui módulo (pasta padrão)');
    }
    
    // Garantir que sempre existe um campo 'id'
    const hasIdField = fields.some(f => f.name === 'id');
    if (!hasIdField) {
      fields.unshift({
        name: 'id',
        type: 'INTEGER',
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        references: { model: '', key: '' }
      });
    }
    
    modelData.value = {
      name: response.data.name,
      className: response.data.className,
      fields: fields,
      associations: response.data.associations || [],
      options: response.data.options || { tableName: '' }
    };
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao carregar model',
      icon: 'error'
    });
    goBack();
  }
}

function addField() {
  // Adicionar campo diretamente sem dialog
  const field = {
    name: '',
    type: 'STRING',
    primaryKey: false,
    autoIncrement: false,
    allowNull: true,
    references: { model: '', key: '' }
  };
  modelData.value.fields.push(field);
}

function addFieldFromDialog() {
  // Não permitir adicionar campo com nome 'id' se já existir
  if (newField.value.name === 'id' && modelData.value.fields.some(f => f.name === 'id')) {
    $q.notify({
      color: 'negative',
      message: 'O campo "id" já existe e não pode ser duplicado',
      icon: 'error'
    });
    return;
  }
  
  const field = {
    ...newField.value,
    references: (newField.value.references && newField.value.references.model) 
      ? newField.value.references 
      : { model: '', key: '' }
  };
  modelData.value.fields.push(field);
  newField.value = {
    name: '',
    type: 'STRING',
    primaryKey: false,
    autoIncrement: false,
    allowNull: true,
    references: { model: '', key: '' }
  };
  showAddFieldDialog.value = false;
}

function removeField(index) {
  // Obter o índice real no array modelData.value.fields
  const relationForeignKeys = new Set();
  modelData.value.associations.forEach(assoc => {
    if (assoc.foreignKey) {
      relationForeignKeys.add(assoc.foreignKey);
    }
  });
  
  let realIndex = 0;
  for (let i = 0; i < modelData.value.fields.length; i++) {
    if (!relationForeignKeys.has(modelData.value.fields[i].name)) {
      if (realIndex === index) {
        modelData.value.fields.splice(i, 1);
        return;
      }
      realIndex++;
    }
  }
}

function removeFieldByIndex(originalIndex) {
  // Remove campo diretamente pelo índice original no array
  if (originalIndex >= 0 && originalIndex < modelData.value.fields.length) {
    modelData.value.fields.splice(originalIndex, 1);
  }
}

function addAssociationFromDialog() {
  try {
    console.log('[addAssociationFromDialog] Iniciando - newAssociation:', JSON.stringify(newAssociation.value));
    
    // Validações básicas
    if (!newAssociation.value.type) {
      console.log('[addAssociationFromDialog] Erro: tipo não selecionado');
      $q.notify({
        color: 'negative',
        message: 'Selecione o tipo de relação',
        icon: 'error'
      });
      return;
    }
    
    if (!newAssociation.value.target) {
      console.log('[addAssociationFromDialog] Erro: target não selecionado');
      $q.notify({
        color: 'negative',
        message: 'Selecione a model alvo',
        icon: 'error'
      });
      return;
    }
    
    // Validação específica para belongsToMany
    if (newAssociation.value.type === 'belongsToMany') {
      if (!newAssociation.value.through) {
        console.log('[addAssociationFromDialog] Erro: through não informado para belongsToMany');
        $q.notify({
          color: 'negative',
          message: 'Informe a tabela intermediária (through) para relações belongsToMany',
          icon: 'error'
        });
        return;
      }
    }
    
    const assoc = {
      type: newAssociation.value.type,
      target: newAssociation.value.target,
      foreignKey: newAssociation.value.foreignKey || null
    };
    
    if (newAssociation.value.type === 'belongsToMany') {
      assoc.through = newAssociation.value.through || null;
      assoc.otherKey = newAssociation.value.otherKey || null;
    }
    
    console.log('[addAssociationFromDialog] Associação criada:', JSON.stringify(assoc));
    
    // Garantir que modelData.value.associations existe
    if (!modelData.value.associations) {
      console.log('[addAssociationFromDialog] Criando array de associações');
      modelData.value.associations = [];
    }
    
    // Verificar se a relação já existe
    const relationExists = modelData.value.associations.some(a => 
      a.type === assoc.type && 
      a.target === assoc.target &&
      (a.foreignKey === assoc.foreignKey || (!a.foreignKey && !assoc.foreignKey))
    );
    
    if (relationExists) {
      console.log('[addAssociationFromDialog] Relação já existe');
      $q.notify({
        color: 'warning',
        message: 'Esta relação já existe',
        icon: 'warning'
      });
      return;
    }
    
    // Se for belongsTo e tiver foreignKey, adicionar o campo automaticamente se não existir
    if (assoc.type === 'belongsTo' && assoc.foreignKey) {
      const fieldExists = modelData.value.fields.some(f => f.name === assoc.foreignKey);
      if (!fieldExists) {
        const targetModel = availableModels.value.find(m => m.className === assoc.target);
        if (targetModel) {
          console.log('[addAssociationFromDialog] Adicionando campo foreignKey automaticamente:', assoc.foreignKey);
          // Adicionar campo foreignKey automaticamente
          modelData.value.fields.push({
            name: assoc.foreignKey,
            type: 'INTEGER',
            primaryKey: false,
            autoIncrement: false,
            allowNull: true,
            references: {
              model: targetModel.className || targetModel.name.charAt(0).toUpperCase() + targetModel.name.slice(1),
              key: 'id'
            }
          });
        }
      }
    }
    
    console.log('[addAssociationFromDialog] Adicionando associação ao array');
    modelData.value.associations.push(assoc);
    console.log('[addAssociationFromDialog] Associações após adicionar:', modelData.value.associations.length);
    
    $q.notify({
      color: 'positive',
      message: 'Relação adicionada com sucesso!',
      icon: 'check'
    });
    
    // Resetar formulário
    newAssociation.value = {
      type: 'belongsTo',
      target: '',
      foreignKey: '',
      through: '',
      otherKey: ''
    };
    
    showAddAssociationDialog.value = false;
    console.log('[addAssociationFromDialog] Concluído com sucesso');
  } catch (error) {
    console.error('[addAssociationFromDialog] Erro ao adicionar relação:', error);
    console.error('[addAssociationFromDialog] Stack:', error.stack);
    $q.notify({
      color: 'negative',
      message: 'Erro ao adicionar relação: ' + (error.message || 'Erro desconhecido'),
      icon: 'error'
    });
  }
}

function removeAssociation(index) {
  modelData.value.associations.splice(index, 1);
}

async function saveModel() {
  try {
    // Limpar campos inválidos antes de salvar (defaultValue deve ser string ou não existir)
    const cleanedFields = modelData.value.fields.map(field => {
      const cleaned = { ...field };
      // Remover defaultValue se for null, undefined, string vazia ou não for string
      if (cleaned.defaultValue === null || 
          cleaned.defaultValue === undefined || 
          cleaned.defaultValue === '' ||
          (cleaned.defaultValue !== undefined && typeof cleaned.defaultValue !== 'string')) {
        delete cleaned.defaultValue;
      }
      // Remover references se estiver vazio
      if (cleaned.references && (!cleaned.references.model || !cleaned.references.key)) {
        delete cleaned.references;
      }
      return cleaned;
    });
    
    const payload = {
      name: modelData.value.name,
      className: modelData.value.className,
      fields: cleanedFields,
      associations: modelData.value.associations,
      options: modelData.value.options
    };
    
    // Adicionar módulo apenas se for nova model e módulo foi selecionado
    // Para atualização, o backend já sabe onde está o arquivo através do findModelFilePath
    if (isNew.value && selectedModule.value) {
      payload.module = selectedModule.value;
    }
    
    if (isNew.value) {
      await api.post('/api/models', payload);
      $q.notify({
        color: 'positive',
        message: 'Model criada com sucesso!',
        icon: 'check'
      });
      router.push(`/admin/models/${modelData.value.name}`);
    } else {
      await api.put(`/api/models/${modelName.value}`, payload);
      $q.notify({
        color: 'positive',
        message: 'Model atualizada com sucesso!',
        icon: 'check'
      });
    }
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao salvar model',
      icon: 'error'
    });
  }
}

async function generateMigration() {
  try {
    const payload = {
      fields: modelData.value.fields,
      className: modelData.value.className,
      options: modelData.value.options,
      associations: modelData.value.associations,
      isNew: false
    };
    
    // Incluir módulo se existir
    if (selectedModule.value) {
      payload.module = selectedModule.value;
    }
    
    await api.post(`/api/models/${modelName.value}/migration`, payload);
    $q.notify({
      color: 'positive',
      message: 'Migration gerada com sucesso!',
      icon: 'check'
    });
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao gerar migration',
      icon: 'error'
    });
  }
}

async function generateSeeder() {
  try {
    let data = [];
    try {
      data = JSON.parse(seederData.value);
    } catch (e) {
      $q.notify({
        color: 'negative',
        message: 'JSON inválido',
        icon: 'error'
      });
      return;
    }
    
    await api.post(`/api/models/${modelName.value}/seeder`, { data });
    $q.notify({
      color: 'positive',
      message: 'Seeder gerado com sucesso!',
      icon: 'check'
    });
    showSeederDialog.value = false;
    seederData.value = '[]';
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao gerar seeder',
      icon: 'error'
    });
  }
}

function confirmDeleteModel() {
  $q.dialog({
    title: 'Confirmar Exclusão',
    message: `Tem certeza que deseja excluir a model "${modelName.value}"? Esta ação não pode ser desfeita.`,
    cancel: true,
    persistent: true,
    color: 'negative'
  }).onOk(() => {
    deleteModel();
  });
}

async function deleteModel() {
  $q.loading.show({ message: 'Excluindo model...' });
  try {
    await api.delete(`/api/models/${modelName.value}`);
    $q.notify({
      color: 'positive',
      message: 'Model excluída com sucesso!',
      icon: 'check'
    });
    router.push('/admin/models');
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

function goBack() {
  router.push('/admin/models');
}

// Watcher para recarregar quando a rota mudar (mesmo componente, parâmetro diferente)
watch(() => {
  const name = getModelNameFromRoute();
  return name;
}, async (newName, oldName) => {
  console.log('[Watcher route] newName:', newName, 'oldName:', oldName);
  // Ignorar se não mudou ou se é a primeira execução sem mudança
  if (newName === oldName) {
    console.log('[Watcher route] Ignorando - não mudou');
    return;
  }
  
  if (newName === 'new') {
    console.log('[Watcher route] Configurando como NOVA MODEL');
    isNew.value = true;
    modelName.value = '';
    modelData.value = {
      name: '',
      className: '',
      fields: [{
        name: 'id',
        type: 'INTEGER',
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        references: { model: '', key: '' }
      }],
      associations: [],
      options: { tableName: '' }
    };
    // Carregar módulos disponíveis para nova model
    await loadAvailableModules();
    console.log('[Watcher route] Estado configurado - isNew.value:', isNew.value);
  } else if (newName && newName !== 'undefined') {
    console.log('[Watcher route] Configurando como MODEL EXISTENTE:', newName);
    isNew.value = false;
    modelName.value = newName;
    await loadAvailableModels();
    await loadAvailableModules();
    await nextTick();
    if (modelName.value) {
      await loadModel();
    }
    console.log('[Watcher route] Estado configurado - isNew.value:', isNew.value);
  } else {
    console.log('[Watcher route] Caso não tratado - newName:', newName);
  }
}, { immediate: true });


onMounted(async () => {
  const name = getModelNameFromRoute();
  console.log('[onMounted] Iniciando - name extraído:', name, 'route.params:', route.params);
  // Carregar dados necessários primeiro
  await loadAvailableModels();
  await loadAvailableModules();
  
  // O watcher com immediate: true já deve ter configurado o estado inicial
  // Mas vamos garantir que está sincronizado com a rota atual
  console.log('[onMounted] name:', name, 'isNew.value atual:', isNew.value);
  
  if (name === 'new') {
    console.log('[onMounted] Configurando como NOVA MODEL');
    // Garantir que isNew está true para nova model
    isNew.value = true;
    modelName.value = '';
    // Nova model - garantir que sempre tenha campo 'id'
    if (!modelData.value.fields || modelData.value.fields.length === 0) {
      modelData.value = {
        name: '',
        className: '',
        fields: [{
          name: 'id',
          type: 'INTEGER',
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          references: { model: '', key: '' }
        }],
        associations: [],
        options: { tableName: '' }
      };
    }
    console.log('[onMounted] Estado configurado - isNew.value:', isNew.value, 'isNewModel:', isNewModel.value);
  } else if (name && name !== 'new' && name !== 'undefined') {
    console.log('[onMounted] Configurando como MODEL EXISTENTE:', name);
    // Garantir que isNew está false para model existente
    isNew.value = false;
    modelName.value = name;
    // Aguardar um tick para garantir que os módulos estão carregados antes de carregar a model
    await nextTick();
    if (modelName.value) {
      await loadModel();
    }
    console.log('[onMounted] Estado configurado - isNew.value:', isNew.value, 'isNewModel:', isNewModel.value);
  } else {
    console.log('[onMounted] Caso não tratado - name:', name);
  }
});

function getAssociationTypeColor(type) {
  const colors = {
    belongsTo: 'blue',
    hasMany: 'green',
    hasOne: 'teal',
    belongsToMany: 'purple'
  };
  return colors[type] || 'grey';
}

</script>

<style scoped>
.model-edit-page {
  padding: 8px !important;
}

.relation-card {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.relation-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.model-edit-header {
  margin-bottom: 8px;
}

.model-edit-content {
  height: calc(100vh - 180px);
  align-items: stretch;
}

.model-edit-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0px !important;
  min-height: 0;
}

.model-edit-panels {
  flex: 1;
  overflow: hidden;
  padding: 0 !important;
  position: relative;
  height: 100%;
}


.section-card {
  border-radius: 8px;
  background-color: #fafafa;
}

.section-header {
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  padding: 6px 8px !important;
}

.section-body {
  padding: 8px !important;
}

.model-tabs :deep(.q-tab) {
  white-space: nowrap;
  flex-wrap: nowrap;
}

.model-tabs :deep(.q-tab__content) {
  white-space: nowrap;
  flex-wrap: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.model-tabs :deep(.q-tab__label) {
  white-space: nowrap;
  overflow: visible;
}

.fields-table :deep(.q-table__top),
.fields-table :deep(.q-table__bottom) {
  padding: 0;
  margin: 0;
}

.fields-table :deep(.q-table tbody td),
.fields-table :deep(.q-table thead th) {
  padding: 4px 8px;
}

.fields-table :deep(.q-table thead th) {
  padding: 8px;
}

.model-main-card {
  border-radius: 12px;
}

.section-card {
  border-radius: 12px;
}

.fields-card {
  border-radius: 12px;
}

.section-body .row {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.section-body .row > div {
  padding-left: 8px;
  padding-right: 8px;
}

.section-body .row > div:first-child {
  padding-left: 0;
}

.section-body .row > div:last-child {
  padding-right: 0;
}

/* Garantir que as colunas não quebrem em telas médias/grandes */
.model-content-row {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

@media (min-width: 768px) {
  .model-content-row {
    flex-wrap: nowrap !important;
  }
  
  .model-content-col {
    flex: 0 0 75% !important;
    max-width: 75% !important;
    min-width: 0;
    padding-right: 4px;
  }
  
  .model-relations-col {
    flex: 0 0 25% !important;
    max-width: 25% !important;
    min-width: 0;
    padding-left: 4px;
  }
}

.model-relations-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}
</style>
