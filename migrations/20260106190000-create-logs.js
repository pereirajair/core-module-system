'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('sys_logs', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            date: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: queryInterface.sequelize.literal('CURRENT_TIMESTAMP'),
                comment: 'Data e hora do log'
            },
            module: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Nome do módulo que gerou o log (ex: system, pessoa, locations)'
            },
            logMessage: {
                type: Sequelize.TEXT,
                allowNull: false,
                comment: 'Mensagem do log'
            },
            logType: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
                comment: 'Tipo do log: 1=normal, 2=warning, 3=error'
            },
            id_user: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'sys_users',
                    key: 'id'
                },
                comment: 'ID do usuário relacionado (se houver)'
            },
            id_organization: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'sys_organizations',
                    key: 'id'
                },
                comment: 'ID da organização relacionada (se houver)'
            },
            id_system: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'sys_systems',
                    key: 'id'
                },
                comment: 'ID do sistema relacionado (se houver)'
            },
            context: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Contexto adicional do log em formato JSON'
            },
            stackTrace: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Stack trace do erro (se for logType=3)'
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });

        // Criar índices para melhor performance nas consultas
        await queryInterface.addIndex('sys_logs', ['date'], {
            name: 'idx_logs_date'
        });

        await queryInterface.addIndex('sys_logs', ['module'], {
            name: 'idx_logs_module'
        });

        await queryInterface.addIndex('sys_logs', ['logType'], {
            name: 'idx_logs_type'
        });

        await queryInterface.addIndex('sys_logs', ['id_user'], {
            name: 'idx_logs_user'
        });

        await queryInterface.addIndex('sys_logs', ['id_organization'], {
            name: 'idx_logs_organization'
        });

        await queryInterface.addIndex('sys_logs', ['id_system'], {
            name: 'idx_logs_system'
        });

        // Índice composto para consultas comuns
        await queryInterface.addIndex('sys_logs', ['date', 'logType'], {
            name: 'idx_logs_date_type'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('sys_logs');
    }
};

