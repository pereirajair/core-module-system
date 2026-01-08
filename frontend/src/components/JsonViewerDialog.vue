<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" maximized>
    <q-card class="q-dialog-plugin">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ title || 'Visualizar JSON' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="onDialogCancel" />
      </q-card-section>
      <q-card-section>
        <div ref="monacoContainer" class="json-viewer-container"></div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Fechar" color="primary" @click="onDialogCancel" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import loader from '@monaco-editor/loader';

const props = defineProps({
  title: {
    type: String,
    default: 'Visualizar JSON'
  },
  json: {
    type: [Object, String],
    default: null
  }
});

// REQUIRED; need to specify some events that your
// component will emit through useDialogPluginComponent()
defineEmits([
  ...useDialogPluginComponent.emits
]);

// REQUIRED; must be called inside of setup()
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const monacoContainer = ref(null);
let monacoEditor = null;

watch(() => props.json, async () => {
  if (monacoEditor && props.json) {
    updateEditor();
  }
}, { immediate: true });

function getJsonString() {
  if (!props.json) return '{}';
  
  // Se já for string, tentar parsear para validar e formatar
  if (typeof props.json === 'string') {
    try {
      const parsed = JSON.parse(props.json);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // Se não for JSON válido, retornar como está
      return props.json;
    }
  }
  
  // Se for objeto, stringificar
  if (typeof props.json === 'object') {
    return JSON.stringify(props.json, null, 2);
  }
  
  return String(props.json);
}

async function initializeMonaco() {
  if (!monacoContainer.value) return;
  
  destroyMonacoEditor();
  
  try {
    const monaco = await loader.init();
    
    const jsonString = getJsonString();
    
    monacoEditor = monaco.editor.create(monacoContainer.value, {
      value: jsonString,
      language: 'json',
      theme: 'vs-dark',
      automaticLayout: true,
      readOnly: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on'
    });
  } catch (error) {
    console.error('Erro ao inicializar Monaco Editor:', error);
  }
}

function updateEditor() {
  if (monacoEditor && props.json) {
    const jsonString = getJsonString();
    monacoEditor.setValue(jsonString);
  }
}

function destroyMonacoEditor() {
  if (monacoEditor) {
    try {
      monacoEditor.dispose();
    } catch (error) {
      console.error('Erro ao destruir Monaco Editor:', error);
    }
    monacoEditor = null;
  }
}

onMounted(async () => {
  await nextTick();
  // Aguardar um pouco mais para garantir que o DOM está pronto
  await new Promise(resolve => setTimeout(resolve, 150));
  if (monacoContainer.value) {
    await initializeMonaco();
  }
});

onBeforeUnmount(() => {
  destroyMonacoEditor();
});
</script>

<style scoped>
.json-viewer-container {
  width: 100%;
  height: calc(100vh - 250px);
  min-height: 500px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>


