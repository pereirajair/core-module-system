<template>
  <q-page padding>
    <div class="q-pa-md">
      <q-list bordered separator>
        <q-item-label header>Channels</q-item-label>

        <q-item v-if="loading">
          <q-item-section avatar>
            <q-spinner color="primary" size="2em" />
          </q-item-section>
          <q-item-section>Loading channels...</q-item-section>
        </q-item>

        <q-item v-else-if="error">
          <q-item-section avatar>
            <q-icon color="negative" name="error" />
          </q-item-section>
          <q-item-section class="text-negative">{{ error }}</q-item-section>
        </q-item>

        <q-item
          v-for="channel in channels"
          :key="channel.id"
          clickable
          v-ripple
        >
          <q-item-section>
            <q-item-label>{{ channel.name }}</q-item-label>
            <q-item-label caption>Type: {{ channel.type }}</q-item-label>
          </q-item-section>
        </q-item>

        <q-item v-if="!loading && !error && channels.length === 0">
          <q-item-section>No channels found.</q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../boot/axios';
import { useQuasar } from 'quasar';
import { useAuthStore } from '../stores/auth';

const $q = useQuasar();
const authStore = useAuthStore();

const channels = ref([]);
const loading = ref(true);
const error = ref(null);

const fetchChannels = async () => {
  try {
    const token = authStore.token;
    if (!token) {
      error.value = 'Authentication token not found. Please log in.';
      loading.value = false;
      return;
    }

    const response = await api.get('/api/channels', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    channels.value = response.data;
  } catch (err) {
    console.error('Error fetching channels:', err);
    error.value = err.response?.data?.message || 'Failed to fetch channels.';
    $q.notify({
      color: 'negative',
      message: error.value,
      icon: 'warning'
    });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchChannels();
});
</script>
