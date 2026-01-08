'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Create CRUD for CronJobs
        await queryInterface.bulkInsert('sys_cruds', [
            {
                name: 'cron-jobs',
                title: 'Cron Jobs',
                icon: 'schedule',
                resource: 'CronJob',
                endpoint: '/api/cron-jobs',
                active: true,
                isSystem: true,
                config: JSON.stringify({
                    title: 'Cron Jobs',
                    icon: 'schedule',
                    resource: 'CronJob',
                    endpoint: '/api/cron-jobs',
                    rowKey: 'id',
                    createRoute: '/crud/cron-jobs/new',
                    editRoute: '/crud/cron-jobs/:id',
                    deleteMessage: 'Deseja realmente excluir o cron job "${row.name}"?',
                    deleteSuccessMessage: 'Cron job excluído com sucesso!',
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
                                    tooltip: 'Executar Cron Job',
                                    method: 'post',
                                    endpoint: '${context.endpoint}/${row.id}/execute',
                                    roles: ['cron.manter_cron_jobs'],
                                    onSuccess: {
                                        type: 'message',
                                        message: 'Cron job executado com sucesso!',
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
                                    roles: ['cron.excluir_cron_jobs']
                                }
                            ]
                        }
                    ],
                    layouts: [
                        {
                            title: 'Informações do Cron Job',
                            rows: [
                                {
                                    cols: [
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'name',
                                                    label: 'Nome do Cron Job *',
                                                    type: 'text',
                                                    rules: ['val => !!val || "Nome é obrigatório"'],
                                                    hint: 'Nome único para identificar o cron job'
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
                                                    hint: 'Descrição do que o cron job faz'
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
                                                    hint: 'Caminho do controller (ex: ../controllers/cronController)'
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
                                            width: '100%',
                                            fields: [
                                                {
                                                    name: 'cronExpression',
                                                    label: 'Expressão Cron *',
                                                    type: 'text',
                                                    rules: [
                                                        'val => !!val || "Expressão cron é obrigatória"',
                                                        'val => /^[0-9*\/\-, ]+$/.test(val) || "Formato inválido. Use: minuto hora dia mês dia-semana (ex: 0 0 * * *)"'
                                                    ],
                                                    hint: 'Formato: minuto hora dia mês dia-semana (ex: 0 0 * * * = diariamente à meia-noite)',
                                                    placeholder: '0 0 * * *'
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            title: 'Informações de Execução',
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
                                    ]
                                },
                                {
                                    cols: [
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
                            label: 'Nome do Cron Job',
                            type: 'text',
                            rules: ['val => !!val || "Nome é obrigatório"'],
                            hint: 'Nome único para identificar o cron job'
                        },
                        {
                            name: 'description',
                            label: 'Descrição',
                            type: 'textarea',
                            rows: 2,
                            hint: 'Descrição do que o cron job faz'
                        },
                        {
                            name: 'controller',
                            label: 'Controller',
                            type: 'text',
                            rules: ['val => !!val || "Controller é obrigatório"'],
                            hint: 'Caminho do controller (ex: ../controllers/cronController)'
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
                            hint: 'Formato: minuto hora dia mês dia-semana (ex: 0 0 * * *)',
                            placeholder: '0 0 * * *'
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
        ], {});

        // 2. Create functions for CronJobs
        await queryInterface.bulkInsert('sys_functions', [
            {
                name: 'cron.visualizar_cron_jobs',
                title: 'Visualizar Cron Jobs',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'cron.manter_cron_jobs',
                title: 'Manter Cron Jobs',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'cron.excluir_cron_jobs',
                title: 'Excluir Cron Jobs',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], {});

        // 3. Get function IDs
        const functions = await queryInterface.sequelize.query(
            `SELECT id, name FROM sys_functions WHERE name LIKE 'cron.%'`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const functionMap = {};
        functions.forEach(f => {
            functionMap[f.name] = f.id;
        });

        // 4. Assign functions to ADMIN role (id: 1) for System 1
        const roleFunctionInserts = [
            {
                id_role: 1,
                id_function: functionMap['cron.visualizar_cron_jobs'],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id_role: 1,
                id_function: functionMap['cron.manter_cron_jobs'],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id_role: 1,
                id_function: functionMap['cron.excluir_cron_jobs'],
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        await queryInterface.bulkInsert('sys_roles_functions', roleFunctionInserts, {});

        // 5. Insert default Cron Jobs for system module
        await queryInterface.bulkInsert('sys_cron_jobs', [
            {
                name: 'system-every-minute',
                description: 'Exemplo de cron job do módulo system executado a cada minuto',
                controller: '@gestor/system/controllers/cronController',
                method: 'runEveryMinute',
                cronExpression: '* * * * *',
                active: true,
                lastExecution: null,
                lastExecutionSuccess: null,
                lastExecutionLog: null,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'system-every-5-minutes',
                description: 'Exemplo de cron job do módulo system executado a cada 5 minutos',
                controller: '@gestor/system/controllers/cronController',
                method: 'runEveryFiveMinutes',
                cronExpression: '*/5 * * * *',
                active: true,
                lastExecution: null,
                lastExecutionSuccess: null,
                lastExecutionLog: null,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'system-batch-processing',
                description: 'Cron job que executa todos os batch jobs cadastrados no sistema',
                controller: '@gestor/system/controllers/batchController',
                method: 'executeBatchJobs',
                cronExpression: '* * * * *',
                active: true,
                lastExecution: null,
                lastExecutionSuccess: null,
                lastExecutionLog: null,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'system-queue-processing',
                description: 'Cron job que processa todas as filas ativas do sistema',
                controller: '@gestor/system/controllers/batchController',
                method: 'processQueues',
                cronExpression: '* * * * *',
                active: true,
                lastExecution: null,
                lastExecutionSuccess: null,
                lastExecutionLog: null,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'system-mailer-add-to-queue',
                description: 'Cron job que adiciona 20 emails pendentes à fila a cada 5 minutos',
                controller: '@gestor/system/controllers/mailerController',
                method: 'addEmailsToQueue',
                cronExpression: '*/5 * * * *',
                active: true,
                lastExecution: null,
                lastExecutionSuccess: null,
                lastExecutionLog: null,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], {});

        // 6. Get max order from menu items in Administration menu (id: 1)
        const maxOrderResult = await queryInterface.sequelize.query(
            `SELECT MAX(\`order\`) as maxOrder FROM sys_menu_items WHERE id_menu = 1`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const maxOrder = maxOrderResult[0]?.maxOrder || 0;

        // 7. Create menu item for CronJobs in Administration menu (id: 1)
        await queryInterface.bulkInsert('sys_menu_items', [
            {
                name: 'Cron Jobs',
                icon: 'schedule',
                route: '/crud/cron-jobs',
                target_blank: false,
                id_menu: 1,
                id_system: 1,
                id_organization: null,
                id_role: null,
                order: maxOrder + 1,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], {});
    },

    async down(queryInterface, Sequelize) {
        // Remove in reverse order
        await queryInterface.bulkDelete('sys_menu_items', { route: '/crud/cron-jobs' }, {});

        // Get function IDs before deleting
        const functions = await queryInterface.sequelize.query(
            `SELECT id FROM sys_functions WHERE name LIKE 'cron.%'`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const functionIds = functions.map(f => f.id);

        if (functionIds.length > 0) {
            await queryInterface.bulkDelete('sys_roles_functions', {
                id_function: functionIds
            }, {});
        }

        await queryInterface.bulkDelete('sys_functions', {
            name: { [Sequelize.Op.like]: 'cron.%' }
        }, {});
        await queryInterface.bulkDelete('sys_cruds', { name: 'cron-jobs' }, {});
        await queryInterface.bulkDelete('sys_cron_jobs', {
            name: { [Sequelize.Op.in]: ['system-every-minute', 'system-every-5-minutes'] }
        }, {});
    }
};

