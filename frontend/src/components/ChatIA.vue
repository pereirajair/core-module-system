<template>
  <div>
    <!-- FAB Button -->
    <q-btn
      v-if="!chatOpen"
      fab
      color="primary"
      icon="smart_toy"
      @click="openChat"
      class="chat-fab-button"
    >
      <q-tooltip>Chat IA</q-tooltip>
    </q-btn>

    <!-- Chat Panel -->
    <q-drawer
      v-model="chatOpen"
      side="left"
      :width="400"
      :breakpoint="1024"
      overlay
      elevated
      class="chat-drawer"
    >
      <q-card flat class="full-height">
        <q-card-section class="bg-primary text-white">
          <div class="row items-center justify-between">
            <div class="row items-center">
              <q-icon name="smart_toy" size="md" class="q-mr-sm" />
              <div class="text-h6">Chat IA</div>
            </div>
            <div class="row items-center q-gutter-xs">
              <q-btn
                flat
                round
                dense
                icon="delete_sweep"
                @click="clearHistory"
              >
                <q-tooltip>Limpar Histórico</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="close"
                @click="closeChat"
              />
            </div>
          </div>
        </q-card-section>

        <q-card-section class="chat-messages" style="height: calc(100vh - 200px); overflow-y: auto;">
          <div v-for="(msg, index) in messages" :key="index" class="q-mb-md">
            <!-- Mensagem do Usuário -->
            <div v-if="msg.role === 'user'" class="row justify-end">
              <div class="message-bubble user-message">
                <div class="text-body2">{{ msg.content }}</div>
              </div>
            </div>

            <!-- Mensagem da IA -->
            <div v-else class="row justify-start">
              <div class="message-bubble ai-message">
                <div class="text-body2" v-html="formatMessage(msg.content)"></div>
                <!-- Resultados de Funções Executadas -->
                <div v-if="msg.functionCalls && msg.functionCalls.length > 0" class="q-mt-sm">
                  <q-separator class="q-my-xs" />
                  <div class="text-caption text-positive">
                    <q-icon name="check_circle" size="xs" class="q-mr-xs" />
                    Funções executadas:
                  </div>
                  <div 
                    v-for="(fc, idx) in msg.functionCalls" 
                    :key="idx"
                    class="text-caption q-ml-sm q-mt-xs"
                  >
                    • {{ fc.function }}: {{ fc.result.message || 'Executado' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading indicator -->
          <div v-if="loading" class="row justify-start">
            <div class="message-bubble ai-message">
              <q-spinner-dots size="sm" color="primary" />
              <span class="q-ml-sm text-body2">Pensando...</span>
            </div>
          </div>
        </q-card-section>

        <q-card-section class="chat-input">
          <q-input
            v-model="currentMessage"
            placeholder="Digite sua mensagem..."
            outlined
            dense
            @keyup.enter="sendMessage"
            :disable="loading"
          >
            <template v-slot:append>
              <q-btn
                round
                dense
                flat
                icon="send"
                @click="sendMessage"
                :disable="!currentMessage.trim() || loading"
                color="primary"
              />
            </template>
          </q-input>
        </q-card-section>
      </q-card>
    </q-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { api } from '../boot/axios';
import { useQuasar } from 'quasar';
import { useAuthStore } from '../stores/auth';

const $q = useQuasar();
const authStore = useAuthStore();

const STORAGE_KEY = 'chatia_conversation_history';

const chatOpen = ref(false);
const messages = ref([]);
const currentMessage = ref('');
const loading = ref(false);
const conversation = ref([]);

// Carregar histórico do localStorage
function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      messages.value = parsed.messages || [];
      conversation.value = parsed.conversation || [];
    }
  } catch (error) {
    console.error('Erro ao carregar histórico do localStorage:', error);
  }
}

// Salvar histórico no localStorage
function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      messages: messages.value,
      conversation: conversation.value,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Erro ao salvar histórico no localStorage:', error);
  }
}

