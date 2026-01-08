<template>
  <q-page class="flex flex-center">
    <q-card style="width: 400px;">
      <q-card-section>
        <div class="text-center q-mb-md">
          <img 
            v-if="logoImage" 
            :src="logoImage" 
            alt="System Logo" 
            style="max-width: 200px; max-height: 100px; object-fit: contain;"
          />
        </div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            filled
            v-model="email"
            label="Email"
            type="email"
            lazy-rules
            :rules="[val => (val && val.length > 0) || 'Please type something']"
          />

          <q-input
            filled
            v-model="password"
            label="Password"
            type="password"
            lazy-rules
            :rules="[val => (val && val.length > 0) || 'Please type something']"
          />

          <div>
            <q-btn label="Login" type="submit" color="primary" class="full-width"/>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter, useRoute } from 'vue-router';
import { api } from '../boot/axios'; // Import the configured axios instance

const $q = useQuasar();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const logoImage = ref(null);

// Pegar a sigla da query string ou do path
const systemSigla = computed(() => {
  return route.query.system || route.params.sigla || null;
});

const loadSystemLogo = async () => {
  if (!systemSigla.value) return;
  
  try {
    const response = await api.get(`/system/${systemSigla.value}/logo`);
    if (response.data && response.data.image) {
      // Se já vier com data:image, usar diretamente, senão adicionar o prefixo
      if (response.data.image.startsWith('data:')) {
        logoImage.value = response.data.image;
      } else {
        logoImage.value = `data:${response.data.type || 'image/png'};base64,${response.data.image}`;
      }
    }
  } catch (error) {
    console.log('Error loading system logo:', error);
    // Não mostrar erro, apenas não exibir a logo
  }
};

onMounted(() => {
  // Se não tiver sistema especificado, redirecionar para MANAGER
  if (!systemSigla.value) {
    router.replace('/system/MANAGER/login');
    return;
  }
  loadSystemLogo();
});

const onSubmit = async () => {
  try {
    const { useAuthStore } = await import('stores/auth');
    const authStore = useAuthStore();
    
    await authStore.login(email.value, password.value);
    
    $q.notify({
      color: 'positive',
      message: 'Login successful!',
      icon: 'check'
    });
    router.push('/'); // Redirect to home page (root authenticated)
  } catch (error) {
    console.log(error);
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'An error occurred during login',
      icon: 'warning'
    });
  }
};
</script>
