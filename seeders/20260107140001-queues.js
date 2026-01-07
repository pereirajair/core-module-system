'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Create CRUD for Queues
        await queryInterface.bulkInsert('sys_cruds', [
            {
                name: 'queues',
                title: 'Filas',
                icon: 'list_alt',
                resource: 'Queue',
                endpoint: '/api/queues',
                active: true,
                isSystem: false,
                config: JSON.stringify({
                    title: 'Filas',
                    icon: 'list_alt',
                    resource: 'Queue',
                    endpoint: '/api/queues',
                    rowKey: 'id',
                    createRoute: '/crud/queues/new',
                    editRoute: '/crud/queues/:id',
                    deleteMessage: 'Deseja realmente excluir a fila "${row.name}"?',
                    deleteSuccessMessage: 'Fila excluída com sucesso!',
                    columns: [
                        {
                            name: 'name',
                            required: true,
                            label: 'Nome',
                            align: 'left',
                            field: 'name',
                            sortable: true,
                            style: 'min-width: 200px'
                        },
                        {
                            name: 'description',
                            label: 'Descrição',
                            align: 'left',
                            field: 'description',
                            sortable: false,
                            style: 'min-width: 250px'
                        },
                        {
                            name: 'itemsPerBatch',
                            label: 'Itens por Lote',
                            align: 'center',
                            field: 'itemsPerBatch',
                            sortable: true,
                            style: 'min-width: 120px',
                            format: 'number'
                        },
                        {
                            name: 'active',
                            label: 'Ativo',
                            align: 'center',
                            field: 'active',
                            sortable: true,
                            style: 'min-width: 80px',
                            format: 'badge'
                        },
                        {
                            name: 'processing',
                            label: 'Processando',
                            align: 'center',
                            field: 'processing',
                            sortable: true,
                            style: 'min-width: 100px',
                            format: 'badge'
                        },
                        {
                            name: 'totalItems',
                            label: 'Total Itens',
                            align: 'center',
                            field: 'totalItems',
                            sortable: true,
                            style: 'min-width: 100px',
                            format: 'number'
                        },
                        {
                            name: 'totalProcessed',
                            label: 'Processados',
                            align: 'center',
                            field: 'totalProcessed',
                            sortable: true,
                            style: 'min-width: 100px',
                            format: 'number'
                        },
                        {
                            name: 'totalFailed',
                            label: 'Falhas',
                            align: 'center',
                            field: 'totalFailed',
                            sortable: true,
                            style: 'min-width: 100px',
                            format: 'number'
                        },
                        {
                            name: 'actions',
                            label: 'Ações',
                            align: 'right',
                            field: 'actions',
                            sortable: false,
                            items: [
                                {
                                    type: 'api',
                                    icon: 'play_arrow',
                                    color: 'positive',
                                    tooltip: 'Processar Fila',
                                    method: 'post',
                                    endpoint: '${context.endpoint}/${row.id}/process',
                                    roles: ['queue.manter_queues'],
                                    onSuccess: {
                                        type: 'message',
                                        message: 'Fila processada com sucesso!',
                                        color: 'positive',
                                        icon: 'check'
                                    },
                                    onSuccessActions: ['refresh']
                                },
                                {
                                    type: 'delete',
                                    icon: 'delete',
                                    color: 'negative',
                                    tooltip: 'Excluir',
                                    roles: ['queue.excluir_queues']
                                }
                            ]
                        }
                    ],
                    layouts: [
                        {
                            title: 'Informações da Fila',
                            rows: [
                                {
                                    cols: [
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'name',
                                                    label: 'Nome da Fila *',
                                                    type: 'text',
                                                    rules: ['val => !!val || "Nome é obrigatório"'],
                                                    hint: 'Nome único para identificar a fila'
                                                }
                                            ]
                                        },
                                        {
                                            width: '50%',
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
                                                    rows: 2,
                                                    hint: 'Descrição da fila'
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
                                                    name: 'controller',
                                                    label: 'Controller *',
                                                    type: 'text',
                                                    rules: ['val => !!val || "Controller é obrigatório"'],
                                                    hint: 'Caminho do controller (ex: @gestor/pessoa/controllers/queueController)'
                                                }
                                            ]
                                        },
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'method',
                                                    label: 'Método *',
                                                    type: 'text',
                                                    rules: ['val => !!val || "Método é obrigatório"'],
                                                    hint: 'Nome do método do controller que processa os itens'
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    cols: [
                                        {
                                            width: '33%',
                                            fields: [
                                                {
                                                    name: 'itemsPerBatch',
                                                    label: 'Itens por Lote *',
                                                    type: 'number',
                                                    rules: ['val => !!val || "Itens por lote é obrigatório"', 'val => val > 0 || "Deve ser maior que zero"'],
                                                    default: 10,
                                                    hint: 'Quantidade de itens processados por vez'
                                                }
                                            ]
                                        },
                                        {
                                            width: '33%',
                                            fields: [
                                                {
                                                    name: 'maxAttempts',
                                                    label: 'Máx. Tentativas *',
                                                    type: 'number',
                                                    rules: ['val => !!val || "Máximo de tentativas é obrigatório"', 'val => val > 0 || "Deve ser maior que zero"'],
                                                    default: 3,
                                                    hint: 'Número máximo de tentativas para processar um item com erro'
                                                }
                                            ]
                                        },
                                        {
                                            width: '33%',
                                            fields: [
                                                {
                                                    name: 'retryDelay',
                                                    label: 'Delay Retry (seg) *',
                                                    type: 'number',
                                                    rules: ['val => !!val || "Delay de retry é obrigatório"', 'val => val >= 0 || "Deve ser maior ou igual a zero"'],
                                                    default: 60,
                                                    hint: 'Delay em segundos antes de tentar processar novamente um item com erro'
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            title: 'Estatísticas',
                            rows: [
                                {
                                    cols: [
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'lastProcessed',
                                                    label: 'Último Processamento',
                                                    type: 'datetime',
                                                    readonly: true
                                                }
                                            ]
                                        },
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'processing',
                                                    label: 'Processando',
                                                    type: 'boolean',
                                                    readonly: true
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    cols: [
                                        {
                                            width: '33%',
                                            fields: [
                                                {
                                                    name: 'totalItems',
                                                    label: 'Total de Itens',
                                                    type: 'number',
                                                    readonly: true
                                                }
                                            ]
                                        },
                                        {
                                            width: '33%',
                                            fields: [
                                                {
                                                    name: 'totalProcessed',
                                                    label: 'Total Processados',
                                                    type: 'number',
                                                    readonly: true
                                                }
                                            ]
                                        },
                                        {
                                            width: '33%',
                                            fields: [
                                                {
                                                    name: 'totalFailed',
                                                    label: 'Total Falhas',
                                                    type: 'number',
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
                            name: 'name',
                            label: 'Nome da Fila',
                            type: 'text',
                            rules: ['val => !!val || "Nome é obrigatório"']
                        },
                        {
                            name: 'description',
                            label: 'Descrição',
                            type: 'textarea',
                            rows: 2
                        },
                        {
                            name: 'controller',
                            label: 'Controller',
                            type: 'text',
                            rules: ['val => !!val || "Controller é obrigatório"']
                        },
                        {
                            name: 'method',
                            label: 'Método',
                            type: 'text',
                            rules: ['val => !!val || "Método é obrigatório"']
                        },
                        {
                            name: 'itemsPerBatch',
                            label: 'Itens por Lote',
                            type: 'number',
                            default: 10
                        },
                        {
                            name: 'maxAttempts',
                            label: 'Máximo de Tentativas',
                            type: 'number',
                            default: 3
                        },
                        {
                            name: 'retryDelay',
                            label: 'Delay de Retry (segundos)',
                            type: 'number',
                            default: 60
                        },
                        {
                            name: 'active',
                            label: 'Ativo',
                            type: 'boolean',
                            default: true
                        }
                    ]
                }),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], { ignoreDuplicates: true });

        // 2. Create functions for Queues
        await queryInterface.bulkInsert('sys_functions', [
            {
                name: 'queue.visualizar_queues',
                title: 'Visualizar Filas',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'queue.manter_queues',
                title: 'Manter Filas',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'queue.excluir_queues',
                title: 'Excluir Filas',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], { ignoreDuplicates: true });

        // 3. Get function IDs
        const functions = await queryInterface.sequelize.query(
            `SELECT id, name FROM sys_functions WHERE name LIKE 'queue.%'`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const functionMap = {};
        functions.forEach(f => {
            functionMap[f.name] = f.id;
        });

        // 4. Assign functions to ADMIN role (id: 1) for System 1
        if (functionMap['queue.visualizar_queues'] && functionMap['queue.manter_queues'] && functionMap['queue.excluir_queues']) {
            await queryInterface.bulkInsert('sys_roles_functions', [
                {
                    id_role: 1,
                    id_function: functionMap['queue.visualizar_queues'],
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id_role: 1,
                    id_function: functionMap['queue.manter_queues'],
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id_role: 1,
                    id_function: functionMap['queue.excluir_queues'],
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

        // 6. Create menu item for Queues in Administration menu (id: 1)
        await queryInterface.bulkInsert('sys_menu_items', [
            {
                name: 'Filas',
                icon: 'list_alt',
                route: '/crud/queues',
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
        await queryInterface.bulkDelete('sys_menu_items', { route: '/crud/queues' }, {});

        // Get function IDs before deleting
        const functions = await queryInterface.sequelize.query(
            `SELECT id FROM sys_functions WHERE name LIKE 'queue.%'`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const functionIds = functions.map(f => f.id);

        if (functionIds.length > 0) {
            await queryInterface.bulkDelete('sys_roles_functions', {
                id_function: functionIds
            }, {});
        }

        await queryInterface.bulkDelete('sys_functions', {
            name: { [Sequelize.Op.like]: 'queue.%' }
        }, {});
        await queryInterface.bulkDelete('sys_cruds', { name: 'queues' }, {});
    }
};

