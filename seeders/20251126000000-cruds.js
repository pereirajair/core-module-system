'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const cruds = [
      {
        name: 'users',
        title: 'Usuários',
        icon: 'people',
        resource: 'users',
        endpoint: '/api/users',
        active: true,
        isSystem: true,
        config: JSON.stringify({
          title: 'Usuários',
          icon: 'people',
          resource: 'users',
          endpoint: '/api/users',
          rowKey: 'id',
          createRoute: '/crud/users/new',
          editRoute: '/crud/users/:id',
          deleteMessage: 'Deseja realmente excluir o usuário "${row.name}"?',
          deleteSuccessMessage: 'Usuário excluído com sucesso!',
          columns: [
            {
              name: 'name',
              required: true,
              label: 'Nome',
              align: 'left',
              field: 'name',
              sortable: true
            },
            {
              name: 'email',
              required: true,
              label: 'Email',
              align: 'left',
              field: 'email',
              sortable: true
            },
            {
              name: 'permissions',
              label: 'Permissões',
              align: 'left',
              field: 'Roles',
              format: 'array'
            },
            {
              name: 'organizations',
              label: 'Organizações',
              align: 'left',
              field: 'Organizations',
              format: 'array'
            }
          ],
          fields: [
            {
              name: 'name',
              label: 'Nome',
              type: 'text',
              rules: ['val => !!val || "Nome é obrigatório"']
            },
            {
              name: 'email',
              label: 'Email',
              type: 'email',
              rules: ['val => !!val || "Email é obrigatório"', 'val => /.+@.+\\..+/.test(val) || "Email inválido"']
            },
            {
              name: 'password',
              label: 'Senha',
              type: 'password',
              skipIfEmpty: true,
              rules: ['val => !isNew || !!val || "Senha é obrigatória para novos usuários"', 'val => !val || val.length >= 6 || "Senha deve ter no mínimo 6 caracteres"']
            }
          ],
          relations: [
            {
              type: 'transfer',
              label: 'Permissões',
              endpoint: '/api/roles',
              field: 'Roles',
              itemLabel: 'name',
              itemValue: 'id',
              availableLabel: 'Permissões Disponíveis',
              selectedLabel: 'Permissões do Usuário',
              payloadField: 'roleIds'
            },
            {
              type: 'transfer',
              label: 'Organizações',
              endpoint: '/api/organizations',
              field: 'Organizations',
              itemLabel: 'name',
              itemValue: 'id',
              availableLabel: 'Organizações Disponíveis',
              selectedLabel: 'Organizações do Usuário',
              payloadField: 'organizationIds'
            }
          ]
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'roles',
        title: 'Permissões',
        icon: 'admin_panel_settings',
        resource: 'permissions',
        endpoint: '/api/roles',
        active: true,
        isSystem: true,
        config: JSON.stringify({
          title: 'Permissões',
          icon: 'admin_panel_settings',
          resource: 'permissions',
          endpoint: '/api/roles',
          rowKey: 'id',
          createRoute: '/crud/roles/new',
          editRoute: '/crud/roles/:id',
          deleteMessage: 'Deseja realmente excluir a permissão "${row.name}"?',
          deleteSuccessMessage: 'Permissão excluída com sucesso!',
          columns: [
            {
              name: 'system',
              required: true,
              label: 'Sistema',
              align: 'left',
              field: 'System.name',
              sortable: true
            },
            {
              name: 'name',
              required: true,
              label: 'Nome',
              align: 'left',
              field: 'name',
              sortable: true
            }
          ],
          fields: [
            {
              name: 'name',
              label: 'Nome da Permissão',
              type: 'text',
              rules: ['val => !!val || "Nome é obrigatório"']
            },
            {
              name: 'id_system',
              label: 'Sistema',
              type: 'select',
              optionsEndpoint: '/api/systems',
              optionLabel: 'name',
              optionValue: 'id',
              rules: ['val => !!val || "Sistema é obrigatório"']
            }
          ],
          relations: [
            {
              type: 'transfer',
              label: 'Funções',
              endpoint: '/api/functions',
              field: 'Functions',
              itemLabel: 'title',
              itemValue: 'id',
              availableLabel: 'Funções Disponíveis',
              selectedLabel: 'Funções da Permissão',
              payloadField: 'functionIds',
              updateEndpoint: 'functions'
            }
          ]
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'organizations',
        title: 'Organizações',
        icon: 'business',
        resource: 'organizations',
        endpoint: '/api/organizations',
        active: true,
        isSystem: true,
        config: JSON.stringify({
          title: 'Organizações',
          icon: 'business',
          resource: 'organizations',
          endpoint: '/api/organizations',
          rowKey: 'id',
          createRoute: '/crud/organizations/new',
          editRoute: '/crud/organizations/:id',
          deleteMessage: 'Deseja realmente excluir a organização "${row.name}"?',
          deleteSuccessMessage: 'Organização excluída com sucesso!',
          columns: [
            {
              name: 'name',
              required: true,
              label: 'Nome',
              align: 'left',
              field: 'name',
              sortable: true
            },
            {
              name: 'users',
              label: 'Usuários',
              align: 'left',
              field: 'Users',
              format: 'array'
            }
          ],
          fields: [
            {
              name: 'name',
              label: 'Nome da Organização',
              type: 'text',
              rules: ['val => !!val || "Nome é obrigatório"']
            }
          ],
          relations: [
            {
              type: 'transfer',
              label: 'Usuários',
              endpoint: '/api/users',
              field: 'Users',
              itemLabel: 'name',
              itemValue: 'id',
              availableLabel: 'Usuários Disponíveis',
              selectedLabel: 'Usuários da Organização',
              payloadField: 'userIds'
            }
          ]
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'systems',
        title: 'Sistemas',
        icon: 'computer',
        resource: 'systems',
        endpoint: '/api/systems',
        active: true,
        isSystem: true,
        config: JSON.stringify({
          title: 'Sistemas',
          icon: 'computer',
          resource: 'systems',
          endpoint: '/api/systems',
          rowKey: 'id',
          createRoute: '/crud/systems/new',
          editRoute: '/crud/systems/:id',
          deleteMessage: 'Deseja realmente excluir o sistema "${row.name}"?',
          deleteSuccessMessage: 'Sistema excluído com sucesso!',
          columns: [
            {
              name: 'icon',
              label: 'Ícone',
              align: 'center',
              field: 'icon',
              type: 'image',
              sortable: false,
              style: 'width: 80px',
              imageStyle: 'width: 48px; height: 48px; object-fit: contain;'
            },
            {
              name: 'name',
              required: true,
              label: 'Nome',
              align: 'left',
              field: 'name',
              sortable: true
            },
            {
              name: 'sigla',
              label: 'Sigla',
              align: 'left',
              field: 'sigla',
              sortable: true
            },
            {
              name: 'description',
              label: 'Descrição',
              align: 'left',
              field: 'description',
              sortable: false,
              style: 'max-width: 300px'
            }
          ],
          layouts: [
            {
              title: 'Informações Básicas',
              rows: [
                {
                  cols: [
                    {
                      width: '50%',
                      fields: [
                        {
                          name: 'name',
                          label: 'Nome do Sistema',
                          type: 'text',
                          rules: ['val => !!val || "Nome é obrigatório"']
                        }
                      ]
                    },
                    {
                      width: '50%',
                      fields: [
                        {
                          name: 'sigla',
                          label: 'Sigla',
                          type: 'text',
                          rules: ['val => !!val || "Sigla é obrigatória"']
                        }
                      ]
                    }
                  ]
                },
                {
                  cols: [
                    {
                      width: '100%',
                      fields: [
                        {
                          name: 'description',
                          label: 'Descrição',
                          type: 'textarea',
                          rows: 3
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              title: 'Imagens',
              rows: [
                {
                  cols: [
                    {
                      width: '50%',
                      fields: [
                        {
                          name: 'icon',
                          label: 'Ícone',
                          type: 'file',
                          accept: '.png,image/png',
                          previewType: 'image',
                          previewStyle: 'max-width: 100px; max-height: 100px; object-fit: contain;',
                          hint: 'Imagem PNG do ícone do sistema (recomendado: 64x64px)'
                        }
                      ]
                    },
                    {
                      width: '50%',
                      fields: [
                        {
                          name: 'logo',
                          label: 'Logo',
                          type: 'file',
                          accept: '.png,image/png',
                          previewType: 'image',
                          previewStyle: 'max-width: 200px; max-height: 100px; object-fit: contain;',
                          hint: 'Imagem PNG da logo do sistema'
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              title: 'Cores',
              rows: [
                {
                  cols: [
                    {
                      width: '33.33%',
                      fields: [
                        {
                          name: 'primaryColor',
                          label: 'Cor Primária',
                          type: 'color',
                          default: '#1976D2'
                        }
                      ]
                    },
                    {
                      width: '33.33%',
                      fields: [
                        {
                          name: 'secondaryColor',
                          label: 'Cor Secundária',
                          type: 'color',
                          default: '#26A69A'
                        }
                      ]
                    },
                    {
                      width: '33.33%',
                      fields: [
                        {
                          name: 'textColor',
                          label: 'Cor do Texto',
                          type: 'color',
                          default: '#FFFFFF'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ],
          fields: [],
          // relations: {
          //   type: 'transfer',
          //   label: 'Funções',
          //   endpoint: '/api/functions',
          //   field: 'Functions',
          //   itemLabel: 'title',
          //   itemValue: 'id',
          //   availableLabel: 'Funções Disponíveis',
          //   selectedLabel: 'Funções do Sistema',
          //   payloadField: 'functionIds',
          //   updateEndpoint: 'functions'
          // }
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'functions',
        title: 'Funções',
        icon: 'functions',
        resource: 'functions',
        endpoint: '/api/functions',
        active: true,
        isSystem: true,
        config: JSON.stringify({
          title: 'Funções',
          icon: 'functions',
          resource: 'functions',
          endpoint: '/api/functions',
          rowKey: 'id',
          createRoute: '/crud/functions/new',
          editRoute: '/crud/functions/:id',
          deleteMessage: 'Deseja realmente excluir a função "${row.title}"?',
          deleteSuccessMessage: 'Função excluída com sucesso!',
          columns: [
            {
              name: 'title',
              required: true,
              label: 'Título',
              align: 'left',
              field: 'title',
              sortable: true
            },
            {
              name: 'name',
              required: true,
              label: 'Nome',
              align: 'left',
              field: 'name',
              sortable: true
            }
          ],
          fields: [
            {
              name: 'name',
              label: 'Nome da Função (programação)',
              type: 'text',
              rules: ['val => !!val || "Nome é obrigatório"']
            },
            {
              name: 'title',
              label: 'Título da Função',
              type: 'text',
              rules: ['val => !!val || "Título é obrigatório"']
            }
          ]
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'menus',
        title: 'Menus',
        icon: 'menu',
        resource: 'menus',
        endpoint: '/api/menus',
        active: true,
        isSystem: true,
        config: JSON.stringify({
          title: 'Menus',
          icon: 'menu',
          resource: 'menus',
          endpoint: '/api/menus',
          rowKey: 'id',
          createRoute: '/crud/menus/new',
          editRoute: '/crud/menus/:id',
          deleteMessage: 'Deseja realmente excluir o menu "${row.name}"?',
          deleteSuccessMessage: 'Menu excluído com sucesso!',
          columns: [
            {
              name: 'name',
              required: true,
              label: 'Nome',
              align: 'left',
              field: 'name',
              sortable: true
            },
            {
              name: 'system',
              label: 'Sistema',
              align: 'left',
              field: 'System.name',
              sortable: true
            },
            {
              name: 'organization',
              label: 'Organização',
              align: 'left',
              field: 'Organization.name',
              sortable: true
            }
          ],
          fields: [

            {
              name: 'name',
              label: 'Nome do Menu',
              type: 'text',
              rules: ['val => !!val || "Nome é obrigatório"']
            },
            {
              name: 'id_system',
              label: 'Sistema',
              type: 'select',
              optionsEndpoint: '/api/systems',
              optionLabel: 'name',
              optionValue: 'id',
              rules: ['val => !!val || "Sistema é obrigatório"']
            },
            {
              name: 'id_organization',
              label: 'Organização (opcional)',
              type: 'select',
              optionsEndpoint: '/api/organizations',
              optionLabel: 'name',
              optionValue: 'id',
              allowNull: true
            }
          ],
          relations: [
            {
              type: 'sub-crud',
              label: 'Itens de Menu',
              field: 'MenuItems', // Nome da associação no backend (hasMany)
              payloadField: 'menuItems', // Campo para enviar no payload (se for salvar tudo junto) or 'MenuItems'
              crudName: 'menu-items' // Nome do CRUD referenciado (recursivo)
            }
          ]
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'menu-items',
        title: 'Itens de Menu',
        icon: 'list',
        resource: 'menu-items',
        endpoint: '/api/menus/items',
        active: true,
        isSystem: true,
        config: JSON.stringify({
          title: 'Itens de Menu',
          icon: 'list',
          resource: 'menu-items',
          endpoint: '/api/menus/items',
          rowKey: 'id',
          createRoute: '/crud/menu-items/new',
          editRoute: '/crud/menu-items/:id',
          deleteMessage: 'Deseja realmente excluir o item de menu "${row.name}"?',
          deleteSuccessMessage: 'Item de menu excluído com sucesso!',
          columns: [
            {
              name: 'icon',
              label: 'Ícone',
              type: 'icon',
              align: 'left',
              field: 'icon',
              sortable: true
            },
            {
              name: 'name',
              required: true,
              label: 'Nome',
              align: 'left',
              field: 'name',
              sortable: true
            },
            {
              name: 'route',
              label: 'Rota',
              align: 'left',
              field: 'route',
              sortable: true
            },
            {
              name: 'order',
              label: 'Ordem',
              align: 'center',
              field: 'order',
              sortable: true
            }
          ],
          fields: [
            {
              name: 'icon',
              label: 'Ícone',
              type: 'icon',
              hint: 'Nome do ícone Material Design (ex: home, settings, people)'
            },
            {
              name: 'name',
              label: 'Nome do Item',
              type: 'text',
              rules: ['val => !!val || "Nome é obrigatório"']
            },
            {
              name: 'route',
              label: 'Rota',
              type: 'text',
              rules: ['val => !!val || "Rota é obrigatória"'],
              hint: 'Ex: /crud/users, /admin/models'
            },
            {
              name: 'id_menu',
              label: 'Menu',
              type: 'select',
              optionsEndpoint: '/api/menus',
              optionLabel: 'name',
              optionValue: 'id',
              rules: ['val => !!val || "Menu é obrigatório"']
            },
            {
              name: 'id_system',
              label: 'Sistema',
              type: 'select',
              optionsEndpoint: '/api/systems',
              optionLabel: 'name',
              optionValue: 'id',
              rules: ['val => !!val || "Sistema é obrigatório"']
            },
            // {
            //   name: 'id_organization',
            //   label: 'Organização (opcional)',
            //   type: 'select',
            //   optionsEndpoint: '/api/organizations',
            //   optionLabel: 'name',
            //   optionValue: 'id',
            //   allowNull: true
            // },
            // {
            //   name: 'id_role',
            //   label: 'Permissão (opcional)',
            //   type: 'select',
            //   optionsEndpoint: '/api/roles',
            //   optionLabel: 'name',
            //   optionValue: 'id',
            //   allowNull: true,
            //   hint: 'Deixe vazio para todos os usuários do sistema'
            // },
            {
              name: 'order',
              label: 'Ordem',
              type: 'number',
              defaultValue: 0,
              hint: 'Ordem de exibição no menu'
            },
            {
              name: 'target_blank',
              label: 'Abrir em nova aba',
              type: 'boolean',
              defaultValue: false
            }
          ]
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('sys_cruds', cruds, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_cruds', null, {});
  }
};
