import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { api } from '../boot/axios';
import { useAuthStore } from '../stores/auth';

/**
 * Composable para executar actions definidas em configuração JSON
 * Suporta actions aninhadas, abreviações e execução sequencial
 */
export function useActions() {
  const router = useRouter();
  const $q = useQuasar();
  const authStore = useAuthStore();

  /**
   * Normaliza uma action (string abreviada ou objeto completo)
   */
  function normalizeAction(action, row = {}, context = {}) {
    // Se for string, converter para objeto de action
    if (typeof action === 'string') {
      return expandActionShortcut(action, row, context);
    }
    
    // Se já for objeto, garantir que tenha type
    if (typeof action === 'object' && action !== null) {
      return { ...action };
    }
    
    return null;
  }

  /**
   * Expande abreviações de actions (ex: 'delete', 'edit', 'route:/path')
   */
  function expandActionShortcut(shortcut, row = {}, context = {}) {
    const shortcuts = {
      'delete': {
        type: 'confirm',
        title: 'Confirmar exclusão',
        message: (row) => {
          if (context.deleteMessage) {
            if (typeof context.deleteMessage === 'function') {
              return context.deleteMessage(row);
            }
            return interpolateString(context.deleteMessage, row, context);
          }
          return 'Deseja realmente excluir este item?';
        },
        actions: [
          {
            type: 'api',
            method: 'delete',
            endpoint: (row) => `${context.endpoint}/${row[context.rowKey || 'id']}`,
            onSuccess: {
              type: 'message',
              message: context.deleteSuccessMessage || 'Item excluído com sucesso!',
              color: 'positive',
              icon: 'check'
            },
            onSuccessActions: ['refresh']
          }
        ]
      },
      'edit': {
        type: 'route',
        route: (row) => {
          const route = context.editRoute || `/crud/${context.resource}/${row[context.rowKey || 'id']}`;
          return typeof route === 'function' ? route(row) : route.replace(':id', row[context.rowKey || 'id']);
        }
      },
      'refresh': {
        type: 'refresh'
      },
      'reload': {
        type: 'reload'
      },
      'redirect': {
        type: 'route',
        route: context.listRoute || `/crud/${context.resource}`
      }
    };

    // Verificar se é uma rota direta (route:/path)
    if (shortcut.startsWith('route:')) {
      const routePath = shortcut.substring(6);
      return {
        type: 'route',
        route: routePath
      };
    }

    // Verificar se é uma mensagem direta (message:texto)
    if (shortcut.startsWith('message:')) {
      const messageText = shortcut.substring(9);
      return {
        type: 'message',
        message: messageText,
        color: 'info',
        icon: 'info'
      };
    }

    // Retornar action expandida ou null
    return shortcuts[shortcut] || null;
  }

  /**
   * Verifica se o usuário tem permissão para executar a action
   */
  function canExecuteAction(action, row = {}) {
    // Se não tiver roles definidas, permitir
    if (!action.roles || !Array.isArray(action.roles) || action.roles.length === 0) {
      return true;
    }

    // Verificar se o usuário tem pelo menos uma das roles necessárias
    const userFunctions = authStore.user?.functions || [];
    return action.roles.some(role => userFunctions.includes(role));
  }

  /**
   * Verifica condições customizadas
   */
  function checkCondition(action, row = {}, context = {}) {
    if (!action.condition) return true;
    
    if (typeof action.condition === 'function') {
      return action.condition(row, context);
    }
    
    if (typeof action.condition === 'string') {
      // Avaliar expressão simples (ex: "row.status === 'active'")
      try {
        const fn = new Function('row', 'context', `return ${action.condition}`);
        return fn(row, context);
      } catch (e) {
        console.warn('Erro ao avaliar condição:', e);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Substitui variáveis em strings usando dados do row e context
   */
  function interpolateString(str, row = {}, context = {}) {
    if (typeof str !== 'string') return str;
    
    let result = str;
    
    // Substituir ${row.field}
    result = result.replace(/\$\{row\.(\w+)\}/g, (match, field) => {
      return row[field] !== undefined && row[field] !== null ? row[field] : '';
    });
    
    // Substituir ${context.field}
    result = result.replace(/\$\{context\.(\w+)\}/g, (match, field) => {
      return context[field] !== undefined && context[field] !== null ? context[field] : '';
    });
    
    return result;
  }

  /**
   * Executa uma action individual
   */
  async function executeAction(action, row = {}, context = {}) {
    const normalizedAction = normalizeAction(action, row, context);
    
    if (!normalizedAction) {
      console.warn('Action inválida:', action);
      return;
    }

    // Verificar permissões
    if (!canExecuteAction(normalizedAction, row)) {
      return;
    }

    // Verificar condições
    if (!checkCondition(normalizedAction, row, context)) {
      return;
    }

    try {
      switch (normalizedAction.type) {
        case 'dialog':
          await executeDialogAction(normalizedAction, row, context);
          break;
        
        case 'route':
          executeRouteAction(normalizedAction, row, context);
          break;
        
        case 'message':
          executeMessageAction(normalizedAction, row, context);
          break;
        
        case 'confirm':
          await executeConfirmAction(normalizedAction, row, context);
          break;
        
        case 'api':
          await executeApiAction(normalizedAction, row, context);
          break;
        
        case 'refresh':
          executeRefreshAction(normalizedAction, row, context);
          break;
        
        case 'reload':
          executeReloadAction(normalizedAction, row, context);
          break;
        
        default:
          console.warn('Tipo de action desconhecido:', normalizedAction.type);
      }
    } catch (error) {
      console.error('Erro ao executar action:', error);
      $q.notify({
        color: 'negative',
        message: error.message || 'Erro ao executar ação',
        icon: 'warning'
      });
    }
  }

  /**
   * Executa action do tipo dialog
   */
  async function executeDialogAction(action, row, context) {
    const component = action.component || 'CrudEdit';
    const props = action.props || {};
    
    // Interpolar props se necessário
    const interpolatedProps = {};
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'function') {
        // Se for função, executar com row e context
        interpolatedProps[key] = value(row, context);
      } else if (typeof value === 'string') {
        interpolatedProps[key] = interpolateString(value, row, context);
      } else if (typeof value === 'object' && value !== null) {
        // Interpolar objetos recursivamente
        interpolatedProps[key] = interpolateObject(value, row, context);
      } else {
        interpolatedProps[key] = value;
      }
    }

    // Adicionar row e context aos props se necessário
    if (component === 'CrudEdit') {
      // Se não tiver config nos props, usar o context
      if (!interpolatedProps.config) {
        interpolatedProps.config = { ...context };
      }
      // Adicionar itemId se houver row
      if (row && row[context.rowKey || 'id']) {
        interpolatedProps.config.itemId = row[context.rowKey || 'id'];
      }
    }
    if (!interpolatedProps.row && row) {
      interpolatedProps.row = row;
    }

    return new Promise((resolve, reject) => {
      // Se o componente for JsonViewerDialog, usar maximized
      const isMaximized = component === 'JsonViewerDialog';
      
      $q.dialog({
        component: () => import(`../components/JsonViewerDialog.vue`),
        componentProps: interpolatedProps
      }).onOk(async (data) => {
        // Se houver actions de sucesso, executá-las
        if (action.onSuccessActions && Array.isArray(action.onSuccessActions)) {
          for (const successAction of action.onSuccessActions) {
            await executeAction(successAction, data || row, context);
          }
        }
        resolve(data);
      }).onCancel(() => {
        reject(new Error('Dialog cancelado'));
      });
    });
  }

  /**
   * Executa action do tipo route
   */
  function executeRouteAction(action, row, context) {
    let route = action.route;
    
    if (typeof route === 'function') {
      route = route(row, context);
    } else if (typeof route === 'string') {
      route = interpolateString(route, row, context);
    }
    
    if (action.target === '_blank') {
      window.open(route, '_blank');
    } else {
      router.push(route);
    }
  }

  /**
   * Executa action do tipo message
   */
  function executeMessageAction(action, row, context) {
    const message = typeof action.message === 'function' 
      ? action.message(row, context)
      : interpolateString(action.message || action.title || '', row, context);
    
    $q.notify({
      color: action.color || 'info',
      message: message,
      icon: action.icon || 'info',
      position: action.position || 'top'
    });
  }

  /**
   * Executa action do tipo confirm
   */
  async function executeConfirmAction(action, row, context) {
    const title = interpolateString(action.title || 'Confirmar', row, context);
    let message = action.message;
    if (typeof message === 'function') {
      message = message(row, context);
    } else {
      message = interpolateString(message || '', row, context);
    }
    
    return new Promise((resolve, reject) => {
      $q.dialog({
        title,
        message,
        cancel: true,
        persistent: action.persistent !== false
      }).onOk(async () => {
        // Executar actions aninhadas se houver
        if (action.actions && Array.isArray(action.actions)) {
          for (const nestedAction of action.actions) {
            await executeAction(nestedAction, row, context);
          }
        }
        resolve();
      }).onCancel(() => {
        reject(new Error('Confirmação cancelada'));
      });
    });
  }

  /**
   * Executa action do tipo api
   */
  async function executeApiAction(action, row, context) {
    const method = (action.method || 'get').toLowerCase();
    let endpoint = action.endpoint;
    
    if (typeof endpoint === 'function') {
      endpoint = endpoint(row, context);
    } else {
      endpoint = interpolateString(endpoint || '', row, context);
    }
    
    const payload = action.payload;
    let data = null;
    
    if (payload) {
      if (typeof payload === 'function') {
        data = payload(row, context);
      } else if (typeof payload === 'object') {
        data = interpolateObject(payload, row, context);
      }
    }
    
    const response = await api[method](endpoint, data);
    
    // Executar onSuccess se houver
    if (action.onSuccess) {
      await executeAction(action.onSuccess, response.data || row, context);
    }
    
    // Executar onSuccessActions se houver
    if (action.onSuccessActions && Array.isArray(action.onSuccessActions)) {
      for (const successAction of action.onSuccessActions) {
        await executeAction(successAction, response.data || row, context);
      }
    }
    
    return response.data;
  }

  /**
   * Executa action do tipo refresh
   */
  function executeRefreshAction(action, row, context) {
    // Emitir evento para refresh (será capturado pelo componente pai)
    if (context.onRefresh) {
      context.onRefresh();
    } else {
      // Fallback: recarregar página
      window.location.reload();
    }
  }

  /**
   * Executa action do tipo reload
   */
  function executeReloadAction(action, row, context) {
    window.location.reload();
  }

  /**
   * Interpola objetos recursivamente
   */
  function interpolateObject(obj, row, context) {
    if (typeof obj === 'string') {
      return interpolateString(obj, row, context);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => interpolateObject(item, row, context));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = interpolateObject(value, row, context);
      }
      return result;
    }
    
    return obj;
  }

  /**
   * Executa uma lista de actions em sequência
   */
  async function executeActions(actions, row = {}, context = {}) {
    if (!Array.isArray(actions)) {
      actions = [actions];
    }
    
    for (const action of actions) {
      await executeAction(action, row, context);
    }
  }

  return {
    executeAction,
    executeActions,
    normalizeAction,
    canExecuteAction,
    checkCondition
  };
}

