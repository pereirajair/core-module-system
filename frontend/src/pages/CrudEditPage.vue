<template>
  <q-page class="crud-editor-page">
    <div class="row items-center crud-editor-header">
      <q-btn
        flat
        round
        dense
        icon="arrow_back"
        @click="goBack"
        class="q-mr-sm"
      />
      <div class="row items-center q-gutter-sm">
        <div class="text-h6">
          {{ isNew ? 'Nova Interface' : 'Editar Interface' }}
        </div>
        <q-chip
          v-if="isSystem"
          color="orange"
          text-color="white"
          icon="lock"
          size="sm"
        >
          Interface de Sistema
        </q-chip>
        <q-chip
          v-if="isSystem && canEditSystem"
          color="warning"
          text-color="dark"
          icon="developer_mode"
          size="sm"
        >
          Modo Desenvolvimento
        </q-chip>
      </div>
      <q-space />
      <q-btn
        v-if="canEditSystem"
        fab
        color="primary"
        icon="save"
        @click="saveCrud"
        size="sm"
      >
        <q-tooltip>Salvar</q-tooltip>
      </q-btn>
    </div>

    <q-card flat class="crud-editor-card">
      <q-tabs
        v-model="tab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
        narrow-indicator
      >
        <q-tab name="basic" label="Básico" icon="info" />
        <q-tab name="columns" label="Colunas" icon="view_column" />
        <q-tab name="form" label="Formulário" icon="edit" />
        <q-tab name="relations" label="Relações" icon="link" />
        <q-tab name="json" label="JSON" icon="code" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated class="crud-editor-panels">
        <!-- Tab: Informações Básicas (Unificada com Configurações e Mensagens) -->
        <q-tab-panel name="basic" class="q-pa-sm">
          <q-banner v-if="isSystem && !canEditSystem" class="bg-orange-1 text-orange-8 q-mb-md" rounded>
            <template v-slot:avatar>
              <q-icon name="info" color="orange" />
            </template>
            Esta é uma Interface de Sistema e não pode ser editada. Apenas visualização permitida.
          </q-banner>
          <q-banner v-if="isSystem && canEditSystem" class="bg-warning-1 text-warning-8 q-mb-md" rounded>
            <template v-slot:avatar>
              <q-icon name="developer_mode" color="warning" />
            </template>
            <strong>Modo Desenvolvimento Ativo:</strong> Você está editando uma Interface de Sistema. Use com cuidado!
          </q-banner>
          <!-- Seletor de Model -->
          <q-card flat bordered class="q-mb-md bg-blue-1">
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">Selecionar Model (Opcional - Preenche automaticamente)</div>
              <q-select
                v-model="selectedModel"
                :options="availableModels"
                option-label="name"
                option-value="name"
                emit-value
                map-options
                label="Escolher Model do Banco de Dados"
                outlined
                dense
                clearable
                :loading="loadingModels"
                hint="Selecione uma model para preencher automaticamente os campos básicos, rotas, colunas e formulário"
                @update:model-value="onModelSelected"
              >
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ scope.opt.name }}</q-item-label>
                      <q-item-label caption>{{ scope.opt.className }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <q-btn
                v-if="selectedModel"
                flat
                dense
                color="primary"
                icon="refresh"
                label="Aplicar Model"
                class="q-mt-sm"
                @click="applyModelData"
              />
            </q-card-section>
          </q-card>

          <!-- Informações Básicas -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 q-mb-md">Informações Básicas</div>
              <div class="row q-gutter-sm q-mb-sm">
              <q-input
                v-model="crudForm.name"
                label="Nome (identificador único)"
                outlined
                dense
                class="col"
                :rules="[val => !!val || 'Nome é obrigatório', val => /^[a-z0-9_-]+$/.test(val) || 'Apenas letras minúsculas, números, underscore e traço']"
                hint="Ex: users, products, orders"
                :readonly="isSystem && !canEditSystem"
              />
                <q-input
                  v-model="crudForm.title"
                  label="Título"
                  outlined
                  dense
                  class="col"
                  :rules="[val => !!val || 'Título é obrigatório']"
                  :readonly="isSystem && !canEditSystem"
                />
              </div>

              <div class="row q-gutter-sm q-mb-sm">
                <div class="col">
                  <IconPicker
                    v-model="crudForm.icon"
                    label="Ícone"
                    :rules="[val => !!val || 'Ícone é obrigatório']"
                    hint="Digite ou selecione um ícone"
                    :readonly="isSystem && !canEditSystem"
                  />
                </div>
                <q-input
                  v-model="crudForm.resource"
                  label="Recurso (para permissões)"
                  outlined
                  dense
                  class="col"
                  :rules="[val => !!val || 'Recurso é obrigatório']"
                  hint="Ex: users, systems"
                  :readonly="isSystem && !canEditSystem"
                />
              </div>

              <div class="row q-gutter-sm q-mb-sm">
                <q-input
                  v-model="crudForm.endpoint"
                  label="Endpoint da API"
                  outlined
                  dense
                  class="col"
                  :rules="[val => !!val || 'Endpoint é obrigatório', val => val.startsWith('/api/') || 'Endpoint deve começar com /api/']"
                  hint="Ex: /api/users"
                  :readonly="isSystem && !canEditSystem"
                />
              </div>

              <q-toggle
                v-model="crudForm.active"
                label="Ativo"
                dense
                :disable="isSystem && !canEditSystem"
              />
            </q-card-section>
          </q-card>

          <!-- Configurações -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 q-mb-md">Configurações Gerais</div>
              <div class="q-gutter-sm">
                <q-input
                  v-model="config.rowKey"
                  label="Row Key"
                  outlined
                  dense
                  hint="Campo único para identificar linhas (padrão: id)"
                  :readonly="isSystem && !canEditSystem"
                />
                <div class="row q-gutter-sm">
                  <q-input
                    v-model="config.createRoute"
                    label="Rota de Criação"
                    outlined
                    dense
                    class="col"
                    hint="Ex: /crud/users/new"
                    :readonly="isSystem && !canEditSystem"
                  />
                  <q-input
                    v-model="config.editRoute"
                    label="Rota de Edição"
                    outlined
                    dense
                    class="col"
                    hint="Ex: /crud/users/:id"
                    :readonly="isSystem && !canEditSystem"
                  />
                </div>
                  <q-toggle
                    v-model="config.showSearch"
                    label="Mostrar Busca"
                    dense
                    :disable="isSystem && !canEditSystem"
                  />
                  <q-toggle
                    v-model="config.showFab"
                    label="Mostrar Botão FAB"
                    dense
                    :disable="isSystem && !canEditSystem"
                  />
              </div>
            </q-card-section>
          </q-card>

          <!-- Mensagens -->
          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle2 q-mb-md">Mensagens e Títulos</div>
              <div class="q-gutter-sm">
                <q-input
                  v-model="config.deleteMessage"
                  label="Mensagem de Confirmação de Exclusão"
                  outlined
                  dense
                  type="textarea"
                  rows="2"
                  hint="Use ${row.name} ou ${row.title} para variáveis"
                />
                <q-input
                  v-model="config.deleteSuccessMessage"
                  label="Mensagem de Sucesso ao Excluir"
                  outlined
                  dense
                />
                <q-input
                  v-model="config.createLabel"
                  label="Label do Botão Criar"
                  outlined
                  dense
                />
              </div>
            </q-card-section>
          </q-card>
        </q-tab-panel>

        <!-- Tab: Colunas -->
        <q-tab-panel name="columns" class="q-pa-sm">
          <div class="row q-mb-sm items-center">
            <div class="text-subtitle1">Colunas da Tabela</div>
            <q-space />
            <q-btn
              v-if="canEditSystem"
              outline
              color="primary"
              icon="add"
              label="Adicionar Coluna"
              size="sm"
              dense
              @click="addColumn"
            />
          </div>

          <!-- Visualização de Tabela -->
          <div class="table-preview-container">
            <div class="table-header">
              <div class="text-subtitle2">Preview da Estrutura da Tabela</div>
            </div>
            <div class="table-header-row">
              <div class="table-cell drag-cell">#</div>
              <div class="table-cell">Nome</div>
              <div class="table-cell">Label</div>
              <div class="table-cell">Alinhamento</div>
              <div class="table-cell">Field</div>
              <div class="table-cell">Formato</div>
              <div class="table-cell text-center">Ordenável</div>
              <div class="table-cell text-center">Obrigatório</div>
              <div class="table-cell text-center">Ações</div>
            </div>
            <draggable
              v-model="config.columns"
              :item-key="(item, index) => `column-${index}-${item.name || 'new'}`"
              handle=".drag-handle"
              class="table-rows"
            >
              <template #item="{ element: column, index }">
                <div class="table-row">
                  <div class="table-cell drag-cell">
                    <q-icon name="drag_handle" class="drag-handle" />
                  </div>
                  <div class="table-cell">
                    <q-input
                      v-model="column.name"
                      dense
                      borderless
                      placeholder="nome"
                      @update:model-value="updateColumnName(column)"
                    />
                  </div>
                  <div class="table-cell">
                    <q-input
                      v-model="column.label"
                      dense
                      borderless
                      placeholder="Label"
                      @update:model-value="updateColumn(column)"
                    />
                  </div>
                  <div class="table-cell">
                    <q-select
                      v-model="column.align"
                      :options="['left', 'center', 'right']"
                      dense
                      borderless
                      @update:model-value="updateColumn(column)"
                    />
                  </div>
                  <div class="table-cell">
                    <q-input
                      v-model="column.field"
                      dense
                      borderless
                      placeholder="campo"
                      @update:model-value="updateColumn(column)"
                    />
                  </div>
                  <div class="table-cell">
                    <q-select
                      v-model="column.format"
                      :options="[
                        { label: 'Padrão', value: null },
                        { label: 'Data', value: 'date' },
                        { label: 'Data/Hora', value: 'datetime' },
                        { label: 'Hora', value: 'time' },
                        { label: 'Moeda', value: 'currency' },
                        { label: 'Número', value: 'number' },
                        { label: 'Badge (Boolean)', value: 'badge' }
                      ]"
                      option-label="label"
                      option-value="value"
                      emit-value
                      map-options
                      dense
                      borderless
                      clearable
                      placeholder="Formato"
                      @update:model-value="updateColumn(column)"
                    />
                    <template v-if="column.format === 'badge'">
                      <q-input
                        v-model="column.badgeTrueLabel"
                        dense
                        borderless
                        placeholder="Label True (ex: OK)"
                        class="q-mt-xs"
                        @update:model-value="updateColumn(column)"
                      />
                      <q-input
                        v-model="column.badgeFalseLabel"
                        dense
                        borderless
                        placeholder="Label False (ex: Erro)"
                        class="q-mt-xs"
                        @update:model-value="updateColumn(column)"
                      />
                    </template>
                  </div>
                  <div class="table-cell text-center">
                    <q-toggle
                      v-model="column.sortable"
                      dense
                      size="sm"
                      @update:model-value="updateColumn(column)"
                    />
                  </div>
                  <div class="table-cell text-center">
                    <q-toggle
                      v-model="column.required"
                      dense
                      size="sm"
                      @update:model-value="updateColumn(column)"
                    />
                  </div>
                  <div class="table-cell text-center">
                    <q-btn
                      flat
                      round
                      dense
                      :color="column.items && column.items.length > 0 ? 'primary' : 'secondary'"
                      :icon="column.items && column.items.length > 0 ? 'settings' : 'add'"
                      size="sm"
                      @click="editColumnActions(column, index)"
                      class="q-mr-xs"
                    >
                      <q-tooltip>
                        {{ column.items && column.items.length > 0 ? 'Gerenciar Actions' : 'Adicionar Actions' }}
                      </q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      color="negative"
                      icon="delete"
                      size="sm"
                      @click="removeColumn(index)"
                    />
                  </div>
                </div>
              </template>
            </draggable>
            <div v-if="config.columns.length === 0" class="table-empty">
              Nenhuma coluna adicionada. Clique em "Adicionar Coluna" para começar.
            </div>
          </div>
        </q-tab-panel>

        <!-- Tab: Formulário -->
        <q-tab-panel name="form" class="q-pa-sm">
          <div class="row q-mb-sm items-center">
            <div class="text-subtitle1">Layouts do Formulário</div>
            <q-space />
            <q-btn
              outline
              color="primary"
              icon="add"
              label="Adicionar Layout"
              size="sm"
              dense
              @click="addLayout"
            />
            <q-btn
              outline
              color="secondary"
              icon="add"
              label="Adicionar Campo"
              size="sm"
              dense
              class="q-ml-sm"
              @click="showAddFieldDialog = true"
            />
          </div>

          <draggable
            v-model="config.layouts"
            :item-key="(item, index) => `layout-${index}`"
            handle=".layout-drag-handle"
            class="layouts-list"
          >
            <template #item="{ element: layout, index: layoutIndex }">
              <q-card class="q-mb-md layout-card">
                <q-card-section class="q-pa-sm">
                  <div class="row items-center q-mb-sm">
                    <q-icon name="drag_handle" class="layout-drag-handle cursor-move q-mr-sm" />
                    <q-input
                      v-model="layout.title"
                      placeholder="Título do Layout (opcional)"
                      outlined
                      dense
                      class="col"
                    />
                    <q-btn
                      flat
                      round
                      dense
                      color="negative"
                      icon="delete"
                      size="sm"
                      @click="removeLayout(layoutIndex)"
                    />
                  </div>

                  <div class="layout-rows">
                    <div
                      v-for="(row, rowIndex) in layout.rows"
                      :key="rowIndex"
                      class="layout-row q-mb-sm"
                    >
                      <div class="row items-center q-mb-xs">
                        <span class="text-caption q-mr-sm">Linha {{ rowIndex + 1 }}</span>
                        <q-space />
                        <q-btn
                          flat
                          round
                          dense
                          icon="add"
                          size="xs"
                          @click="addColumnToRow(layoutIndex, rowIndex)"
                        >
                          <q-tooltip>Adicionar Coluna</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          dense
                          icon="remove"
                          size="xs"
                          :disable="layout.rows.length <= 1"
                          @click="removeRow(layoutIndex, rowIndex)"
                        >
                          <q-tooltip>Remover Linha</q-tooltip>
                        </q-btn>
                      </div>

                      <div class="row q-gutter-xs">
                        <div
                          v-for="(col, colIndex) in row.cols"
                          :key="colIndex"
                          class="layout-col"
                          :style="{ width: `${100 / row.cols.length}%` }"
                        >
                          <div class="col-header q-pa-xs bg-grey-2 rounded-borders q-mb-xs">
                            <div class="row items-center">
                              <span class="text-caption">Coluna {{ colIndex + 1 }}</span>
                              <q-space />
                              <q-btn
                                flat
                                round
                                dense
                                icon="add"
                                size="xs"
                                @click="addColumnToRow(layoutIndex, rowIndex)"
                              />
                              <q-btn
                                flat
                                round
                                dense
                                icon="remove"
                                size="xs"
                                :disable="row.cols.length <= 1"
                                @click="removeColumnFromRow(layoutIndex, rowIndex, colIndex)"
                              />
                            </div>
                          </div>

                          <draggable
                            v-model="col.fields"
                            :item-key="(item) => item.name || `field-${Date.now()}`"
                            handle=".field-drag-handle"
                            group="form-fields"
                            class="col-fields"
                            @add="(evt) => onFieldAdd(evt, layoutIndex, rowIndex, colIndex)"
                          >
                            <template #item="{ element: field }">
                              <q-card class="q-mb-xs field-card">
                                <q-card-section class="q-pa-xs">
                                  <div class="row items-center q-mb-xs">
                                    <q-icon name="drag_handle" class="field-drag-handle cursor-move" size="xs" />
                                    <q-input
                                      v-model="field.label"
                                      placeholder="Label"
                                      outlined
                                      dense
                                      class="col"
                                    />
                                    <q-select
                                      v-model="field.type"
                                      :options="fieldTypes"
                                      outlined
                                      dense
                                      class="col-4"
                                    />
                                    <q-btn
                                      flat
                                      round
                                      dense
                                      color="negative"
                                      icon="delete"
                                      size="xs"
                                      @click="removeFieldFromLayout(field.name)"
                                    />
                                  </div>
                                  <div class="row q-gutter-xs">
                                    <q-input
                                      v-model="field.name"
                                      placeholder="Nome"
                                      outlined
                                      dense
                                      class="col"
                                    />
                                    <q-input
                                      v-model="field.default"
                                      placeholder="Padrão"
                                      outlined
                                      dense
                                      class="col"
                                    />
                                  </div>
                                </q-card-section>
                              </q-card>
                            </template>
                          </draggable>
                        </div>
                      </div>
                    </div>

                    <q-btn
                      flat
                      dense
                      icon="add"
                      label="Adicionar Linha"
                      size="sm"
                      @click="addRowToLayout(layoutIndex)"
                    />
                  </div>
                </q-card-section>
              </q-card>
            </template>
          </draggable>

          <!-- Dialog para adicionar campo -->
          <q-dialog v-model="showAddFieldDialog">
            <q-card style="min-width: 400px">
              <q-card-section>
                <div class="text-h6">Adicionar Campo</div>
              </q-card-section>
              <q-card-section>
                <q-input
                  v-model="newField.name"
                  label="Nome"
                  outlined
                  dense
                  class="q-mb-sm"
                />
                <q-input
                  v-model="newField.label"
                  label="Label"
                  outlined
                  dense
                  class="q-mb-sm"
                />
                <q-select
                  v-model="newField.type"
                  :options="fieldTypes"
                  label="Tipo"
                  outlined
                  dense
                />
              </q-card-section>
              <q-card-actions align="right">
                <q-btn flat label="Cancelar" v-close-popup />
                <q-btn flat label="Adicionar" color="primary" @click="addFieldToUnassigned" v-close-popup />
              </q-card-actions>
            </q-card>
          </q-dialog>
        </q-tab-panel>

        <!-- Tab: Relações -->
        <q-tab-panel name="relations" class="q-pa-sm">
          <div class="row q-mb-sm items-center">
            <div class="text-subtitle1">Relações</div>
            <q-space />
            <q-btn
              v-if="canEditSystem"
              outline
              color="primary"
              icon="add"
              label="Adicionar Relação"
              size="sm"
              dense
              @click="showAddRelationDialog = true"
            />
          </div>
          <div v-for="(relation, index) in config.relations" :key="index" class="q-mb-sm">
            <q-card>
              <q-card-section class="q-pa-sm">
                <div class="row q-gutter-xs q-mb-xs">
                  <q-select
                    v-model="relation.type"
                    :options="relationTypes"
                    label="Tipo de Relação"
                    outlined
                    dense
                    class="col-3"
                    @update:model-value="onRelationTypeChanged(index, $event)"
                  />
                  <q-select
                    v-model="relation.modelName"
                    :options="availableModels"
                    option-label="name"
                    option-value="name"
                    emit-value
                    map-options
                    label="Model Relacionada"
                    outlined
                    dense
                    class="col"
                    clearable
                    @update:model-value="(val) => onRelationModelSelected(index, val)"
                  >
                    <template v-slot:option="scope">
                      <q-item v-bind="scope.itemProps">
                        <q-item-section>
                          <q-item-label>{{ scope.opt.name }}</q-item-label>
                          <q-item-label caption>{{ scope.opt.className }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                  <q-input
                    v-model="relation.label"
                    label="Label"
                    outlined
                    dense
                    class="col"
                  />
                  <q-btn
                    flat
                    round
                    dense
                    color="negative"
                    icon="delete"
                    size="sm"
                    @click="removeRelation(index)"
                  />
                </div>

                <!-- Campos para select (belongsTo) -->
                <template v-if="relation.type === 'select'">
                  <div class="row q-gutter-xs q-mb-xs">
                    <q-input
                      v-model="relation.endpoint"
                      label="Endpoint"
                      outlined
                      dense
                      class="col"
                    />
                    <q-input
                      v-model="relation.field"
                      label="Campo no Response"
                      outlined
                      dense
                      class="col"
                    />
                    <q-input
                      v-model="relation.payloadField"
                      label="Payload Field"
                      outlined
                      dense
                      class="col"
                      hint="Campo no payload (ex: estado_id, cidade_id)"
                    />
                  </div>
                  <div class="row q-gutter-xs">
                    <q-input
                      v-model="relation.itemLabel"
                      label="Item Label"
                      outlined
                      dense
                      class="col"
                      hint="Campo para exibir (ex: nome)"
                    />
                    <q-input
                      v-model="relation.itemValue"
                      label="Item Value"
                      outlined
                      dense
                      class="col"
                      hint="Campo para valor (ex: id)"
                    />
                  </div>
                  <div class="row q-gutter-xs q-mt-xs">
                    <q-input
                      v-model="relation.dependsOn"
                      label="Depende de (Campo)"
                      outlined
                      dense
                      class="col"
                      hint="Campo ou relação que esta relação depende (ex: state_id ou State)"
                    />
                    <q-input
                      v-model="relation.filterParam"
                      label="Parâmetro de Filtro"
                      outlined
                      dense
                      class="col"
                      hint="Nome do parâmetro na API (ex: state_id). Se vazio, usa dependsOn"
                    />
                  </div>
                </template>

                <!-- Campos para transfer/multiselect (belongsToMany) -->
                <template v-if="relation.type === 'transfer' || relation.type === 'multiselect'">
                  <div class="row q-gutter-xs q-mb-xs">
                    <q-input
                      v-model="relation.endpoint"
                      label="Endpoint"
                      outlined
                      dense
                      class="col"
                    />
                    <q-input
                      v-model="relation.field"
                      label="Campo no Response"
                      outlined
                      dense
                      class="col"
                    />
                    <q-input
                      v-model="relation.payloadField"
                      label="Payload Field"
                      outlined
                      dense
                      class="col"
                    />
                  </div>
                  <div class="row q-gutter-xs">
                    <q-input
                      v-model="relation.itemLabel"
                      label="Item Label"
                      outlined
                      dense
                      class="col"
                    />
                    <q-input
                      v-model="relation.itemValue"
                      label="Item Value"
                      outlined
                      dense
                      class="col"
                    />
                    <q-input
                      v-if="relation.type === 'transfer'"
                      v-model="relation.availableLabel"
                      label="Label Disponíveis"
                      outlined
                      dense
                      class="col"
                    />
                    <q-input
                      v-if="relation.type === 'transfer'"
                      v-model="relation.selectedLabel"
                      label="Label Selecionados"
                      outlined
                      dense
                      class="col"
                    />
                  </div>
                </template>

                <!-- Campos para inline (hasMany) -->
                <template v-if="relation.type === 'inline'">
                  <div class="row q-gutter-xs q-mb-xs">
                    <q-input
                      v-model="relation.addLabel"
                      label="Label do Botão Adicionar"
                      outlined
                      dense
                      class="col"
                      hint="Ex: Adicionar Endereço"
                    />
                    <q-input
                      v-model="relation.payloadField"
                      label="Campo no Payload"
                      outlined
                      dense
                      class="col"
                      hint="Ex: enderecos"
                    />
                  </div>
                  <div class="text-subtitle2 q-mb-sm">Campos do Formulário Inline</div>
                  <div class="row q-gutter-xs q-mb-xs">
                    <q-btn
                      outline
                      color="primary"
                      icon="add"
                      label="Adicionar Campo"
                      size="sm"
                      dense
                      @click="showAddInlineFieldDialog(index)"
                    />
                  </div>
                  <div v-if="relation.fields && relation.fields.length > 0" class="q-mt-sm">
                    <q-card
                      v-for="(field, fieldIndex) in relation.fields"
                      :key="fieldIndex"
                      flat
                      bordered
                      class="q-mb-xs"
                    >
                      <q-card-section class="q-pa-xs">
                        <div class="row q-gutter-xs items-center">
                          <q-input
                            v-model="field.name"
                            label="Nome"
                            outlined
                            dense
                            class="col-3"
                          />
                          <q-input
                            v-model="field.label"
                            label="Label"
                            outlined
                            dense
                            class="col-3"
                          />
                          <q-select
                            v-model="field.type"
                            :options="fieldTypes"
                            label="Tipo"
                            outlined
                            dense
                            class="col-2"
                          />
                          <q-input
                            v-model="field.colClass"
                            label="Classe Coluna"
                            outlined
                            dense
                            class="col-2"
                            hint="Ex: col-6"
                          />
                          <q-btn
                            flat
                            round
                            dense
                            color="negative"
                            icon="delete"
                            size="sm"
                            @click="removeInlineField(index, fieldIndex)"
                          />
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </template>

                <!-- Campos para sub-crud (Recursivo) -->
                <template v-if="relation.type === 'sub-crud'">
                  <div class="row q-gutter-xs q-mb-xs">
                    <q-select
                      v-model="relation.crudName"
                      :options="availableCruds"
                      option-label="name"
                      option-value="name"
                      emit-value
                      map-options
                      label="CRUD Referenciado"
                      outlined
                      dense
                      class="col"
                      hint="Selecione um CRUD existente para reutilizar suas colunas e campos"
                      @update:model-value="(val) => onSubCrudSelected(index, val)"
                    >
                      <template v-slot:option="scope">
                        <q-item v-bind="scope.itemProps">
                          <q-item-section>
                            <q-item-label>{{ scope.opt.title }}</q-item-label>
                            <q-item-label caption>{{ scope.opt.name }}</q-item-label>
                          </q-item-section>
                        </q-item>
                      </template>
                    </q-select>
                    <q-input
                      v-model="relation.field"
                      label="Campo da Associação (hasMany)"
                      outlined
                      dense
                      class="col"
                      hint="Ex: MenuItems"
                    />
                    <q-input
                      v-model="relation.payloadField"
                      label="Campo no Payload"
                      outlined
                      dense
                      class="col"
                      hint="Ex: menuItems"
                    />
                  </div>
                  <q-banner v-if="relation.crudName" class="bg-blue-1 q-mt-sm" rounded>
                    <template v-slot:avatar>
                      <q-icon name="info" color="primary" />
                    </template>
                    O CRUD selecionado será usado para definir as colunas e campos do formulário.
                    As configurações serão carregadas automaticamente do CRUD referenciado.
                  </q-banner>
                </template>
              </q-card-section>
            </q-card>
          </div>
          <div v-if="config.relations.length === 0" class="text-center q-pa-lg text-grey">
            Nenhuma relação adicionada. Clique em "Adicionar Relação" para começar.
          </div>

          <!-- Dialog para adicionar relação -->
          <q-dialog v-model="showAddRelationDialog">
            <q-card style="min-width: 500px">
              <q-card-section>
                <div class="text-h6">Adicionar Relação</div>
              </q-card-section>
              <q-card-section>
                <q-select
                  v-model="newRelation.type"
                  :options="relationTypes"
                  option-label="label"
                  option-value="value"
                  emit-value
                  map-options
                  label="Tipo de Relação"
                  outlined
                  dense
                  class="q-mb-sm"
                />
                <q-select
                  v-model="newRelation.modelName"
                  :options="availableModels"
                  option-label="name"
                  option-value="name"
                  emit-value
                  map-options
                  label="Model Relacionada (Opcional)"
                  outlined
                  dense
                  clearable
                  class="q-mb-sm"
                  hint="Selecione uma model para preencher automaticamente os campos"
                  @update:model-value="onNewRelationModelSelected"
                >
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section>
                        <q-item-label>{{ scope.opt.name }}</q-item-label>
                        <q-item-label caption>{{ scope.opt.className }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
                <q-input
                  v-model="newRelation.label"
                  label="Label"
                  outlined
                  dense
                  class="q-mb-sm"
                />
                <template v-if="newRelation.type === 'select' || newRelation.type === 'transfer' || newRelation.type === 'multiselect'">
                  <q-input
                    v-model="newRelation.endpoint"
                    label="Endpoint"
                    outlined
                    dense
                    class="q-mb-sm"
                  />
                  <q-input
                    v-model="newRelation.field"
                    label="Campo no Response"
                    outlined
                    dense
                    class="q-mb-sm"
                  />
                  <template v-if="newRelation.type === 'select'">
                    <q-input
                      v-model="newRelation.dependsOn"
                      label="Depende de (Campo)"
                      outlined
                      dense
                      class="q-mb-sm"
                      hint="Campo ou relação que esta relação depende (ex: state_id ou State)"
                    />
                    <q-input
                      v-model="newRelation.filterParam"
                      label="Parâmetro de Filtro"
                      outlined
                      dense
                      class="q-mb-sm"
                      hint="Nome do parâmetro na API (ex: state_id). Se vazio, usa dependsOn"
                    />
                  </template>
                </template>
                <template v-if="newRelation.type === 'inline'">
                  <q-input
                    v-model="newRelation.addLabel"
                    label="Label do Botão Adicionar"
                    outlined
                    dense
                    class="q-mb-sm"
                    hint="Ex: Adicionar Endereço"
                  />
                  <q-input
                    v-model="newRelation.payloadField"
                    label="Campo no Payload"
                    outlined
                    dense
                    class="q-mb-sm"
                    hint="Ex: enderecos"
                  />
                </template>
                <template v-if="newRelation.type === 'sub-crud'">
                  <q-select
                    v-model="newRelation.crudName"
                    :options="availableCruds"
                    option-label="name"
                    option-value="name"
                    emit-value
                    map-options
                    label="CRUD Referenciado"
                    outlined
                    dense
                    clearable
                    class="q-mb-sm"
                    hint="Selecione um CRUD existente para reutilizar suas colunas e campos"
                    @update:model-value="onNewSubCrudSelected"
                  >
                    <template v-slot:option="scope">
                      <q-item v-bind="scope.itemProps">
                        <q-item-section>
                          <q-item-label>{{ scope.opt.title }}</q-item-label>
                          <q-item-label caption>{{ scope.opt.name }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                  <q-input
                    v-model="newRelation.field"
                    label="Campo da Associação (hasMany)"
                    outlined
                    dense
                    class="q-mb-sm"
                    hint="Ex: MenuItems"
                  />
                  <q-input
                    v-model="newRelation.payloadField"
                    label="Campo no Payload"
                    outlined
                    dense
                    class="q-mb-sm"
                    hint="Ex: menuItems"
                  />
                </template>
              </q-card-section>
              <q-card-actions align="right">
                <q-btn flat label="Cancelar" v-close-popup />
                <q-btn flat label="Adicionar" color="primary" @click="addRelation" v-close-popup />
              </q-card-actions>
            </q-card>
          </q-dialog>
        </q-tab-panel>


        <!-- Tab: JSON -->
        <q-tab-panel name="json" class="json-tab-panel">
          <div ref="monacoContainer" class="monaco-container"></div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- Dialog para gerenciar Actions (fora do tab-panel para funcionar corretamente) -->
    <q-dialog v-model="showActionsDialog" maximized>
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            Gerenciar Actions da Coluna: {{ editingColumn?.name || editingColumn?.label || 'Sem nome' }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense @click="cancelEditActions" />
        </q-card-section>
        <q-card-section>
          <div class="row q-gutter-md">
            <!-- Lista de Actions -->
            <div class="col-12 col-md-6">
              <div class="row q-mb-sm items-center">
                <div class="text-subtitle2">Items de Actions</div>
                <q-space />
                <q-btn
                  outline
                  color="primary"
                  icon="add"
                  label="Adicionar Item"
                  size="sm"
                  dense
                  @click="addActionItem"
                />
              </div>
              <q-list bordered separator v-if="actionItems && actionItems.length > 0">
                <q-item
                  v-for="(item, index) in actionItems"
                  :key="`action-item-${index}`"
                  clickable
                  @click="editActionItem(index)"
                  :class="{ 'bg-primary-1': editingActionIndex === index }"
                >
                  <q-item-section avatar>
                    <q-icon :name="item.icon || 'more_vert'" :color="item.color || 'primary'" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ item.tooltip || item.label || item.type || 'Action' }}</q-item-label>
                    <q-item-label caption>
                      Tipo: {{ item.type }} | Actions: {{ item.actions?.length || 0 }} | Roles: {{ item.roles?.length || 0 }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      flat
                      round
                      dense
                      color="negative"
                      icon="delete"
                      @click.stop="removeActionItem(index)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
              <q-banner v-else class="bg-grey-2">
                <template v-slot:avatar>
                  <q-icon name="info" color="grey" />
                </template>
                Nenhum item de action adicionado. Clique em "Adicionar Item" para criar um novo.
              </q-banner>
            </div>

            <!-- Editor de Action -->
            <div class="col-12 col-md-6">
              <div v-if="editingAction" class="q-pa-md bg-grey-1 rounded-borders">
                <div class="text-subtitle2 q-mb-md">Editar Action Item</div>
                
                <q-select
                  v-model="editingAction.type"
                  :options="actionTypes"
                  option-label="label"
                  option-value="value"
                  emit-value
                  map-options
                  label="Tipo"
                  outlined
                  dense
                  class="q-mb-sm"
                  @update:model-value="editingAction.icon = actionTypes.find(t => t.value === editingAction.type)?.icon || 'more_vert'"
                />

                <q-input
                  v-model="editingAction.icon"
                  label="Ícone"
                  outlined
                  dense
                  class="q-mb-sm"
                  hint="Nome do ícone do Material Icons"
                />

                <q-select
                  v-model="editingAction.color"
                  :options="actionColors"
                  option-label="label"
                  option-value="value"
                  emit-value
                  map-options
                  label="Cor"
                  outlined
                  dense
                  class="q-mb-sm"
                />

                <q-input
                  v-model="editingAction.tooltip"
                  label="Tooltip"
                  outlined
                  dense
                  class="q-mb-sm"
                />

                <q-input
                  v-model="editingAction.label"
                  label="Label (opcional)"
                  outlined
                  dense
                  class="q-mb-sm"
                />

                <q-toggle
                  v-model="editingAction.flat"
                  label="Botão Flat"
                  class="q-mb-sm"
                />

                <q-toggle
                  v-model="editingAction.round"
                  label="Botão Round"
                  class="q-mb-sm"
                />

                <q-toggle
                  v-model="editingAction.dense"
                  label="Botão Dense"
                  class="q-mb-sm"
                />

                <q-select
                  v-model="editingAction.size"
                  :options="['xs', 'sm', 'md', 'lg', 'xl']"
                  label="Tamanho"
                  outlined
                  dense
                  class="q-mb-sm"
                />

                <!-- Actions (array de actions a executar) -->
                <div class="q-mb-md">
                  <div class="row q-mb-sm items-center">
                    <div class="text-caption text-weight-bold">Actions a Executar</div>
                    <q-space />
                    <q-btn
                      outline
                      color="primary"
                      icon="add"
                      size="sm"
                      dense
                      @click="addActionToItem"
                    />
                  </div>
                  <q-list bordered separator dense v-if="editingAction.actions && editingAction.actions.length > 0">
                    <q-item
                      v-for="(action, actionIndex) in editingAction.actions"
                      :key="actionIndex"
                    >
                      <q-item-section>
                        <q-input
                          v-model="editingAction.actions[actionIndex]"
                          dense
                          outlined
                          placeholder="Ex: delete, edit, refresh, route:/path"
                        />
                      </q-item-section>
                      <q-item-section side>
                        <q-btn
                          flat
                          round
                          dense
                          color="negative"
                          icon="delete"
                          @click="removeActionFromItem(actionIndex)"
                        />
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <q-banner v-else class="bg-grey-2">
                    Nenhuma action definida. Use abreviações como 'delete', 'edit', 'refresh' ou objetos JSON completos.
                  </q-banner>
                </div>

                <!-- Roles -->
                <div class="q-mb-md">
                  <div class="row q-mb-sm items-center">
                    <div class="text-caption text-weight-bold">Roles (Permissões)</div>
                    <q-space />
                    <q-btn
                      outline
                      color="primary"
                      icon="add"
                      size="sm"
                      dense
                      @click="addRoleToAction"
                    />
                  </div>
                  <q-list bordered separator dense v-if="editingAction.roles && editingAction.roles.length > 0">
                    <q-item
                      v-for="(role, roleIndex) in editingAction.roles"
                      :key="roleIndex"
                    >
                      <q-item-section>
                        <q-input
                          v-model="editingAction.roles[roleIndex]"
                          dense
                          outlined
                          placeholder="Ex: addr.manter_paises"
                        />
                      </q-item-section>
                      <q-item-section side>
                        <q-btn
                          flat
                          round
                          dense
                          color="negative"
                          icon="delete"
                          @click="removeRoleFromAction(roleIndex)"
                        />
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <q-banner v-else class="bg-grey-2">
                    Nenhuma role definida. O botão será exibido para todos os usuários.
                  </q-banner>
                </div>

                <!-- Condition -->
                <q-input
                  v-model="editingAction.condition"
                  label="Condição (opcional)"
                  outlined
                  dense
                  type="textarea"
                  rows="2"
                  hint="Expressão JavaScript ou função. Ex: row.status === 'active'"
                  class="q-mb-sm"
                />

                <div class="row q-gutter-sm">
                  <q-btn
                    flat
                    label="Cancelar"
                    color="negative"
                    @click="cancelEditAction"
                  />
                  <q-space />
                  <q-btn
                    label="Salvar Item"
                    color="primary"
                    @click="saveActionItem"
                  />
                </div>
              </div>
              <q-banner v-else class="bg-grey-2">
                Selecione um item da lista ou clique em "Adicionar Item" para criar um novo.
              </q-banner>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" @click="cancelEditActions" />
          <q-btn label="Salvar Actions" color="primary" @click="saveActions" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter, useRoute } from 'vue-router';
import { api } from '../boot/axios';
import { useAuthStore } from '../stores/auth';
import loader from '@monaco-editor/loader';
import draggable from 'vuedraggable';
import IconPicker from '../components/IconPicker.vue';

const $q = useQuasar();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isNew = ref(false);
const crudId = ref(null);
const isSystem = ref(false);

// Verificar DEV_MODE do ambiente (variável deve ser configurada no .env como VITE_DEV_MODE=true)
// No Quasar/Vite, variáveis de ambiente devem começar com VITE_ para serem expostas ao frontend
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true' || import.meta.env.DEV_MODE === 'true';

// Verificar se o usuário é admin (tem função de manter CRUDs)
const isAdmin = computed(() => {
  return authStore.hasFunction('crud.manter_cruds') || 
         authStore.hasFunction('crud.visualizar_cruds');
});

// Computed para verificar se pode editar interface de sistema
const canEditSystem = computed(() => {
  // Se não for sistema, sempre pode editar
  if (!isSystem.value) return true;
  
  // Se for sistema, só pode editar se DEV_MODE estiver ativo E usuário for admin
  return DEV_MODE && isAdmin.value;
});
const tab = ref('basic');
const monacoContainer = ref(null);
let monacoEditor = null;

const availableModels = ref([]);
const loadingModels = ref(false);
const selectedModel = ref(null);
const selectedModelData = ref(null);
const availableCruds = ref([]);
const loadingCruds = ref(false);
const showAddRelationDialog = ref(false);
const newRelation = ref({
  type: 'select',
  modelName: null,
  label: '',
  endpoint: '',
  field: '',
  itemLabel: 'name',
  itemValue: 'id',
  payloadField: '',
  availableLabel: 'Disponíveis',
  selectedLabel: 'Selecionados',
  addLabel: 'Adicionar',
  fields: [],
  crudName: null,
  id_crud: null,
  dependsOn: null,
  filterParam: null
});

const tablePreviewColumns = [
  { name: 'drag', label: '', field: 'drag', align: 'left', sortable: false },
  { name: 'name', label: 'Nome', field: 'name', align: 'left', sortable: true },
  { name: 'label', label: 'Label', field: 'label', align: 'left', sortable: true },
  { name: 'align', label: 'Alinhamento', field: 'align', align: 'center', sortable: true },
  { name: 'field', label: 'Field', field: 'field', align: 'left', sortable: true },
  { name: 'sortable', label: 'Ordenável', field: 'sortable', align: 'center', sortable: false },
  { name: 'required', label: 'Obrigatório', field: 'required', align: 'center', sortable: false },
  { name: 'actions', label: 'Ações', field: 'actions', align: 'right', sortable: false }
];

const crudForm = ref({
  name: '',
  title: '',
  icon: 'settings',
  resource: '',
  endpoint: '',
  active: true
});

const config = ref({
  title: '',
  icon: 'settings',
  resource: '',
  endpoint: '',
  rowKey: 'id',
  createRoute: '',
  editRoute: '',
  deleteMessage: '',
  deleteSuccessMessage: '',
  createLabel: '',
  showSearch: true,
  showFab: true,
  columns: [],
  fields: [],
  layouts: [],
  relations: []
});

const showAddFieldDialog = ref(false);
const newField = ref({
  name: '',
  label: '',
  type: 'text'
});

const showActionsDialog = ref(false);
const editingColumnIndex = ref(-1);
const editingColumn = ref(null);
const actionItems = ref([]);
const editingActionIndex = ref(-1);
const editingAction = ref(null);

const actionTypes = [
  { label: 'Editar', value: 'edit', icon: 'edit' },
  { label: 'Excluir', value: 'delete', icon: 'delete' },
  { label: 'Visualizar', value: 'view', icon: 'visibility' },
  { label: 'Adicionar', value: 'add', icon: 'add' },
  { label: 'Salvar', value: 'save', icon: 'save' },
  { label: 'Cancelar', value: 'cancel', icon: 'cancel' },
  { label: 'Download', value: 'download', icon: 'download' },
  { label: 'Upload', value: 'upload', icon: 'upload' },
  { label: 'Imprimir', value: 'print', icon: 'print' },
  { label: 'Exportar', value: 'export', icon: 'file_download' },
  { label: 'Importar', value: 'import', icon: 'file_upload' },
  { label: 'Customizado', value: 'custom', icon: 'more_vert' }
];

const actionColors = [
  { label: 'Primário', value: 'primary' },
  { label: 'Secundário', value: 'secondary' },
  { label: 'Negativo', value: 'negative' },
  { label: 'Positivo', value: 'positive' },
  { label: 'Info', value: 'info' },
  { label: 'Aviso', value: 'warning' }
];

const fieldTypes = ['text', 'email', 'password', 'number', 'textarea', 'select', 'color', 'file', 'date', 'component'];

const relationTypes = [
  { label: 'Select Simples (belongsTo)', value: 'select' },
  { label: 'Transfer List (belongsToMany)', value: 'transfer' },
  { label: 'Multi Select (belongsToMany)', value: 'multiselect' },
  { label: 'Formulário Inline (hasMany)', value: 'inline' },
  { label: 'Sub-CRUD (Recursivo)', value: 'sub-crud' }
];


function updateColumn(column) {
  // Trigger reactivity
}

function updateColumnName(column) {
  // Se o nome for "actions", garantir que tenha a estrutura correta
  if (column.name === 'actions') {
    if (!column.items) {
      column.items = [];
    }
    column.align = column.align || 'right';
    column.sortable = false;
  }
  updateColumn(column);
}

async function editColumnActions(column, index) {
  console.log('editColumnActions chamado', { column, index });
  editingColumnIndex.value = index;
  editingColumn.value = { ...column };
  
  // Garantir que items existe e é um array
  if (!column.items || !Array.isArray(column.items)) {
    if (!config.value.columns[index].items) {
      config.value.columns[index].items = [];
    }
    column.items = config.value.columns[index].items;
  }
  
  // Fazer deep copy do array
  try {
    actionItems.value = Array.isArray(column.items) && column.items.length > 0
      ? JSON.parse(JSON.stringify(column.items))
      : [];
  } catch (e) {
    console.error('Erro ao copiar items:', e);
    actionItems.value = [];
  }
  
  editingActionIndex.value = -1;
  editingAction.value = null;
  
  // Usar nextTick para garantir que o Vue atualize antes de abrir o dialog
  await nextTick();
  console.log('Abrindo dialog, showActionsDialog será:', true);
  showActionsDialog.value = true;
  console.log('showActionsDialog após setar:', showActionsDialog.value);
}

function saveActions() {
  if (editingColumnIndex.value >= 0 && editingColumn.value) {
    // Garantir que a propriedade items existe
    if (!config.value.columns[editingColumnIndex.value].items) {
      config.value.columns[editingColumnIndex.value].items = [];
    }
    config.value.columns[editingColumnIndex.value].items = JSON.parse(JSON.stringify(actionItems.value));
    // Forçar reatividade
    updateColumn(config.value.columns[editingColumnIndex.value]);
  }
  showActionsDialog.value = false;
  editingColumnIndex.value = -1;
  editingColumn.value = null;
  actionItems.value = [];
  editingActionIndex.value = -1;
  editingAction.value = null;
}

function cancelEditActions() {
  showActionsDialog.value = false;
  editingColumnIndex.value = -1;
  editingColumn.value = null;
  actionItems.value = [];
  editingActionIndex.value = -1;
  editingAction.value = null;
}

function addActionItem() {
  editingActionIndex.value = -1;
  editingAction.value = {
    type: 'edit',
    icon: 'edit',
    color: 'primary',
    tooltip: '',
    label: '',
    actions: [],
    roles: [],
    condition: null,
    flat: true,
    round: false,
    dense: true,
    size: 'sm'
  };
}

function editActionItem(index) {
  editingActionIndex.value = index;
  editingAction.value = JSON.parse(JSON.stringify(actionItems.value[index]));
}

function saveActionItem() {
  if (editingActionIndex.value >= 0) {
    actionItems.value[editingActionIndex.value] = JSON.parse(JSON.stringify(editingAction.value));
  } else {
    actionItems.value.push(JSON.parse(JSON.stringify(editingAction.value)));
  }
  editingActionIndex.value = -1;
  editingAction.value = null;
}

function removeActionItem(index) {
  actionItems.value.splice(index, 1);
}

function cancelEditAction() {
  editingActionIndex.value = -1;
  editingAction.value = null;
}

function addActionToItem() {
  if (!editingAction.value.actions) {
    editingAction.value.actions = [];
  }
  editingAction.value.actions.push('refresh');
}

function removeActionFromItem(actionIndex) {
  editingAction.value.actions.splice(actionIndex, 1);
}

function addRoleToAction() {
  if (!editingAction.value.roles) {
    editingAction.value.roles = [];
  }
  editingAction.value.roles.push('');
}

function removeRoleFromAction(roleIndex) {
  editingAction.value.roles.splice(roleIndex, 1);
}

function destroyMonacoEditor() {
  if (monacoEditor) {
    try {
      monacoEditor.dispose();
      monacoEditor = null;
    } catch (error) {
      console.error('Erro ao destruir Monaco Editor:', error);
    }
  }
}

async function initializeMonaco() {
  if (!monacoContainer.value) return;
  
  // Destruir editor existente se houver
  destroyMonacoEditor();
  
  try {
    const monaco = await loader.init();
    
    monacoEditor = monaco.editor.create(monacoContainer.value, {
      value: JSON.stringify(config.value, null, 2),
      language: 'json',
      theme: 'vs',
      automaticLayout: true,
      readOnly: false,
      minimap: { enabled: true },
      scrollBeyondLastLine: false
    });
  } catch (error) {
    console.error('Erro ao inicializar Monaco Editor:', error);
  }
}

function updateMonacoEditor() {
  if (monacoEditor && monacoContainer.value) {
    try {
      monacoEditor.setValue(JSON.stringify(config.value, null, 2));
    } catch (error) {
      console.error('Erro ao atualizar Monaco Editor:', error);
      // Se houver erro, tentar recriar o editor
      destroyMonacoEditor();
      initializeMonaco();
    }
  }
}

function applyJsonFromEditor() {
  if (monacoEditor) {
    try {
      const jsonValue = monacoEditor.getValue();
      const parsedConfig = JSON.parse(jsonValue);
      
      // Atualizar config com o JSON do editor
      config.value = { ...parsedConfig };
      
      // Sincronizar dados básicos com crudForm
      if (parsedConfig.title) crudForm.value.title = parsedConfig.title;
      if (parsedConfig.icon) crudForm.value.icon = parsedConfig.icon;
      if (parsedConfig.resource) crudForm.value.resource = parsedConfig.resource;
      if (parsedConfig.endpoint) crudForm.value.endpoint = parsedConfig.endpoint;
      
      // Garantir que fields tenham layout properties
      if (config.value.fields) {
        config.value.fields.forEach(field => {
          if (field.layoutIndex === undefined) field.layoutIndex = -1;
          if (field.row === undefined) field.row = -1;
          if (field.col === undefined) field.col = -1;
          if (field.index === undefined) field.index = -1;
        });
      }
      
      // Reconstruir layouts se necessário
      if (config.value.layouts) {
        config.value.layouts.forEach(layout => {
          if (!layout.rows) layout.rows = [];
          layout.rows.forEach(row => {
            if (!row.cols) row.cols = [];
            row.cols.forEach(col => {
              if (!col.fields) col.fields = [];
            });
          });
        });
      }
      
      $q.notify({
        color: 'positive',
        message: 'JSON aplicado com sucesso!',
        icon: 'check',
        position: 'top',
        timeout: 2000
      });
    } catch (error) {
      $q.notify({
        color: 'negative',
        message: 'Erro ao aplicar JSON: ' + error.message,
        icon: 'error',
        position: 'top'
      });
    }
  }
}

// Watch para debug do dialog de actions
watch(() => showActionsDialog.value, (newVal) => {
  console.log('showActionsDialog mudou para:', newVal);
});

watch(() => tab.value, async (newTab, oldTab) => {
  // Quando sair da aba JSON, aplicar o JSON do editor ao config e destruir o editor
  if (oldTab === 'json' && newTab !== 'json') {
    applyJsonFromEditor();
    // Destruir o editor quando sair da aba para evitar problemas ao retornar
    destroyMonacoEditor();
  }
  
  // Quando entrar na aba JSON, sempre recriar o editor
  if (newTab === 'json') {
    await nextTick();
    // Aguardar um pouco mais para garantir que o DOM está pronto
    await new Promise(resolve => setTimeout(resolve, 150));
    
    if (!monacoContainer.value) {
      console.warn('Monaco container não encontrado');
      return;
    }
    
    // Sempre recriar o editor ao entrar na aba JSON para evitar problemas
    await initializeMonaco();
  }
});

onMounted(async () => {
  await loadAvailableModels();
  await loadAvailableCruds();
  const id = route.params.id;
  if (id === 'new') {
    isNew.value = true;
    initializeConfig();
  } else {
    crudId.value = id;
    await loadCrud();
  }
});

onBeforeUnmount(() => {
  destroyMonacoEditor();
});

function initializeConfig() {
  config.value = {
    title: crudForm.value.title || '',
    icon: crudForm.value.icon || 'settings',
    resource: crudForm.value.resource || '',
    endpoint: crudForm.value.endpoint || '',
    rowKey: 'id',
    createRoute: '',
    editRoute: '',
    deleteMessage: '',
    deleteSuccessMessage: '',
    createLabel: '',
    showSearch: true,
    showFab: true,
    columns: [],
    fields: [],
    layouts: [],
    relations: []
  };
}

function addColumn() {
  config.value.columns.push({
    name: '',
    label: '',
    align: 'left',
    field: '',
    sortable: false,
    required: false
  });
}

function removeColumn(index) {
  config.value.columns.splice(index, 1);
}

function addLayout() {
  config.value.layouts.push({
    title: '',
    rows: [
      {
        cols: [
          { fields: [] }
        ]
      }
    ]
  });
}

function removeLayout(index) {
  // Remover campos do layout antes de remover
  config.value.layouts[index].rows.forEach(row => {
    row.cols.forEach(col => {
      col.fields.forEach(field => {
        const fieldIndex = config.value.fields.findIndex(f => f.name === field.name);
        if (fieldIndex >= 0) {
          config.value.fields.splice(fieldIndex, 1);
        }
      });
    });
  });
  config.value.layouts.splice(index, 1);
}

function addRowToLayout(layoutIndex) {
  config.value.layouts[layoutIndex].rows.push({
    cols: [
      { fields: [] }
    ]
  });
}

function removeRow(layoutIndex, rowIndex) {
  const layout = config.value.layouts[layoutIndex];
  if (layout.rows.length <= 1) return;
  
  // Remover campos da linha
  layout.rows[rowIndex].cols.forEach(col => {
    col.fields.forEach(field => {
      const fieldIndex = config.value.fields.findIndex(f => f.name === field.name);
      if (fieldIndex >= 0) {
        config.value.fields.splice(fieldIndex, 1);
      }
    });
  });
  
  layout.rows.splice(rowIndex, 1);
}

function addColumnToRow(layoutIndex, rowIndex) {
  config.value.layouts[layoutIndex].rows[rowIndex].cols.push({
    fields: []
  });
}

function removeColumnFromRow(layoutIndex, rowIndex, colIndex) {
  const row = config.value.layouts[layoutIndex].rows[rowIndex];
  if (row.cols.length <= 1) return;
  
  // Remover campos da coluna
  row.cols[colIndex].fields.forEach(field => {
    const fieldIndex = config.value.fields.findIndex(f => f.name === field.name);
    if (fieldIndex >= 0) {
      config.value.fields.splice(fieldIndex, 1);
    }
  });
  
  row.cols.splice(colIndex, 1);
}

function addFieldToUnassigned() {
  const field = {
    name: newField.value.name || `field_${Date.now()}`,
    label: newField.value.label,
    type: newField.value.type || 'text',
    default: '',
    skipIfEmpty: false,
    layoutIndex: -1,
    row: -1,
    col: -1,
    index: -1
  };
  
  // Adicionar ao array de fields
  config.value.fields.push(field);
  
  // Se não houver layouts, criar um layout padrão e adicionar o campo
  if (!config.value.layouts || config.value.layouts.length === 0) {
    config.value.layouts = [{
      title: '',
      rows: [{
        cols: [{ fields: [] }]
      }]
    }];
  }
  
  // Adicionar à primeira coluna do primeiro layout
  const firstLayout = config.value.layouts[0];
  if (firstLayout.rows.length === 0) {
    firstLayout.rows.push({ cols: [{ fields: [] }] });
  }
  const firstRow = firstLayout.rows[0];
  if (firstRow.cols.length === 0) {
    firstRow.cols.push({ fields: [] });
  }
  firstRow.cols[0].fields.push(field);
  
  // Atualizar propriedades do campo
  field.layoutIndex = 0;
  field.row = 0;
  field.col = 0;
  field.index = firstRow.cols[0].fields.length - 1;
  
  newField.value = { name: '', label: '', type: 'text' };
}

function onFieldAdd(evt, layoutIndex, rowIndex, colIndex) {
  // Quando um campo é adicionado via drag-and-drop
  const addedElement = evt.added?.element;
  if (addedElement) {
    // Atualizar propriedades do campo
    addedElement.layoutIndex = layoutIndex;
    addedElement.row = rowIndex;
    addedElement.col = colIndex;
    addedElement.index = evt.newIndex;
    
    // Garantir que o campo está no array de fields
    const fieldInArray = config.value.fields.find(f => f.name === addedElement.name);
    if (!fieldInArray) {
      config.value.fields.push({ ...addedElement });
    } else {
      // Atualizar propriedades no array
      fieldInArray.layoutIndex = layoutIndex;
      fieldInArray.row = rowIndex;
      fieldInArray.col = colIndex;
      fieldInArray.index = evt.newIndex;
    }
  }
}

function removeFieldFromLayout(fieldName) {
  // Remover de todos os layouts
  config.value.layouts.forEach(layout => {
    layout.rows.forEach(row => {
      row.cols.forEach(col => {
        const index = col.fields.findIndex(f => f.name === fieldName);
        if (index >= 0) {
          col.fields.splice(index, 1);
        }
      });
    });
  });
  
  // Remover do array de fields
  const fieldIndex = config.value.fields.findIndex(f => f.name === fieldName);
  if (fieldIndex >= 0) {
    config.value.fields.splice(fieldIndex, 1);
  }
}

function addRelation() {
  const relation = {
    type: newRelation.value.type || 'select',
    modelName: newRelation.value.modelName || null,
    label: newRelation.value.label || '',
    endpoint: newRelation.value.endpoint || '',
    field: newRelation.value.field || '',
    itemLabel: newRelation.value.itemLabel || 'name',
    itemValue: newRelation.value.itemValue || 'id',
    availableLabel: newRelation.value.availableLabel || 'Disponíveis',
    selectedLabel: newRelation.value.selectedLabel || 'Selecionados',
    payloadField: newRelation.value.payloadField || '',
    addLabel: newRelation.value.addLabel || 'Adicionar',
    fields: newRelation.value.fields || [],
    crudName: newRelation.value.crudName || null,
    id_crud: newRelation.value.id_crud || null,
    dependsOn: newRelation.value.dependsOn || null,
    filterParam: newRelation.value.filterParam || null
  };
  
  config.value.relations.push(relation);
  
  // Resetar formulário
  newRelation.value = {
    type: 'select',
    modelName: null,
    label: '',
    endpoint: '',
    field: '',
    itemLabel: 'name',
    itemValue: 'id',
    payloadField: '',
    availableLabel: 'Disponíveis',
    selectedLabel: 'Selecionados',
    addLabel: 'Adicionar',
    fields: [],
    crudName: null,
    id_crud: null,
    dependsOn: null,
    filterParam: null
  };
}

function removeRelation(index) {
  config.value.relations.splice(index, 1);
}

function showAddInlineFieldDialog(relationIndex) {
  const relation = config.value.relations[relationIndex];
  if (!relation) return;
  
  if (!relation.fields) {
    relation.fields = [];
  }
  
  // Adicionar um novo campo inline vazio
  relation.fields.push({
    name: '',
    label: '',
    type: 'text',
    required: false,
    colClass: 'col-12'
  });
}

function removeInlineField(relationIndex, fieldIndex) {
  const relation = config.value.relations[relationIndex];
  if (!relation || !relation.fields) return;
  
  relation.fields.splice(fieldIndex, 1);
}

async function loadAvailableModels() {
  loadingModels.value = true;
  try {
    const response = await api.get('/api/models');
    availableModels.value = response.data || [];
  } catch (error) {
    console.error('Erro ao carregar models:', error);
    $q.notify({
      color: 'negative',
      message: 'Erro ao carregar models disponíveis',
      icon: 'warning'
    });
  } finally {
    loadingModels.value = false;
  }
}

async function loadAvailableCruds() {
  loadingCruds.value = true;
  try {
    const response = await api.get('/api/cruds');
    availableCruds.value = response.data || [];
  } catch (error) {
    console.error('Erro ao carregar CRUDs:', error);
    $q.notify({
      color: 'negative',
      message: 'Erro ao carregar CRUDs disponíveis',
      icon: 'warning'
    });
  } finally {
    loadingCruds.value = false;
  }
}

function onSubCrudSelected(index, crudName) {
  const relation = config.value.relations[index];
  if (!relation || !crudName) return;
  
  // Encontrar o CRUD selecionado
  const selectedCrud = availableCruds.value.find(c => c.name === crudName);
  if (selectedCrud) {
    relation.id_crud = selectedCrud.id;
    // Preencher label se estiver vazio
    if (!relation.label) {
      relation.label = selectedCrud.title || selectedCrud.name;
    }
  }
}

function onNewSubCrudSelected(crudName) {
  if (!crudName) {
    newRelation.value.id_crud = null;
    return;
  }
  
  // Encontrar o CRUD selecionado
  const selectedCrud = availableCruds.value.find(c => c.name === crudName);
  if (selectedCrud) {
    newRelation.value.id_crud = selectedCrud.id;
    // Preencher label se estiver vazio
    if (!newRelation.value.label) {
      newRelation.value.label = selectedCrud.title || selectedCrud.name;
    }
  }
}

async function onModelSelected(modelName) {
  // Garantir que modelName é uma string
  const modelNameStr = typeof modelName === 'string' ? modelName : (modelName?.name || modelName);
  
  if (!modelNameStr) {
    selectedModel.value = null;
    selectedModelData.value = null;
    return;
  }

  try {
    const response = await api.get(`/api/models/${modelNameStr}`);
    selectedModelData.value = response.data;
    
    // Usar o nome normalizado da model (se disponível) ou o nome selecionado
    const normalizedModelName = response.data.name || modelNameStr; // Usar name normalizado se disponível
    
    // Preencher automaticamente campos básicos
    if (isNew.value) {
      crudForm.value.name = normalizedModelName;
      crudForm.value.title = formatModelTitle(normalizedModelName);
      crudForm.value.resource = normalizedModelName;
      crudForm.value.endpoint = `/api/${normalizedModelName}`;
      
      // Gerar rotas automaticamente usando o nome normalizado
      config.value.createRoute = `/crud/${normalizedModelName}/new`;
      config.value.editRoute = `/crud/${normalizedModelName}/:id`;
    }
  } catch (error) {
    console.error('Erro ao carregar dados da model:', error);
    $q.notify({
      color: 'negative',
      message: 'Erro ao carregar dados da model',
      icon: 'warning'
    });
  }
}

function formatModelTitle(name) {
  // Converter snake_case ou camelCase para título legível
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

async function applyModelData() {
  if (!selectedModelData.value) {
    $q.notify({
      color: 'warning',
      message: 'Nenhuma model selecionada',
      icon: 'warning'
    });
    return;
  }

  const modelData = selectedModelData.value;
  
  // Confirmar se deseja aplicar (pode sobrescrever dados existentes)
  $q.dialog({
    title: 'Aplicar dados da Model',
    message: 'Isso irá preencher automaticamente os campos básicos, rotas, colunas e formulário. Campos já preenchidos serão mantidos quando possível. Deseja continuar?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    applyModelDataConfirmed(modelData);
  });
}

function applyModelDataConfirmed(modelData) {
  
  // Preencher campos básicos se ainda não preenchidos
  if (!crudForm.value.name) {
    crudForm.value.name = selectedModel.value;
  }
  if (!crudForm.value.title) {
    crudForm.value.title = formatModelTitle(selectedModel.value);
  }
  if (!crudForm.value.resource) {
    crudForm.value.resource = selectedModel.value;
  }
  if (!crudForm.value.endpoint) {
    crudForm.value.endpoint = `/api/${selectedModel.value}`;
  }

  // Gerar rotas se ainda não preenchidas
  if (!config.value.createRoute) {
    config.value.createRoute = `/crud/${selectedModel.value}/new`;
  }
  if (!config.value.editRoute) {
    config.value.editRoute = `/crud/${selectedModel.value}/:id`;
  }

  // Preencher colunas baseadas nos campos da model (apenas se não houver colunas)
  // A IA decidirá quais campos são importantes através das diretrizes do SYSTEM_PROMPT.md
  // Aqui apenas excluímos campos técnicos padrão e deixamos todos os outros disponíveis
  if (modelData.fields && modelData.fields.length > 0 && config.value.columns.length === 0) {
    const fields = modelData.fields.filter(f => 
      f.name !== 'id' && 
      f.name !== 'createdAt' && 
      f.name !== 'updatedAt' && 
      f.name !== 'deletedAt' &&
      !f.primaryKey
    );
    
    // Criar colunas para todos os campos (a IA pode editar depois para escolher os mais importantes)
    config.value.columns = fields.map(field => ({
      name: field.name,
      label: formatModelTitle(field.name),
      align: 'left',
      field: field.name,
      sortable: true,
      required: !field.allowNull
    }));
  }

  // Preencher campos do formulário baseados nos campos da model (apenas se não houver layouts)
  // A IA decidirá como organizar os layouts através das diretrizes do SYSTEM_PROMPT.md
  // Aqui apenas criamos um layout básico com todos os campos - a IA pode reorganizar depois
  if (modelData.fields && modelData.fields.length > 0 && config.value.layouts.length === 0) {
    const fields = modelData.fields.filter(f => 
      f.name !== 'createdAt' && f.name !== 'updatedAt' && f.name !== 'deletedAt' && !f.primaryKey
    );
    
    // Criar campos do formulário
    const formFields = fields.map(field => ({
      name: field.name,
      label: formatModelTitle(field.name),
      type: mapFieldTypeToFormType(field.type),
      default: '',
      skipIfEmpty: false
    }));

    // Criar layout básico - a IA pode reorganizar depois seguindo as diretrizes
    // de agrupar campos logicamente e colocá-los lado a lado quando apropriado
    config.value.layouts = [{
      title: '',
      rows: formFields.map(field => ({
        cols: [{ fields: [field] }]
      }))
    }];

    // Adicionar também ao array de fields
    config.value.fields = formFields;
  }

  // Preencher relações baseadas nas associações da model (apenas se não houver relações)
  if (modelData.associations && modelData.associations.length > 0) {
    const manyToManyAssociations = modelData.associations.filter(assoc => 
      assoc.type === 'belongsToMany' || assoc.type === 'hasMany'
    );

    // Processar todas as associações (não apenas manyToMany)
    if (modelData.associations.length > 0 && config.value.relations.length === 0) {
      config.value.relations = modelData.associations.map(assoc => {
        const targetModelName = assoc.target.toLowerCase();
        
        // Determinar tipo de relação baseado no tipo de associação
        let relationType;
        if (assoc.type === 'hasMany') {
          relationType = 'inline';
        } else if (assoc.type === 'belongsTo') {
          relationType = 'select';
        } else {
          relationType = 'multiselect';
        }
        
        const relation = {
          type: relationType,
          modelName: targetModelName,
          label: formatModelTitle(targetModelName),
          field: targetModelName,
          itemLabel: 'name',
          itemValue: 'id',
          payloadField: relationType === 'inline' ? targetModelName : (relationType === 'select' ? `${targetModelName}_id` : `${targetModelName}Ids`)
        };
        
        if (relationType === 'inline') {
          // Para relações inline (hasMany), precisamos buscar os campos da model relacionada
          relation.addLabel = `Adicionar ${formatModelTitle(targetModelName)}`;
          relation.fields = []; // Será preenchido quando a model relacionada for carregada
        } else if (relationType === 'select') {
          // Para select (belongsTo)
          relation.endpoint = `/api/${targetModelName}`;
        } else {
          // Para transfer/multiselect (belongsToMany)
          relation.endpoint = `/api/${targetModelName}`;
          relation.availableLabel = 'Disponíveis';
          relation.selectedLabel = 'Selecionados';
        }
        
        return relation;
      });
    }
  }

  $q.notify({
    color: 'positive',
    message: 'Dados da model aplicados com sucesso!',
    icon: 'check'
  });
}

function mapFieldTypeToFormType(sequelizeType) {
  const typeMap = {
    'STRING': 'text',
    'TEXT': 'textarea',
    'INTEGER': 'number',
    'BIGINT': 'number',
    'FLOAT': 'number',
    'DOUBLE': 'number',
    'DECIMAL': 'number',
    'BOOLEAN': 'select',
    'DATE': 'date',
    'DATEONLY': 'date',
    'TIME': 'text',
    'UUID': 'text',
    'JSON': 'textarea',
    'JSONB': 'textarea',
    'BLOB': 'file',
    'ENUM': 'select'
  };
  
  return typeMap[sequelizeType?.toUpperCase()] || 'text';
}

function onRelationTypeChanged(index, newType) {
  const relation = config.value.relations[index];
  if (!relation) return;
  
  // Limpar campos específicos quando mudar o tipo
  if (newType === 'sub-crud') {
    // Limpar campos que não são usados em sub-crud
    relation.endpoint = '';
    relation.itemLabel = '';
    relation.itemValue = '';
    relation.availableLabel = '';
    relation.selectedLabel = '';
    relation.addLabel = '';
    relation.fields = [];
    relation.modelName = null;
    // Garantir que crudName e id_crud existam
    if (!relation.crudName) relation.crudName = null;
    if (!relation.id_crud) relation.id_crud = null;
  } else {
    // Limpar campos específicos de sub-crud quando mudar para outro tipo
    relation.crudName = null;
    relation.id_crud = null;
  }
}

function onRelationModelSelected(index, modelName) {
  // Garantir que modelName é uma string
  const modelNameStr = typeof modelName === 'string' ? modelName : (modelName?.name || modelName);
  
  if (!modelNameStr) return;
  
  const relation = config.value.relations[index];
  if (!relation) return;

  // Preencher campos da relação baseado na model selecionada
  relation.endpoint = `/api/${modelNameStr}`;
  relation.field = modelNameStr;
  relation.itemLabel = 'name';
  relation.itemValue = 'id';
  
  // Para tipo 'select' (belongsTo), usar formato 'model_id', para outros usar 'modelIds'
  if (relation.type === 'select') {
    relation.payloadField = `${modelNameStr}_id`;
  } else {
    relation.payloadField = `${modelNameStr}Ids`;
  }
  
  if (!relation.label) {
    relation.label = formatModelTitle(modelNameStr);
  }
  if (!relation.availableLabel) {
    relation.availableLabel = 'Disponíveis';
  }
  if (!relation.selectedLabel) {
    relation.selectedLabel = 'Selecionados';
  }
}

function onNewRelationModelSelected(modelName) {
  // Garantir que modelName é uma string
  const modelNameStr = typeof modelName === 'string' ? modelName : (modelName?.name || modelName);
  
  if (!modelNameStr) return;
  
  // Preencher campos da nova relação baseado na model selecionada
  newRelation.value.endpoint = `/api/${modelNameStr}`;
  newRelation.value.field = modelNameStr;
  newRelation.value.itemLabel = 'name';
  newRelation.value.itemValue = 'id';
  
  // Para tipo 'select' (belongsTo), usar formato 'model_id', para outros usar 'modelIds'
  if (newRelation.value.type === 'select') {
    newRelation.value.payloadField = `${modelNameStr}_id`;
  } else {
    newRelation.value.payloadField = `${modelNameStr}Ids`;
  }
  
  if (!newRelation.value.label) {
    newRelation.value.label = formatModelTitle(modelNameStr);
  }
  if (!newRelation.value.availableLabel) {
    newRelation.value.availableLabel = 'Disponíveis';
  }
  if (!newRelation.value.selectedLabel) {
    newRelation.value.selectedLabel = 'Selecionados';
  }
}

async function loadCrud() {
  try {
    const response = await api.get(`/api/cruds/${crudId.value}`);
    // Converter explicitamente para boolean (pode vir como 0/1 do banco)
    isSystem.value = Boolean(response.data.isSystem === true || response.data.isSystem === 1);
    crudForm.value = {
      name: response.data.name,
      title: response.data.title,
      icon: response.data.icon,
      resource: response.data.resource,
      endpoint: response.data.endpoint,
      active: response.data.active
    };
    
    if (response.data.config) {
      config.value = {
        rowKey: 'id',
        createRoute: '',
        editRoute: '',
        deleteMessage: '',
        deleteSuccessMessage: '',
        createLabel: '',
        showSearch: true,
        showFab: true,
        columns: [],
        fields: [],
        layouts: [],
        relations: [],
        ...response.data.config
      };
      
      // Se não tiver layouts mas tiver fields, criar layout padrão
      if (!config.value.layouts || config.value.layouts.length === 0) {
        if (config.value.fields && config.value.fields.length > 0) {
          config.value.layouts = [{
            title: '',
            rows: [{
              cols: config.value.fields.map(field => ({ fields: [field] }))
            }]
          }];
        } else {
          config.value.layouts = [];
        }
      }
    }
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao carregar Interface',
      icon: 'warning'
    });
    goBack();
  }
}

function goBack() {
  router.push('/admin/cruds');
}

async function saveCrud() {
  try {
    config.value.title = crudForm.value.title;
    config.value.icon = crudForm.value.icon;
    config.value.resource = crudForm.value.resource;
    config.value.endpoint = crudForm.value.endpoint;

    const payload = {
      ...crudForm.value,
      config: config.value
    };

    if (isNew.value) {
      await api.post('/api/cruds', payload);
      $q.notify({
        color: 'positive',
        message: 'Interface criada com sucesso!',
        icon: 'check'
      });
    } else {
      await api.put(`/api/cruds/${crudId.value}`, payload);
      $q.notify({
        color: 'positive',
        message: 'Interface atualizada com sucesso!',
        icon: 'check'
      });
    }
    
    goBack();
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao salvar Interface',
      icon: 'warning'
    });
  }
}
</script>

