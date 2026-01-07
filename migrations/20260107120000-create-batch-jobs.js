'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('sys_batch_jobs', {
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
                comment: 'Nome único do batch job'
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Descrição do que o batch job faz'
            },
            controller: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Caminho do controller (ex: @gestor/pessoa/controllers/batchController)'
            },
            method: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Nome do método do controller a ser executado'
            },
            parameters: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Parâmetros em formato JSON para passar ao método do controller'
            },
            cronExpression: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: '*/2 * * * *',
                comment: 'Expressão cron no formato ***** (minuto hora dia mês dia-semana). Padrão: a cada 2 minutos'
            },
            active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Status ativo/inativo do batch job'
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
            totalExecutions: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Total de execuções realizadas'
            },
            totalSuccess: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Total de execuções bem-sucedidas'
            },
            totalErrors: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Total de execuções com erro'
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
        await queryInterface.addIndex('sys_batch_jobs', ['name'], {
            name: 'idx_batch_jobs_name'
        });

        await queryInterface.addIndex('sys_batch_jobs', ['active'], {
            name: 'idx_batch_jobs_active'
        });

        await queryInterface.addIndex('sys_batch_jobs', ['cronExpression'], {
            name: 'idx_batch_jobs_cron'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('sys_batch_jobs');
    }
};