// Limpar histórico
function clearHistory() {
  $q.dialog({
    title: 'Limpar Histórico',
    message: 'Tem certeza que deseja limpar todo o histórico de conversas?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    messages.value = [];
    conversation.value = [];
    localStorage.removeItem(STORAGE_KEY);
    // Adicionar mensagem inicial novamente
    messages.value.push({
      role: 'assistant',
      content: 'Olá! Sou seu assistente de IA. Posso ajudá-lo a criar Interfaces, menus, permissões e muito mais. Como posso ajudá-lo hoje?'
    });
    saveHistory();
    $q.notify({
      color: 'positive',
      message: 'Histórico limpo com sucesso!',
      icon: 'check'
    });
  });
}

// Observar mudanças nas mensagens e salvar automaticamente (com debounce para evitar muitas escritas)
let saveTimeout = null;
watch([messages, conversation], () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveHistory();
  }, 500);
}, { deep: true });

function openChat() {
  chatOpen.value = true;
}

function closeChat() {
  chatOpen.value = false;
}

function formatMessage(text) {
  if (!text) return '';
  
  // Remover JSONs de chamadas de função antes de formatar
  // Remover JSONs que são chamadas MCP ou de função
  let cleaned = text;
  
  // Remover JSONs completos que são chamadas de função
  const jsonPattern = /\{[\s\S]*?"(jsonrpc|function|method|tools\/call|createCrud|createFunction|createMenuItem|assignPermissionsToRole|runMigration|reloadDynamicRoutes|getModel|getCruds)"[\s\S]*?\}/g;
  cleaned = cleaned.replace(jsonPattern, '');
  
  // Remover linhas que contenham apenas JSONs
  cleaned = cleaned.split('\n').filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return true; // Manter linhas vazias
    // Se a linha parece ser um JSON completo de função, remover
    if (trimmed.startsWith('{') && trimmed.includes('"jsonrpc"')) return false;
    if (trimmed.startsWith('{') && trimmed.includes('"function"')) return false;
    return true;
  }).join('\n');
  
  // Converter markdown básico para HTML
  return cleaned
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

