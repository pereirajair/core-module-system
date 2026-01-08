import { boot } from 'quasar/wrappers';
import { useAuthStore } from '../stores/auth';

export default boot(async ({ router }) => {
  const authStore = useAuthStore();
  
  // Verificar autenticação ao inicializar o app
  await authStore.checkAuth();
  
  // Interceptar navegação para verificar autenticação
  router.beforeEach((to, from, next) => {
    const isAuthenticated = authStore.isAuthenticated;
    
    // Se não estiver autenticado e tentar acessar rota protegida
    if (to.matched.some(record => record.meta.requiresAuth) && !isAuthenticated) {
      // Redirecionar para login do sistema MANAGER
      next('/system/MANAGER/login');
    } 
    // Se estiver na rota de login sem sistema especificado e não autenticado
    else if (to.path === '/login' && !isAuthenticated && !to.query.system && !to.params.sigla) {
      next('/system/MANAGER/login');
    }
    else {
      next();
    }
  });
});

