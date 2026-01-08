import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';

export function usePermissions(resource) {
  const authStore = useAuthStore();

  // Mapeamento de recursos para funções
  const functionMap = {
    users: {
      view: 'user.visualizar_usuarios',
      maintain: 'user.manter_usuarios',
      delete: 'user.excluir_usuarios'
    },
    roles: {
      view: 'role.visualizar_roles',
      maintain: 'role.manter_roles',
      delete: 'role.excluir_roles'
    },
    permissions: {
      view: 'role.visualizar_roles',
      maintain: 'role.manter_roles',
      delete: 'role.excluir_roles'
    },
    organizations: {
      view: 'org.visualizar_organizacoes',
      maintain: 'org.manter_organizacoes',
      delete: 'org.excluir_organizacoes'
    },
    systems: {
      view: 'sys.visualizar_sistemas',
      maintain: 'sys.manter_sistemas',
      delete: 'sys.excluir_sistemas'
    },
    functions: {
      view: 'func.visualizar_funcoes',
      maintain: 'func.manter_funcoes',
      delete: 'func.excluir_funcoes'
    },
    channels: {
      view: 'chan.visualizar_canais',
      maintain: 'chan.manter_canais',
      delete: 'chan.excluir_canais'
    },
    contacts: {
      view: 'cont.visualizar_contatos',
      maintain: 'cont.manter_contatos',
      delete: 'cont.excluir_contatos'
    },
    conversations: {
      view: 'conv.visualizar_conversas',
      maintain: 'conv.manter_conversas',
      delete: 'conv.excluir_conversas'
    },
    messages: {
      view: 'msg.visualizar_mensagens',
      maintain: 'msg.manter_mensagens',
      delete: 'msg.excluir_mensagens'
    }
  };

  const functions = functionMap[resource] || {};

  const canView = computed(() => {
    if (!functions.view) return true; // Se não tiver função definida, permite
    return authStore.hasFunction(functions.view);
  });

  const canMaintain = computed(() => {
    if (!functions.maintain) return false;
    return authStore.hasFunction(functions.maintain);
  });

  const canDelete = computed(() => {
    if (!functions.delete) return false;
    return authStore.hasFunction(functions.delete);
  });

  return {
    canView,
    canMaintain,
    canDelete
  };
}

