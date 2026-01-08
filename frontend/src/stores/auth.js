import { defineStore } from 'pinia';
import { api } from '../boot/axios';
import { jwtDecode } from 'jwt-decode'; // Corrected import for jwt-decode

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: null, // You might want to store user details here
    originalUser: null, // Store original user when impersonating
    originalToken: localStorage.getItem('originalToken') || null, // Store original token when impersonating
    system: null, // Store system information
    userSystems: [], // Available systems for the user
    userOrganizations: [], // Available organizations for the user
    currentOrganization: null, // Currently selected organization
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUserId: (state) => state.user ? state.user.id : null,
    isImpersonating: (state) => !!(state.user && state.user.impersonatedBy),
    hasFunction: (state) => (functionName) => {
      if (!state.user || !state.user.functions) return false;
      return state.user.functions.includes(functionName);
    },
  },
  actions: {
    async login(email, password) {
      try {
        const response = await api.post('/auth/login', { email, password });
        this.token = response.data.token;
        localStorage.setItem('token', this.token);
        this.user = jwtDecode(this.token); // Decode and store user info
        this.system = response.data.system || null; // Store system info
        this.originalUser = null; // Clear original user on new login
        this.originalToken = null; // Clear original token on new login
        localStorage.removeItem('originalToken'); // Clear from localStorage
        return true;
      } catch (error) {
        console.error('Login error:', error);
        this.logout(); // Ensure state is clean on failed login
        throw error;
      }
    },
    async impersonate(userId) {
      try {
        // Armazenar token e usuário original antes de impersonar
        if (!this.originalToken && !this.user?.impersonatedBy) {
          this.originalToken = this.token;
          localStorage.setItem('originalToken', this.token);
          this.originalUser = {
            id: this.user.id,
            name: this.user.name,
            email: this.user.email
          };
        }

        const response = await api.post('/auth/impersonate', { userId });
        this.token = response.data.token;
        localStorage.setItem('token', this.token);
        this.user = jwtDecode(this.token);
        this.system = response.data.system || null; // Update system info

        return response.data;
      } catch (error) {
        console.error('Impersonate error:', error);
        throw error;
      }
    },
    async stopImpersonating() {
      // Voltar ao token original sem deslogar
      if (this.originalToken) {
        const originalToken = this.originalToken;

        // Restaurar token original
        this.token = originalToken;
        localStorage.setItem('token', this.token);
        this.user = jwtDecode(this.token);

        // Limpar referências de impersonação após restaurar
        this.originalToken = null;
        this.originalUser = null;
        localStorage.removeItem('originalToken');

        // Recarregar informações do sistema do usuário original
        await this.checkAuth();
      } else {
        // Se não tiver token original, fazer logout normal
        this.logout();
      }
    },
    logout() {
      this.token = null;
      this.user = null;
      this.originalUser = null;
      this.originalToken = null;
      this.system = null;
      localStorage.removeItem('token');
      localStorage.removeItem('originalToken');
      // Redirection is now handled by the component that calls logout
    },
    async fetchUserContext() {
      try {
        const [systemsRes, orgsRes] = await Promise.all([
          api.get('/api/users/me/systems'),
          api.get('/api/users/me/organizations')
        ]);

        this.userSystems = systemsRes.data || [];
        this.userOrganizations = orgsRes.data || [];

        // Handle Organization Auto-select & Persistence
        let orgToSelect = null;
        let shouldUpdateToken = false;

        // 1. Verificar se a organização atual ainda é válida (está na lista)
        if (this.currentOrganization) {
          const currentOrgStillValid = this.userOrganizations.find(o => o.id === this.currentOrganization.id);
          if (currentOrgStillValid) {
            // Organização atual ainda é válida, verificar se o token está sincronizado
            if (this.user && this.user.id_organization !== this.currentOrganization.id) {
              // Token está desatualizado, precisa atualizar
              orgToSelect = this.currentOrganization;
              shouldUpdateToken = true;
            } else {
              // Tudo sincronizado, não precisa fazer nada
              orgToSelect = null;
            }
          } else {
            // Organização atual não é mais válida, precisa selecionar outra
            orgToSelect = null; // Será definido abaixo
          }
        }

        // 2. Se não há organização válida, tentar restaurar do localStorage
        if (!orgToSelect && !this.currentOrganization) {
          const savedOrgId = localStorage.getItem('selectedOrganizationId');
          if (savedOrgId) {
            const savedOrg = this.userOrganizations.find(o => o.id == savedOrgId);
            if (savedOrg) {
              orgToSelect = savedOrg;
              shouldUpdateToken = true;
            }
          }
        }

        // 3. Se ainda não encontrou, usar a primeira disponível
        if (!orgToSelect && !this.currentOrganization && this.userOrganizations.length > 0) {
          orgToSelect = this.userOrganizations[0];
          shouldUpdateToken = true;
        }

        // 4. Só chamar setOrganization se realmente precisa trocar
        // E evitar recarregar a página se já estiver no processo de carregamento
        if (orgToSelect && shouldUpdateToken) {
          // Verificar se realmente precisa atualizar (evitar chamadas desnecessárias)
          const tokenOrgId = this.user?.id_organization;
          const needsUpdate = !this.currentOrganization || 
                             this.currentOrganization.id !== orgToSelect.id ||
                             (tokenOrgId && tokenOrgId !== orgToSelect.id);
          
          if (needsUpdate) {
            // Não recarregar a página aqui, apenas atualizar o token silenciosamente
            await this.setOrganizationSilent(orgToSelect);
          }
        } else if (this.currentOrganization && this.user) {
          // Verificar se o token está sincronizado com a organização atual
          const tokenOrgId = this.user.id_organization;
          if (tokenOrgId && tokenOrgId !== this.currentOrganization.id) {
            // Token está desatualizado, atualizar silenciosamente
            await this.setOrganizationSilent(this.currentOrganization);
          }
        }

        // Match organization logic: Restore system from localStorage if available and valid
        let systemToSelect = null;

        // 1. Try to restore from localStorage
        const savedSystemId = localStorage.getItem('selectedSystemId');
        if (savedSystemId) {
          systemToSelect = this.userSystems.find(s => s.id == savedSystemId);
        }

        // 2. If valid saved system found, use it (overriding default from checkAuth)
        if (systemToSelect) {
          this.setSystem(systemToSelect);
        } else {
          // Ensure current system is in the list, if not (and we didn't restore one), logic remains as is
          if (this.system && !this.userSystems.find(s => s.id === this.system.id)) {
            // Fallback or validation could happen here
          }
        }

      } catch (error) {
        console.error('Error fetching user context:', error);
      }
    },

    setSystem(system) {
      this.system = system;
      if (system) {
        localStorage.setItem('selectedSystemId', system.id);
      } else {
        localStorage.removeItem('selectedSystemId');
      }
    },

    async setOrganization(organization, reloadPage = true) {
      this.currentOrganization = organization;
      if (organization) {
        localStorage.setItem('selectedOrganizationId', organization.id);
        
        // Gerar novo token com a nova organização
        try {
          const response = await api.post('/auth/change-organization', {
            organizationId: organization.id
          });
          
          if (response.data.token) {
            this.token = response.data.token;
            localStorage.setItem('token', this.token);
            this.user = jwtDecode(this.token);
            
            if (response.data.system) {
              this.system = response.data.system;
            }
            
            // Recarregar página apenas se solicitado (padrão: true)
            if (reloadPage) {
              window.location.reload();
            }
          }
        } catch (error) {
          console.error('Erro ao trocar organização:', error);
          // Se falhar, ainda mantém a organização selecionada mas sem atualizar o token
          // O usuário precisará fazer refresh ou login novamente
        }
      } else {
        localStorage.removeItem('selectedOrganizationId');
      }
    },
    
    // Versão silenciosa que não recarrega a página (usada em fetchUserContext)
    async setOrganizationSilent(organization) {
      // Atualizar estado sem recarregar página
      this.currentOrganization = organization;
      if (organization) {
        localStorage.setItem('selectedOrganizationId', organization.id);
        
        // Gerar novo token com a nova organização
        try {
          const response = await api.post('/auth/change-organization', {
            organizationId: organization.id
          });
          
          if (response.data.token) {
            this.token = response.data.token;
            localStorage.setItem('token', this.token);
            this.user = jwtDecode(this.token);
            
            if (response.data.system) {
              this.system = response.data.system;
            }
            // Não recarregar a página aqui
          }
        } catch (error) {
          console.error('Erro ao trocar organização silenciosamente:', error);
        }
      } else {
        localStorage.removeItem('selectedOrganizationId');
      }
    },

    // Action to check authentication status on app load/refresh
    async checkAuth() {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
          // Check if token is expired
          if (decodedToken.exp * 1000 < Date.now()) {
            this.logout();
            return;
          }

          this.token = token;
          this.user = decodedToken;

          // Se estiver impersonando e não tiver originalToken, tentar recuperar do localStorage
          if (decodedToken.impersonatedBy && !this.originalToken) {
            const storedOriginalToken = localStorage.getItem('originalToken');
            if (storedOriginalToken) {
              this.originalToken = storedOriginalToken;
              try {
                const originalDecoded = jwtDecode(storedOriginalToken);
                this.originalUser = {
                  id: originalDecoded.id,
                  name: originalDecoded.name,
                  email: originalDecoded.email
                };
              } catch (e) {
                // Se não conseguir decodificar, limpar
                localStorage.removeItem('originalToken');
              }
            }
          }

          // Buscar informações do sistema e nome do usuário se não estiverem no store
          if ((!this.system || !this.user?.name) && decodedToken.id) {
            try {
              // Buscar o usuário completo com roles e sistema
              const userResponse = await api.get(`/api/users/${decodedToken.id}`);
              if (userResponse.data) {
                // Atualizar nome do usuário se não estiver no token
                if (!this.user?.name && userResponse.data.name) {
                  this.user = { ...this.user, name: userResponse.data.name };
                }

                // Buscar sistema se não estiver no store
                if (!this.system && userResponse.data.Roles && userResponse.data.Roles.length > 0) {
                  // Procurar uma role que tenha sistema associado
                  for (const role of userResponse.data.Roles) {
                    if (role.id_system) {
                      const systemResponse = await api.get(`/api/systems/${role.id_system}`);
                      if (systemResponse.data) {
                        this.system = {
                          id: systemResponse.data.id,
                          name: systemResponse.data.name,
                          sigla: systemResponse.data.sigla,
                          logo: systemResponse.data.logo,
                          primaryColor: systemResponse.data.primaryColor,
                          secondaryColor: systemResponse.data.secondaryColor,
                          textColor: systemResponse.data.textColor
                        };
                        break; // Usar o primeiro sistema encontrado
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error loading user/system info:', error);
              // Não fazer logout se falhar ao carregar, apenas logar o erro
            }
          }

          // Fetch full context (all systems and organizations)
          await this.fetchUserContext();

        } catch (error) {
          console.error('Error decoding token:', error);
          this.logout();
        }
      } else {
        // If token isn't in localStorage, ensure store is also clear
        // But do NOT clear selectedOrganizationId yet, maybe valid for next login? 
        // Better to clear it to avoid stale state for different users.
        this.logout();
      }
    },
  },
});