<style scoped>
.crud-editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
}

.crud-editor-header {
  padding: 8px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.12);
  background: white;
}

.crud-editor-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0;
  border-radius: 0;
  box-shadow: none;
}

.crud-editor-panels {
  flex: 1;
  overflow-y: auto;
}

.json-tab-panel {
  padding: 0 !important;
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}

.monaco-container {
  flex: 1;
  width: 100%;
  min-height: 100%;
  border: none;
}

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

.drag-handle {
  cursor: move;
  color: rgba(0,0,0,0.4);
}

.drag-handle:hover {
  color: rgba(0,0,0,0.8);
}

.table-preview-container {
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 4px;
  overflow: hidden;
  background: white;
}

.table-header {
  padding: 8px 16px;
  background: rgba(0,0,0,0.02);
  border-bottom: 1px solid rgba(0,0,0,0.12);
}

.table-header-row {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 120px 1fr 100px 100px 80px 120px;
  gap: 1px;
  background: rgba(0,0,0,0.12);
  border-bottom: 1px solid rgba(0,0,0,0.12);
  font-weight: 600;
  font-size: 12px;
  padding: 8px 0;
}

.table-row {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 120px 1fr 100px 100px 80px 120px;
  gap: 1px;
  background: rgba(0,0,0,0.12);
  border-bottom: 1px solid rgba(0,0,0,0.12);
  transition: background 0.2s;
}

