'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Create CRUD for Mailers
        await queryInterface.bulkInsert('sys_cruds', [
            {
                name: 'mailers',
                title: 'Emails',
                icon: 'email',
                resource: 'Mailer',
                endpoint: '/api/mailers',
                active: true,
                isSystem: false,
                config: JSON.stringify({
                    title: 'Emails',
                    icon: 'email',
                    resource: 'Mailer',
                    endpoint: '/api/mailers',
                    rowKey: 'id',
                    createRoute: '/crud/mailers/new',
                    editRoute: '/crud/mailers/:id',
                    deleteMessage: 'Deseja realmente excluir o email "${row.id}"?',
                    deleteSuccessMessage: 'Email excluído com sucesso!',
                    columns: [
                        {
                            name: 'from',
                            required: true,
                            label: 'De',
                            align: 'left',
                            field: 'from',
                            sortable: true,
                            style: 'min-width: 200px'
                        },
                        {
                            name: 'to',
                            required: true,
                            label: 'Para',
                            align: 'left',
                            field: 'to',
                            sortable: true,
                            style: 'min-width: 200px'
                        },
                        {
                            name: 'subject',
                            label: 'Assunto',
                            align: 'left',
                            field: 'subject',
                            sortable: true,
                            style: 'min-width: 250px'
                        },
                        {
                            name: 'status',
                            label: 'Status',
                            align: 'center',
                            field: 'status',
                            sortable: true,
                            style: 'min-width: 120px',
                            format: 'badge',
                            badgeMap: {
                                'pending': { label: 'Pendente', color: 'grey' },
                                'queued': { label: 'Na Fila', color: 'blue' },
                                'sending': { label: 'Enviando', color: 'orange' },
                                'sent': { label: 'Enviado', color: 'positive' },
                                'failed': { label: 'Falhou', color: 'negative' }
                            }
                        },
                        {
                            name: 'sentAt',
                            label: 'Enviado Em',
                            align: 'center',
                            field: 'sentAt',
                            sortable: true,
                            style: 'min-width: 180px',
                            format: 'datetime'
                        },
                        {
                            name: 'actions',
                            label: 'Ações',
                            align: 'right',
                            field: 'actions',
                            sortable: false,
                            items: [
                                {
                                    type: 'delete',
                                    icon: 'delete',
                                    color: 'negative',
                                    tooltip: 'Excluir',
                                    roles: ['mailer.excluir_mailers']
                                }
                            ]
                        }
                    ],
                    layouts: [
                        {
                            title: 'Informações do Email',
                            rows: [
                                {
                                    cols: [
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'from',
                                                    label: 'De (Remetente) *',
                                                    type: 'email',
                                                    rules: ['val => !!val || "Email do remetente é obrigatório"', 'val => /.+@.+\..+/.test(val) || "Email inválido"'],
                                                    hint: 'Email do remetente'
                                                }
                                            ]
                                        },
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'to',
                                                    label: 'Para (Destinatário) *',
                                                    type: 'email',
                                                    rules: ['val => !!val || "Email do destinatário é obrigatório"', 'val => /.+@.+\..+/.test(val) || "Email inválido"'],
                                                    hint: 'Email do destinatário'
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
                                                    name: 'subject',
                                                    label: 'Assunto',
                                                    type: 'text',
                                                    hint: 'Assunto do email'
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
                                                    name: 'message',
                                                    label: 'Mensagem *',
                                                    type: 'textarea',
                                                    rows: 8,
                                                    rules: ['val => !!val || "Mensagem é obrigatória"'],
                                                    hint: 'Corpo do email'
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            title: 'Status e Informações',
                            rows: [
                                {
                                    cols: [
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'status',
                                                    label: 'Status',
                                                    type: 'select',
                                                    options: [
                                                        { value: 'pending', label: 'Pendente' },
                                                        { value: 'queued', label: 'Na Fila' },
                                                        { value: 'sending', label: 'Enviando' },
                                                        { value: 'sent', label: 'Enviado' },
                                                        { value: 'failed', label: 'Falhou' }
                                                    ],
                                                    readonly: true
                                                }
                                            ]
                                        },
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'sentAt',
                                                    label: 'Enviado Em',
                                                    type: 'datetime',
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
                                                    name: 'attempts',
                                                    label: 'Tentativas',
                                                    type: 'number',
                                                    readonly: true
                                                }
                                            ]
                                        },
                                        {
                                            width: '50%',
                                            fields: [
                                                {
                                                    name: 'error',
                                                    label: 'Erro',
                                                    type: 'textarea',
                                                    rows: 2,
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
                            name: 'from',
                            label: 'De (Remetente)',
                            type: 'email',
                            rules: ['val => !!val || "Email do remetente é obrigatório"', 'val => /.+@.+\..+/.test(val) || "Email inválido"']
                        },
                        {
                            name: 'to',
                            label: 'Para (Destinatário)',
                            type: 'email',
                            rules: ['val => !!val || "Email do destinatário é obrigatório"', 'val => /.+@.+\..+/.test(val) || "Email inválido"']
                        },
                        {
                            name: 'subject',
                            label: 'Assunto',
                            type: 'text'
                        },
                        {
                            name: 'message',
                            label: 'Mensagem',
                            type: 'textarea',
                            rows: 8,
                            rules: ['val => !!val || "Mensagem é obrigatória"']
                        },
                        {
                            name: 'status',
                            label: 'Status',
                            type: 'select',
                            options: [
                                { value: 'pending', label: 'Pendente' },
                                { value: 'queued', label: 'Na Fila' },
                                { value: 'sending', label: 'Enviando' },
                                { value: 'sent', label: 'Enviado' },
                                { value: 'failed', label: 'Falhou' }
                            ]
                        }
                    ]
                }),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], { ignoreDuplicates: true });

        // 2. Create functions for Mailers
        await queryInterface.bulkInsert('sys_functions', [
            {
                name: 'mailer.visualizar_mailers',
                title: 'Visualizar Emails',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'mailer.manter_mailers',
                title: 'Manter Emails',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'mailer.excluir_mailers',
                title: 'Excluir Emails',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], { ignoreDuplicates: true });

        // 3. Get function IDs
        const functions = await queryInterface.sequelize.query(
            `SELECT id, name FROM sys_functions WHERE name LIKE 'mailer.%'`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const functionMap = {};
        functions.forEach(f => {
            functionMap[f.name] = f.id;
        });

        // 4. Assign functions to ADMIN role (id: 1) for System 1
        if (functionMap['mailer.visualizar_mailers'] && functionMap['mailer.manter_mailers'] && functionMap['mailer.excluir_mailers']) {
            await queryInterface.bulkInsert('sys_roles_functions', [
                {
                    id_role: 1,
                    id_function: functionMap['mailer.visualizar_mailers'],
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id_role: 1,
                    id_function: functionMap['mailer.manter_mailers'],
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id_role: 1,
                    id_function: functionMap['mailer.excluir_mailers'],
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

        // 6. Create menu item for Mailers in Administration menu (id: 1)
        await queryInterface.bulkInsert('sys_menu_items', [
            {
                name: 'Emails',
                icon: 'email',
                route: '/crud/mailers',
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
        await queryInterface.bulkDelete('sys_menu_items', { route: '/crud/mailers' }, {});

        // Get function IDs before deleting
        const functions = await queryInterface.sequelize.query(
            `SELECT id FROM sys_functions WHERE name LIKE 'mailer.%'`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const functionIds = functions.map(f => f.id);

        if (functionIds.length > 0) {
            await queryInterface.bulkDelete('sys_roles_functions', {
                id_function: functionIds
            }, {});
        }

        await queryInterface.bulkDelete('sys_functions', {
            name: { [Sequelize.Op.like]: 'mailer.%' }
        }, {});
        await queryInterface.bulkDelete('sys_cruds', { name: 'mailers' }, {});
    }
};

