'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Create CRUD for BatchJobs
        await queryInterface.bulkInsert('sys_cruds', [
            {
                name: 'batch-jobs',
                title: 'Batch Jobs',
                icon: 'queue',
                resource: 'BatchJob',
                endpoint: '/api/batch-jobs',
                active: true,
                isSystem: true,
                config: JSON.stringify({
                    title: 'Batch Jobs',
                    icon: 'queue',
                    resource: 'BatchJob',
                    endpoint: '/api/batch-jobs',
                    rowKey: 'id',
                    createRoute: '/crud/batch-jobs/new',
                    editRoute: '/crud/batch-jobs/:id',
                    deleteMessage: 'Deseja realmente excluir o batch job "${row.name}"?',
                    deleteSuccessMessage: 'Batch job excluído com sucesso!',
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
                            name: 'cronExpression',
                            label: 'Expressão Cron',
                            align: 'center',
                            field: 'cronExpression',
                            sortable: true,
                            style: 'min-width: 150px'
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
                            name: 'lastExecution',
                            label: 'Última Execução',
                            align: 'center',
                            field: 'lastExecution',
                            sortable: true,
                            style: 'min-width: 180px',
                            format: 'datetime'
                        },
                        {
                            name: 'lastExecutionSuccess',
                            label: 'Status',
                            align: 'center',
                            field: 'lastExecutionSuccess',
                            sortable: true,
                            style: 'min-width: 100px',
                            format: 'badge',
                            badgeTrueLabel: 'OK',
                            badgeFalseLabel: 'Erro'
                        },
                        {
                            name: 'totalExecutions',
                            label: 'Total Execuções',
                            align: 'center',
                            field: 'totalExecutions',
                            sortable: true,
                            style: 'min-width: 120px',
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
                                    tooltip: 'Executar Batch Job',
                                    method: 'post',
                                    endpoint: '${context.endpoint}/${row.id}/execute',
                                    roles: ['batch.manter_batch_jobs'],
                                    onSuccess: {
                                        type: 'message',
                                        message: 'Batch job executado com sucesso!',
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
                                    roles: ['batch.excluir_batch_jobs']
                                }
                            ]
                        }
                    ],
                    layouts: [
                        {
                            title: 'Informações do Batch Job',
                            rows: [
                                {
                                    cols: [
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'name',
                                                    label: 'Nome do Batch Job *',
                                                    type: 'text',
                                                    rules: ['val => !!val || "Nome é obrigatório"'],
                                                    hint: 'Nome único para identificar o batch job'
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
                                                    hint: 'Descrição do que o batch job faz'
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
                                                    hint: 'Caminho do controller (ex: @gestor/pessoa/controllers/batchController)'
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
                                                    hint: 'Nome do método do controller a ser executado'
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
                                                    name: 'cronExpression',
                                                    label: 'Expressão Cron *',
                                                    type: 'text',
                                                    rules: [
                                                        'val => !!val || "Expressão cron é obrigatória"',
                                                        'val => /^[0-9*\/\-, ]+$/.test(val) || "Formato inválido. Use: minuto hora dia mês dia-semana (ex: */2 * * * *)"'
                                                    ],
                                                    hint: 'Formato: minuto hora dia mês dia-semana (ex: */2 * * * * = a cada 2 minutos)',
                                                    placeholder: '*/2 * * * *'
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
                                                    name: 'parameters',
                                                    label: 'Parâmetros (JSON)',
                                                    type: 'textarea',
                                                    rows: 4,
                                                    hint: 'Parâmetros em formato JSON para passar ao método do controller (ex: {"pessoas": [{"nome": "João"}, {"nome": "Maria"}]})'
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            title: 'Estatísticas de Execução',
                            rows: [
                                {
                                    cols: [
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'lastExecution',
                                                    label: 'Última Execução',
                                                    type: 'datetime',
                                                    readonly: true
                                                }
                                            ]
                                        },
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'lastExecutionSuccess',
                                                    label: 'Última Execução Bem-sucedida',
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
                                                    name: 'totalExecutions',
                                                    label: 'Total de Execuções',
                                                    type: 'number',
                                                    readonly: true
                                                }
                                            ]
                                        },
                                        {
                                            width: '33%',
                                            fields: [
                                                {
                                                    name: 'totalSuccess',
                                                    label: 'Total de Sucessos',
                                                    type: 'number',
                                                    readonly: true
                                                }
                                            ]
                                        },
                                        {
                                            width: '33%',
                                            fields: [
                                                {
                                                    name: 'totalErrors',
                                                    label: 'Total de Erros',
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
                                                    name: 'lastExecutionLog',
                                                    label: 'Último Log de Execução',
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
                            name: 'name',
                            label: 'Nome do Batch Job',
                            type: 'text',
                            rules: ['val => !!val || "Nome é obrigatório"'],
                            hint: 'Nome único para identificar o batch job'
                        },
                        {
                            name: 'description',
                            label: 'Descrição',
                            type: 'textarea',
                            rows: 2,
                            hint: 'Descrição do que o batch job faz'
                        },
                        {
                            name: 'controller',
                            label: 'Controller',
                            type: 'text',
                            rules: ['val => !!val || "Controller é obrigatório"'],
                            hint: 'Caminho do controller (ex: @gestor/pessoa/controllers/batchController)'
                        },
                        {
                            name: 'method',
                            label: 'Método',
                            type: 'text',
                            rules: ['val => !!val || "Método é obrigatório"'],
                            hint: 'Nome do método do controller a ser executado'
                        },
                        {
                            name: 'cronExpression',
                            label: 'Expressão Cron',
                            type: 'text',
                            rules: [
                                'val => !!val || "Expressão cron é obrigatória"',
                                'val => /^[0-9*\/\-, ]+$/.test(val) || "Formato inválido"'
                            ],
                            hint: 'Formato: minuto hora dia mês dia-semana (ex: */2 * * * *)',
                            placeholder: '*/2 * * * *'
                        },
                        {
                            name: 'parameters',
                            label: 'Parâmetros (JSON)',
                            type: 'textarea',
                            rows: 4,
                            hint: 'Parâmetros em formato JSON para passar ao método do controller'
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

        // 2. Create functions for BatchJobs
        await queryInterface.bulkInsert('sys_functions', [
            {
                name: 'batch.visualizar_batch_jobs',
                title: 'Visualizar Batch Jobs',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'batch.manter_batch_jobs',
                title: 'Manter Batch Jobs',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'batch.excluir_batch_jobs',
                title: 'Excluir Batch Jobs',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], { ignoreDuplicates: true });

        // 3. Get function IDs
        const functions = await queryInterface.sequelize.query(
            `SELECT id, name FROM sys_functions WHERE name LIKE 'batch.%'`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const functionMap = {};
        functions.forEach(f => {
            functionMap[f.name] = f.id;
        });

        // 4. Assign functions to ADMIN role (id: 1) for System 1
        if (functionMap['batch.visualizar_batch_jobs'] && functionMap['batch.manter_batch_jobs'] && functionMap['batch.excluir_batch_jobs']) {
            await queryInterface.bulkInsert('sys_roles_functions', [
                {
                    id_role: 1,
                    id_function: functionMap['batch.visualizar_batch_jobs'],
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id_role: 1,
                    id_function: functionMap['batch.manter_batch_jobs'],
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id_role: 1,
                    id_function: functionMap['batch.excluir_batch_jobs'],
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

        // 6. Create menu item for BatchJobs in Administration menu (id: 1)
        await queryInterface.bulkInsert('sys_menu_items', [
            {
                name: 'Batch Jobs',
                icon: 'queue',
                route: '/crud/batch-jobs',
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
        await queryInterface.bulkDelete('sys_menu_items', { route: '/crud/batch-jobs' }, {});

        // Get function IDs before deleting
        const functions = await queryInterface.sequelize.query(
            `SELECT id FROM sys_functions WHERE name LIKE 'batch.%'`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const functionIds = functions.map(f => f.id);

        if (functionIds.length > 0) {
            await queryInterface.bulkDelete('sys_roles_functions', {
                id_function: functionIds
            }, {});
        }

        await queryInterface.bulkDelete('sys_functions', {
            name: { [Sequelize.Op.like]: 'batch.%' }
        }, {});
        await queryInterface.bulkDelete('sys_cruds', { name: 'batch-jobs' }, {});
    }
};

