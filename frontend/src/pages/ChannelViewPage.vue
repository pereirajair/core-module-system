<template>
  <q-page padding>
    <div class="q-pa-md">
      <q-list bordered separator>
        <q-item-label header>Conversations for Channel {{ channelId }}</q-item-label>

        <q-item v-if="loading">
          <q-item-section avatar>
            <q-spinner color="primary" size="2em" />
          </q-item-section>
          <q-item-section>Loading conversations...</q-item-section>
        </q-item>

        <q-item v-else-if="error">
          <q-item-section avatar>
            <q-icon color="negative" name="error" />
          </q-item-section>
          <q-item-section class="text-negative">{{ error }}</q-item-section>
        </q-item>

        <q-item
          v-for="conversation in conversations"
          :key="conversation.id"
          clickable
          v-ripple
          @click="goToConversation(conversation.id)"
        >
          <q-item-section>
            <q-item-label>Conversation ID: {{ conversation.id }}</q-item-label>
            <q-item-label caption>Status: {{ conversation.status === 1 ? 'Open' : 'Closed' }}</q-item-label>
            <q-item-label caption>Contact: {{ conversation.id_contact }}</q-item-label>
            <q-item-label caption>User: {{ conversation.id_user }}</q-item-label>
          </q-item-section>
        </q-item>

        <q-item v-if="!loading && !error && conversations.length === 0">
          <q-item-section>No conversations found for this channel.</q-item-section>
        </q-item>
      </q-list>
    </div>
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

const channelId = ref(null);
const conversations = ref([]);
const loading = ref(true);
const error = ref(null);

const fetchConversations = async (id) => {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.get(`/api/conversations?id_channel=${id}`);
    conversations.value = response.data;
  } catch (err) {
    console.error('Error fetching conversations:', err);
    error.value = err.response?.data?.message || 'Failed to fetch conversations.';
    $q.notify({
      color: 'negative',
      message: error.value,
      icon: 'warning'
    });
  } finally {
    loading.value = false;
  }
};

const goToConversation = (conversationId) => {
  router.push(`/conversations/${conversationId}`);
};

onMounted(() => {
  channelId.value = route.params.id;
  if (channelId.value) {
    fetchConversations(channelId.value);
  }
});

watch(() => route.params.id, (newId) => {
  channelId.value = newId;
  if (newId) {
    fetchConversations(newId);
  } else {
    conversations.value = [];
  }
});
</script>
