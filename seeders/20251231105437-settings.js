'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Insert example settings data
        await queryInterface.bulkInsert('sys_settings', [
            // Preferências do sistema SMTP
            {
                id_system: 1,
                id_user: null,
                id_organization: null,
                moduleName: 'system',
                name: 'system.smtp_host',
                description: 'Servidor SMTP para envio de emails',
                configType: 'text',
                configValue: 'smtp.gmail.com',
                active: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id_system: 1,
                id_user: null,
                id_organization: null,
                moduleName: 'system',
                name: 'system.smtp_port',
                description: 'Porta do servidor SMTP',
                configType: 'number',
                configValue: '465',
                active: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id_system: 1,
                id_user: null,
                id_organization: null,
                moduleName: 'system',
                name: 'system.smtp_user',
                description: 'Usuário para autenticação SMTP',
                configType: 'text',
                configValue: 'noreply@example.com',
                active: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id_system: 1,
                id_user: null,
                id_organization: null,
                moduleName: 'system',
                name: 'system.smtp_pass',
                description: 'Senha para autenticação SMTP',
                configType: 'password',
                configValue: '',
                active: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            // Configuração do chat XMPP
            {
                id_system: 1,
                id_user: null,
                id_organization: null,
                moduleName: 'chat',
                name: 'chat.xmpp_server',
                description: 'Servidor XMPP para chat',
                configType: 'text',
                configValue: 'http://localhost:5280',
                active: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], {});

        // 2. Create CRUD for Settings
        await queryInterface.bulkInsert('sys_cruds', [
            {
                name: 'settings',
                title: 'Preferências',
                icon: 'settings',
                resource: 'settings',
                endpoint: '/api/settings',
                active: true,
                isSystem: false,
                config: JSON.stringify({
                    title: 'Preferências',
                    icon: 'settings',
                    resource: 'settings',
                    endpoint: '/api/settings',
                    rowKey: 'id',
                    createRoute: '/crud/settings/new',
                    editRoute: '/crud/settings/:id',
                    deleteMessage: 'Deseja realmente excluir a configuração "${row.name}"?',
                    deleteSuccessMessage: 'Configuração excluída com sucesso!',
                    columns: [
                        {
                            name: 'moduleName',
                            label: 'Módulo',
                            align: 'left',
                            field: 'moduleName',
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
                            name: 'configType',
                            label: 'Tipo',
                            align: 'center',
                            field: 'configType',
                            sortable: true
                        },
                        {
                            name: 'system',
                            label: 'Sistema',
                            align: 'left',
                            field: 'System.name',
                            sortable: false
                        },
                        {
                            name: 'active',
                            label: 'Ativo',
                            align: 'center',
                            field: 'active',
                            sortable: true
                        }
                    ],
                    layouts: [
                        {
                            title: 'Informações da Configuração',
                            rows: [
                                {
                                    cols: [
                                        {
                                            fields: [
                                                {
                                                    name: 'moduleName',
                                                    label: 'Nome do Módulo',
                                                    type: 'text',
                                                    rules: ['val => !!val || "Nome do módulo é obrigatório"']
                                                }
                                            ]
                                        },
                                        {
                                            fields: [
                                                {
                                                    name: 'name',
                                                    label: 'Nome da Configuração',
                                                    type: 'text',
                                                    rules: ['val => !!val || "Nome é obrigatório"']
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    cols: [
                                        {
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
                                },
                                {
                                    cols: [
                                        {
                                            fields: [
                                                {
                                                    name: 'configType',
                                                    label: 'Tipo de Configuração',
                                                    type: 'select',
                                                    options: [
                                                        { label: 'Texto', value: 'text' },
                                                        { label: 'Número', value: 'number' },
                                                        { label: 'Booleano', value: 'boolean' },
                                                        { label: 'Senha', value: 'password' },
                                                        { label: 'JSON', value: 'json' }
                                                    ],
                                                    optionLabel: 'label',
                                                    optionValue: 'value',
                                                    rules: ['val => !!val || "Tipo é obrigatório"']
                                                }
                                            ]
                                        },
                                        {
                                            fields: [
                                                {
                                                    name: 'configValue',
                                                    label: 'Valor',
                                                    type: 'textarea',
                                                    rows: 3
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    cols: [
                                        {
                                            fields: [
                                                {
                                                    name: 'active',
                                                    label: 'Ativo',
                                                    type: 'boolean',
                                                    default: true
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    relations: [
                        {
                            type: 'select',
                            label: 'Sistema',
                            endpoint: '/api/systems',
                            field: 'System',
                            modelName: 'System',
                            itemLabel: 'name',
                            itemValue: 'id',
                            payloadField: 'id_system'
                        },
                        {
                            type: 'select',
                            label: 'Usuário',
                            endpoint: '/api/users',
                            modelName: 'User',
                            field: 'User',
                            itemLabel: 'name',
                            itemValue: 'id',
                            payloadField: 'id_user'
                        },
                        {
                            type: 'select',
                            label: 'Organização',
                            modelName: 'Organization',
                            endpoint: '/api/organizations',
                            field: 'Organization',
                            itemLabel: 'name',
                            itemValue: 'id',
                            payloadField: 'id_organization'
                        }
                    ]
                }),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], {});

        // 3. Create functions for Settings
        await queryInterface.bulkInsert('sys_functions', [
            {
                name: 'setting.visualizar_settings',
                title: 'Visualizar Preferências',
                // description: 'Permite visualizar Preferências do sistema',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'setting.manter_settings',
                title: 'Manter Preferências',
                // description: 'Permite criar e editar Preferências do sistema',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'setting.excluir_settings',
                title: 'Excluir Preferências',
                // description: 'Permite excluir Preferências do sistema',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], {});

        // 4. Get function IDs
        const functions = await queryInterface.sequelize.query(
            `SELECT id, name FROM sys_functions WHERE name LIKE 'setting.%'`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const functionMap = {};
        functions.forEach(f => {
            functionMap[f.name] = f.id;
        });

        // 5. Assign functions to ADMIN role (id: 1) for System 1
        const roleFunctionInserts = [
            {
                id_role: 1,
                id_function: functionMap['setting.visualizar_settings'],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id_role: 1,
                id_function: functionMap['setting.manter_settings'],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id_role: 1,
                id_function: functionMap['setting.excluir_settings'],
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        await queryInterface.bulkInsert('sys_roles_functions', roleFunctionInserts, {});

        // 6. Create menu item for Settings in Administration menu (id: 1)
        await queryInterface.bulkInsert('sys_menu_items', [
            {
                name: 'Preferências',
                icon: 'settings',
                route: '/crud/settings',
                target_blank: false,
                id_menu: 1,
                id_system: 1,
                id_organization: null,
                id_role: null,
                order: 6,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], {});
    },

    async down(queryInterface, Sequelize) {
        // Remove in reverse order
        await queryInterface.bulkDelete('sys_menu_items', { route: '/crud/settings' }, {});

        // Get function IDs before deleting
        const functions = await queryInterface.sequelize.query(
            `SELECT id FROM sys_functions WHERE name LIKE 'setting.%'`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const functionIds = functions.map(f => f.id);

        if (functionIds.length > 0) {
            await queryInterface.bulkDelete('sys_roles_functions', {
                id_function: functionIds
            }, {});
        }

        await queryInterface.bulkDelete('sys_functions', {
            name: { [Sequelize.Op.like]: 'setting.%' }
        }, {});
        await queryInterface.bulkDelete('sys_cruds', { name: 'settings' }, {});
        await queryInterface.bulkDelete('sys_settings', null, {});
    }
};