async function sendMessage() {
  if (!currentMessage.value.trim() || loading.value) return;

  const userMessage = currentMessage.value.trim();
  currentMessage.value = '';

  // Adicionar mensagem do usuário
  messages.value.push({
    role: 'user',
    content: userMessage
  });

  conversation.value.push({
    role: 'user',
    content: userMessage
  });

  // Salvar após adicionar mensagem do usuário
  saveHistory();

  loading.value = true;

  // Criar mensagem temporária para a resposta da IA (será atualizada em tempo real)
  let aiMessageIndex = messages.value.length;
  messages.value.push({
    role: 'assistant',
    content: '',
    functionCalls: []
  });

  try {
    // Obter token de autenticação
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    // Usar URL relativa para que o proxy do Quasar/Vite funcione corretamente
    // O proxy redireciona para o backend na porta 3000
    const url = 'http://localhost:3000/api/chatia?stream=true';
    
    // Usar fetch com streaming para receber respostas parciais
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        message: userMessage,
        conversation: conversation.value
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let currentEventType = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('event: ')) {
          currentEventType = line.slice(7);
          continue;
        }
        
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            // console.log('[ChatIA Frontend] Evento recebido:', currentEventType, data);
            
            if (currentEventType === 'start' || currentEventType === 'thinking') {
              // console.log('[ChatIA Frontend] Mensagem inicial:', data.message);
              messages.value[aiMessageIndex].content = data.message || '';
            } else if (currentEventType === 'partial') {
              // console.log('[ChatIA Frontend] Conteúdo parcial recebido:', {
              //   content: data.content?.substring(0, 100),
              //   fullContent: data.fullContent?.substring(0, 100),
              //   fullContentLength: data.fullContent?.length
              // });
              // O backend já envia conteúdo limpo (sem JSONs de função)
              // Usar fullContent do backend se disponível, senão acumular
              if (data.fullContent !== undefined) {
                fullContent = data.fullContent;
              } else if (data.content) {
                fullContent += data.content;
              }
              
              // Limpeza de segurança no frontend (remover qualquer JSON residual)
              let cleanedContent = fullContent
                .replace(/```json\s*[\s\S]*?```/gi, '')
                .replace(/`json\s*[\s\S]*?`/gi, '')
                .replace(/\{[^{}]*"jsonrpc"[^{}]*\}/g, '')
                .replace(/["`\s]*json["`\s]*"jsonrpc"/gi, '')
                .replace(/["`\s]*json["`\s]*"method"/gi, '')
                .split('\n')
                .filter(line => {
                  const trimmed = line.trim();
                  if (trimmed.match(/^[`\s]*json/i)) return false;
                  if (trimmed.match(/"jsonrpc"\s*:/)) return false;
                  if (trimmed.match(/"method"\s*:\s*"tools\/call"/)) return false;
                  return true;
                })
                .join('\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
              
              // Só atualizar se houver conteúdo limpo
              // console.log('[ChatIA Frontend] Conteúdo após limpeza:', {
              //   cleanedContentLength: cleanedContent.length,
              //   fullContentLength: fullContent.length,
              //   cleanedContentPreview: cleanedContent.substring(0, 100)
              // });
              
              if (cleanedContent.length > 0 || fullContent.length === 0) {
                messages.value[aiMessageIndex].content = cleanedContent || fullContent;
                // console.log('[ChatIA Frontend] Mensagem atualizada:', messages.value[aiMessageIndex].content.substring(0, 100));
              // } else {
                // console.log('[ChatIA Frontend] Conteúdo não atualizado - ambos vazios ou filtrados');
              }
              
              // Scroll para o final
              setTimeout(() => {
                const chatMessages = document.querySelector('.chat-messages');
                if (chatMessages) {
                  chatMessages.scrollTop = chatMessages.scrollHeight;
                }
              }, 50);
              
            } else if (currentEventType === 'complete') {
              console.log('[ChatIA Frontend] Evento complete recebido:', {
                message: data.message?.substring(0, 100),
                messageLength: data.message?.length,
                fullContentLength: fullContent.length
              });
              // O backend já envia mensagem limpa, mas fazer limpeza final de segurança
              let finalMessage = data.message || fullContent;
              
              // Limpeza final de segurança
              finalMessage = finalMessage
                .replace(/```json\s*[\s\S]*?```/gi, '')
                .replace(/`json\s*[\s\S]*?`/gi, '')
                .replace(/\{[^{}]*"jsonrpc"[^{}]*\}/g, '')
                .replace(/["`\s]*json["`\s]*"jsonrpc"/gi, '')
                .replace(/["`\s]*json["`\s]*"method"/gi, '')
                .split('\n')
                .filter(line => {
                  const trimmed = line.trim();
                  if (trimmed.match(/^[`\s]*json/i)) return false;
                  if (trimmed.match(/"jsonrpc"\s*:/)) return false;
                  if (trimmed.match(/"method"\s*:\s*"tools\/call"/)) return false;
                  return true;
                })
                .join('\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
              
              messages.value[aiMessageIndex].content = finalMessage;
              if (data.functionCalls) {
                messages.value[aiMessageIndex].functionCalls = data.functionCalls;
              }
              
              // Atualizar conversa
              conversation.value.push({
                role: 'assistant',
                content: data.message || fullContent,
                functionCalls: data.functionCalls
              });
              
              // Mostrar notificações de funções executadas
              if (data.functionCalls && data.functionCalls.length > 0) {
                data.functionCalls.forEach(fc => {
                  if (fc.result && fc.result.success) {
                    $q.notify({
                      color: 'positive',
                      message: fc.result.message || `${fc.function} executada com sucesso`,
                      icon: 'check',
                      position: 'top',
                      timeout: 3000
                    });
                  } else if (fc.result) {
                    $q.notify({
                      color: 'negative',
                      message: fc.result.message || `Erro ao executar ${fc.function}`,
                      icon: 'error',
                      position: 'top',
                      timeout: 5000
                    });
                  }
                });
              }
              
              saveHistory();
              loading.value = false;
            } else if (currentEventType === 'function') {
              // Função sendo executada - não precisa fazer nada aqui, apenas log
              if (data.status === 'executing') {
                console.log(`[ChatIA] Função ${data.function} sendo executada...`);
              } else if (data.result) {
                // Função executada - mostrar notificação
                if (data.result.success) {
                  $q.notify({
                    color: 'positive',
                    message: data.result.message || `${data.function} executada com sucesso`,
                    icon: 'check',
                    position: 'top',
                    timeout: 3000
                  });
                } else {
                  $q.notify({
                    color: 'negative',
                    message: data.result.message || `Erro ao executar ${data.function}`,
                    icon: 'error',
                    position: 'top',
                    timeout: 5000
                  });
                }
              }
            } else if (currentEventType === 'error') {
              messages.value[aiMessageIndex].content = `Erro: ${data.message || 'Erro desconhecido'}`;
              loading.value = false;
              
              $q.notify({
                color: 'negative',
                message: data.message || 'Erro ao comunicar com Chat IA',
                icon: 'error'
              });
            }
          } catch (parseError) {
            console.error('Erro ao parsear evento SSE:', parseError, line);
          }
          currentEventType = '';
        }
      }
    }

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    messages.value[aiMessageIndex].content = 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';
    loading.value = false;
    
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Erro ao comunicar com Chat IA',
      icon: 'error'
    });
    saveHistory();
  }
}

