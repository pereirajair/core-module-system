<template>
  <q-page class="flex flex-center">
    <q-card style="width: 500px; max-width: 90vw;">
      <q-card-section class="text-center">
        <q-icon name="block" size="80px" color="negative" />
        <div class="text-h5 q-mt-md">Acesso Negado</div>
        <div class="text-body1 q-mt-md text-grey-7">
          Você não possui as permissões necessárias para realizar esta ação.
        </div>
        <div v-if="authStore.isImpersonating" class="text-caption q-mt-sm text-warning">
          <q-icon name="info" size="sm" />
          Você está impersonando um usuário sem as permissões necessárias.
        </div>
      </q-card-section>

      <q-card-actions align="center" class="q-pb-lg">
        <q-btn
          color="primary"
          label="Voltar"
          icon="arrow_back"
          @click="goBack"
        />
        <q-btn
          v-if="authStore.isImpersonating"
          color="warning"
          label="Parar Impersonação"
          icon="person_off"
          @click="stopImpersonating"
          class="q-ml-sm"
        />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

function goBack() {
  // Tentar voltar na história, se não conseguir, ir para a raiz
  if (window.history.length > 1) {
    router.go(-1);
  } else {
    router.push('/');
  }
}

async function stopImpersonating() {
  try {
    await authStore.stopImpersonating();
    router.push('/');
  } catch (error) {
    console.error('Erro ao parar impersonação:', error);
  }
}
</script>

