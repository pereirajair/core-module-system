<template>
  <q-page class="flex column">
    <q-toolbar class="bg-primary text-white">
      <q-btn flat round dense icon="arrow_back" @click="router.go(-1)" />
      <q-toolbar-title>
        Conversation {{ conversationId }} 
      </q-toolbar-title>
    </q-toolbar>

    
    <div class="col q-pa-md q-scroll-area-messages">
      <div v-if="loading" class="text-center q-mt-md">
        <q-spinner color="primary" size="3em" />
        <p>Loading messages...</p>
      </div>

      <div v-else-if="error" class="text-center q-mt-md text-negative">
        <q-icon name="error" size="3em" />
        <p>{{ error }}</p>
      </div>

      <div v-else-if="messages.length === 0" class="text-center q-mt-md text-grey">
        <p>No messages in this conversation yet.</p>
      </div>

      

      <q-chat-message
        v-for="message in messages"
        :key="message.id"
        :name="message.id_origin === 1 ? 'You' : 'Contact'"
        :text="[message.message]"
        :sent="message.id_origin === 1"
        :bg-color="message.id_origin === 1 ? 'light-green-2' : 'white'"
        text-color="black"
      >
        <template v-slot:stamp>
          {{ new Date(message.sentAt).toLocaleTimeString() }}
        </template>
      </q-chat-message>
    </div>

    <q-footer bordered class="bg-white q-pa-md">
      <q-form @submit="sendMessage" class="row items-center q-col-gutter-md">
        <div class="col-grow">
          <q-input
            outlined
            rounded
            v-model="newMessage"
            placeholder="Type a message"
            dense
            autogrow
            rows="1"
          />
        </div>
        <div class="col-auto">
          <q-btn type="submit" round dense flat icon="send" color="primary" />
        </div>
      </q-form>
    </q-footer>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../boot/axios';
import { useQuasar } from 'quasar';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();

const conversationId = ref(null);
const messages = ref([]);
const loading = ref(true);
const error = ref(null);
const newMessage = ref('');

    const fetchMessages = async (id) => {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.get(`/api/messages?id_conversation=${id}`);
    messages.value = response.data.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  } catch (err) {
    console.error('Error fetching messages:', err);
    error.value = err.response?.data?.message || 'Failed to fetch messages.';
    $q.notify({
      color: 'negative',
      message: error.value,
      icon: 'warning'
    });
  } finally {
    loading.value = false;
  }
};
const sendMessage = async () => {
  if (!newMessage.value.trim()) {
    return;
  }
  try {
    const response = await api.post('/api/messages', {
      id_channel: messages.value[0]?.id_channel || null, // Assuming channel info is available or can be fetched
      id_user: 1, // Placeholder: replace with actual user ID from auth store
      id_contact: messages.value[0]?.id_contact || null, // Assuming contact info is available
      id_conversation: parseInt(conversationId.value),
      sentAt: new Date().toISOString(),
      id_origin: 1, // 1 for user, 2 for contact
      message: newMessage.value.trim(),
      message_type: 'text'
    });
    messages.value.push(response.data);
    newMessage.value = '';
  } catch (err) {
    console.error('Error sending message:', err);
    $q.notify({
      color: 'negative',
      message: err.response?.data?.message || 'Failed to send message.',
      icon: 'warning'
    });
  }
};

onMounted(() => {
  conversationId.value = route.params.id;
  if (conversationId.value) {
    fetchMessages(conversationId.value);
  }
});

watch(() => route.params.id, (newId) => {
  conversationId.value = newId;
  if (newId) {
    fetchMessages(newId);
  } else {
    messages.value = [];
  }
});
</script>

<style lang="scss" scoped>
.q-scroll-area-messages {
  min-height: 0;
}
</style>
