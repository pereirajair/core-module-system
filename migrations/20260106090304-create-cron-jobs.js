'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('sys_cron_jobs', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
                comment: 'Nome único do cron job'
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Descrição do que o cron job faz'
            },
            controller: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Caminho do controller (ex: ../controllers/cronController)'
            },
            method: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Nome do método do controller a ser executado'
            },
            cronExpression: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: '0 0 * * *',
                comment: 'Expressão cron no formato ***** (minuto hora dia mês dia-semana)'
            },
            active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Status ativo/inativo do cron job'
            },
            lastExecution: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Data e hora da última execução'
            },
            lastExecutionSuccess: {
                type: Sequelize.BOOLEAN,
                allowNull: true,
                comment: 'Indica se a última execução foi bem-sucedida (true) ou teve erro (false)'
            },
            lastExecutionLog: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Último log de execução (sucesso ou erro)'
            },
            nextExecution: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Data e hora da próxima execução calculada'
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

        // Criar índices
        await queryInterface.addIndex('sys_cron_jobs', ['name'], {
            name: 'idx_cron_jobs_name'
        });

        await queryInterface.addIndex('sys_cron_jobs', ['active'], {
            name: 'idx_cron_jobs_active'
        });

        await queryInterface.addIndex('sys_cron_jobs', ['nextExecution'], {
            name: 'idx_cron_jobs_next_execution'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('sys_cron_jobs');
    }
};