// Função para enviar mensagem programaticamente
async function sendMessageProgrammatically(messageText) {
  if (!messageText || !messageText.trim()) return;
  
  // Abrir o ChatIA se estiver fechado
  if (!chatOpen.value) {
    chatOpen.value = true;
  }
  
  // Definir a mensagem no campo de input
  currentMessage.value = messageText.trim();
  
  // Enviar a mensagem automaticamente após um pequeno delay
  await nextTick();
  setTimeout(() => {
    sendMessage();
  }, 300);
}

onMounted(() => {
  // Carregar histórico do localStorage
  loadHistory();
  
  // Ouvir evento customizado para abrir o ChatIA
  window.addEventListener('open-chat-ia', () => {
    chatOpen.value = true;
  });
  
  // Ouvir evento customizado para enviar mensagem diretamente
  window.addEventListener('send-chat-ia-message', (event) => {
    const message = event.detail?.message;
    if (message) {
      sendMessageProgrammatically(message);
    }
  });
  
  // Se não houver histórico, adicionar mensagem inicial
  if (messages.value.length === 0) {
    messages.value.push({
      role: 'assistant',
      content: 'Olá! Sou seu assistente de IA. Posso ajudá-lo a criar Interfaces, menus, permissões e muito mais. Como posso ajudá-lo hoje?'
    });
    saveHistory();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('open-chat-ia', () => {});
  window.removeEventListener('send-chat-ia-message', () => {});
});
</script>

<style scoped>
.chat-fab-button {
  position: fixed !important;
  bottom: 18px;
  left: 18px;
  z-index: 2000;
}

.chat-drawer {
  z-index: 3000;
}

.chat-messages {
  padding: 16px;
}

.message-bubble {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
}

.user-message {
  background-color: #1976D2;
  color: white;
  border-bottom-right-radius: 4px;
}

.ai-message {
  background-color: #f5f5f5;
  color: #333;
  border-bottom-left-radius: 4px;
}

.chat-input {
  border-top: 1px solid #e0e0e0;
  padding: 12px;
}

code {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}
</style>