.table-row:hover {
  background: rgba(25, 118, 210, 0.05);
}

.table-cell {
  padding: 8px;
  background: white;
  display: flex;
  align-items: center;
}

.table-empty {
  padding: 32px;
  text-align: center;
  color: rgba(0,0,0,0.5);
}

.drag-cell {
  justify-content: center;
}

.form-fields-list {
  min-height: 200px;
}

.form-field-card {
  border-left: 3px solid #1976d2;
  transition: all 0.2s;
}

.form-field-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.layouts-list {
  min-height: 200px;
}

.layout-card {
  border-left: 4px solid #1976d2;
}

.layout-drag-handle {
  cursor: move;
  color: rgba(0,0,0,0.4);
}

.layout-drag-handle:hover {
  color: rgba(0,0,0,0.8);
}

.layout-row {
  border: 1px dashed rgba(0,0,0,0.2);
  border-radius: 4px;
  padding: 8px;
  background: rgba(0,0,0,0.02);
}

.layout-col {
  min-height: 100px;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 4px;
  padding: 8px;
  background: white;
}

.col-header {
  font-weight: 600;
  font-size: 11px;
}

.col-fields {
  min-height: 50px;
}

.field-card {
  border-left: 2px solid #1976d2;
  background: rgba(25, 118, 210, 0.02);
}

.field-drag-handle {
  cursor: move;
  color: rgba(0,0,0,0.4);
}

.field-drag-handle:hover {
  color: rgba(0,0,0,0.8);
}
</style>
