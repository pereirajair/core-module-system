const routes = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('../pages/IndexPage.vue') },
      { path: 'channels', component: () => import('../pages/ChannelsPage.vue'), meta: { requiresAuth: true } },
      { path: 'channels/:id', component: () => import('../pages/ChannelViewPage.vue'), meta: { requiresAuth: true } },
      { path: 'conversations/:id', component: () => import('../pages/ConversationViewPage.vue'), meta: { requiresAuth: true } },
      // Rotas dinâmicas de CRUD (listagem e edição)
      { path: 'crud/:name', component: () => import('../pages/DynamicCrudPage.vue'), meta: { requiresAuth: true } },
      { path: 'crud/:name/:id', component: () => import('../pages/DynamicCrudEditPage.vue'), meta: { requiresAuth: true } },
      
      // Redirecionamentos para manter compatibilidade com rotas antigas
      { path: 'admin/users', redirect: '/crud/users' },
      { path: 'admin/users/:id', redirect: to => `/crud/users/${to.params.id}` },
      { path: 'admin/permissions', redirect: '/crud/roles' },
      { path: 'admin/permissions/:id', redirect: to => `/crud/roles/${to.params.id}` },
      { path: 'admin/organizations', redirect: '/crud/organizations' },
      { path: 'admin/organizations/:id', redirect: to => `/crud/organizations/${to.params.id}` },
      { path: 'admin/systems', redirect: '/crud/systems' },
      { path: 'admin/systems/:id', redirect: to => `/crud/systems/${to.params.id}` },
      { path: 'admin/functions', redirect: '/crud/functions' },
      { path: 'admin/functions/:id', redirect: to => `/crud/functions/${to.params.id}` },
      { path: 'admin/cruds', component: () => import('../pages/CrudsPage.vue'), meta: { requiresAuth: true } },
      { path: 'admin/cruds/:id', component: () => import('../pages/CrudEditPage.vue'), meta: { requiresAuth: true } },
      { 
        path: 'admin/models', 
        component: () => import('../pages/ModelsPage.vue'), 
        meta: { requiresAuth: true },
        children: [
          { path: ':name', component: () => import('../pages/ModelEditPage.vue'), meta: { requiresAuth: true } },
          { path: 'new', component: () => import('../pages/ModelEditPage.vue'), meta: { requiresAuth: true } }
        ]
      },
      { path: 'admin/models/mermaid', component: () => import('../pages/ModelsMermaidPage.vue'), meta: { requiresAuth: true } },
      { path: 'access-denied', component: () => import('../pages/AccessDeniedPage.vue'), meta: { requiresAuth: true } }
    ],
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    component: () => import('../layouts/LoginLayout.vue'),
    children: [
      { path: '', component: () => import('../pages/Login.vue') },
    ],
  },
  {
    path: '/system/:sigla/login',
    component: () => import('../layouts/LoginLayout.vue'),
    children: [
      { path: '', component: () => import('../pages/Login.vue') },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('../pages/ErrorNotFound.vue')
  }
]

export default routes
