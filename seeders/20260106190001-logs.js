'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Create CRUD for Logs (read-only)
        await queryInterface.bulkInsert('sys_cruds', [
            {
                name: 'logs',
                title: 'Logs',
                icon: 'description',
                resource: 'Logs',
                endpoint: '/api/logs',
                active: true,
                isSystem: false,
                config: JSON.stringify({
                    title: 'Logs do Sistema',
                    icon: 'description',
                    resource: 'Logs',
                    endpoint: '/api/logs',
                    rowKey: 'id',
                    readOnly: true, // Interface apenas de consulta
                    showFab: false, // Não exibir botão de inclusão
                    canDelete: false, // Não permitir exclusão
                    canEdit: false, // Não permitir edição
                    columns: [
                        {
                            name: 'date',
                            label: 'Data/Hora',
                            align: 'center',
                            field: 'date',
                            sortable: true,
                            style: 'min-width: 180px',
                            format: 'datetime'
                        },
                        {
                            name: 'module',
                            label: 'Módulo',
                            align: 'left',
                            field: 'module',
                            sortable: true,
                            style: 'min-width: 120px'
                        },
                        {
                            name: 'logType',
                            label: 'Tipo',
                            align: 'center',
                            field: 'logType',
                            sortable: true,
                            style: 'min-width: 100px',
                            format: 'badge',
                            badgeMap: {
                                1: { label: 'Normal', color: 'info' },
                                2: { label: 'Warning', color: 'warning' },
                                3: { label: 'Error', color: 'negative' }
                            }
                        },
                        {
                            name: 'logMessage',
                            label: 'Mensagem',
                            align: 'left',
                            field: 'logMessage',
                            sortable: false,
                            style: 'min-width: 300px'
                        },
                        {
                            name: 'userName',
                            label: 'Usuário',
                            align: 'center',
                            field: 'User.name',
                            sortable: true,
                            style: 'min-width: 160px'
                        },
                        {
                            name: 'id_organization',
                            label: 'Organização',
                            align: 'center',
                            field: 'id_organization',
                            sortable: true,
                            style: 'min-width: 120px'
                        },
                        {
                            name: 'actions',
                            label: 'Ações',
                            align: 'right',
                            field: 'actions',
                            sortable: false,
                            items: [
                                {
                                    type: 'dialog',
                                    icon: 'code',
                                    color: 'primary',
                                    tooltip: 'Visualizar Context (JSON)',
                                    title: 'Context do Log',
                                    component: 'JsonViewerDialog',
                                    props: {
                                        json: (row) => row.context,
                                        title: (row) => `Context do Log - ${row.module || 'N/A'}`
                                    },
                                    condition: 'row.context && row.context !== null && row.context !== "null"'
                                }
                            ]
                        }
                    ],
                    layouts: [
                        {
                            title: 'Informações do Log',
                            rows: [
                                {
                                    cols: [
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'date',
                                                    label: 'Data/Hora',
                                                    type: 'datetime',
                                                    readonly: true
                                                }
                                            ]
                                        },
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'module',
                                                    label: 'Módulo',
                                                    type: 'text',
                                                    readonly: true
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    cols: [
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'logType',
                                                    label: 'Tipo',
                                                    type: 'select',
                                                    readonly: true,
                                                    options: [
                                                        { label: 'Normal', value: 1 },
                                                        { label: 'Warning', value: 2 },
                                                        { label: 'Error', value: 3 }
                                                    ]
                                                }
                                            ]
                                        },
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'id_user',
                                                    label: 'Usuário',
                                                    type: 'number',
                                                    readonly: true
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
                                                    name: 'logMessage',
                                                    label: 'Mensagem',
                                                    type: 'textarea',
                                                    rows: 4,
                                                    readonly: true
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
                                                    name: 'stackTrace',
                                                    label: 'Stack Trace',
                                                    type: 'textarea',
                                                    rows: 6,
                                                    readonly: true
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
                                                    name: 'context',
                                                    label: 'Contexto',
                                                    type: 'textarea',
                                                    rows: 4,
                                                    readonly: true
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    fields: [
                        {
                            name: 'date',
                            label: 'Data/Hora',
                            type: 'datetime',
                            readonly: true
                        },
                        {
                            name: 'module',
                            label: 'Módulo',
                            type: 'text',
                            readonly: true
                        },
                        {
                            name: 'logType',
                            label: 'Tipo',
                            type: 'select',
                            readonly: true,
                            options: [
                                { label: 'Normal', value: 1 },
                                { label: 'Warning', value: 2 },
                                { label: 'Error', value: 3 }
                            ]
                        },
                        {
                            name: 'logMessage',
                            label: 'Mensagem',
                            type: 'textarea',
                            readonly: true
                        },
                        {
                            name: 'id_user',
                            label: 'Usuário',
                            type: 'number',
                            readonly: true
                        },
                        {
                            name: 'id_organization',
                            label: 'Organização',
                            type: 'number',
                            readonly: true
                        },
                        {
                            name: 'id_system',
                            label: 'Sistema',
                            type: 'number',
                            readonly: true
                        },
                        {
                            name: 'stackTrace',
                            label: 'Stack Trace',
                            type: 'textarea',
                            readonly: true
                        },
                        {
                            name: 'context',
                            label: 'Contexto',
                            type: 'textarea',
                            readonly: true
                        }
                    ]
                }),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], { ignoreDuplicates: true });

        // 2. Create functions for Logs (apenas visualizar)
        await queryInterface.bulkInsert('sys_functions', [
            {
                name: 'logs.visualizar_logs',
                title: 'Visualizar Logs',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], { ignoreDuplicates: true });

        // 3. Get function IDs
        const functions = await queryInterface.sequelize.query(
            `SELECT id, name FROM sys_functions WHERE name = 'logs.visualizar_logs'`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        if (functions.length > 0) {
            const functionId = functions[0].id;

            // 4. Assign function to ADMIN role (id: 1) for System 1
            await queryInterface.bulkInsert('sys_roles_functions', [
                {
                    id_role: 1,
                    id_function: functionId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ], { ignoreDuplicates: true });
        }

        // 5. Get max order from menu items in Administration menu (id: 1)
        const maxOrderResult = await queryInterface.sequelize.query(
            `SELECT MAX(\`order\`) as maxOrder FROM sys_menu_items WHERE id_menu = 1`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const maxOrder = maxOrderResult[0]?.maxOrder || 0;

        // 6. Create menu item for Logs in Administration menu (id: 1)
        await queryInterface.bulkInsert('sys_menu_items', [
            {
                name: 'Logs',
                icon: 'description',
                route: '/crud/logs',
                target_blank: false,
                id_menu: 1,
                id_system: 1,
                id_organization: null,
                id_role: null,
                order: maxOrder + 1,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], { ignoreDuplicates: true });
    },

    async down(queryInterface, Sequelize) {
        // Remove in reverse order
        await queryInterface.bulkDelete('sys_menu_items', { route: '/crud/logs' }, {});

        // Get function IDs before deleting
        const functions = await queryInterface.sequelize.query(
            `SELECT id FROM sys_functions WHERE name = 'logs.visualizar_logs'`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const functionIds = functions.map(f => f.id);

        if (functionIds.length > 0) {
            await queryInterface.bulkDelete('sys_roles_functions', {
                id_function: functionIds
            }, {});
        }

        await queryInterface.bulkDelete('sys_functions', {
            name: 'logs.visualizar_logs'
        }, {});
        await queryInterface.bulkDelete('sys_cruds', { name: 'logs' }, {});
    }
};

