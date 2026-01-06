'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Remover índice relacionado
        try {
            await queryInterface.removeIndex('sys_cron_jobs', 'idx_cron_jobs_next_execution');
        } catch (error) {
            // Índice pode não existir, ignorar
            console.log('⚠️  Índice idx_cron_jobs_next_execution não encontrado ou já removido');
        }

        // Remover coluna nextExecution
        try {
            await queryInterface.removeColumn('sys_cron_jobs', 'nextExecution');
        } catch (error) {
            // Coluna pode não existir, ignorar
            console.log('⚠️  Coluna nextExecution não encontrada ou já removida');
        }
    },

    async down(queryInterface, Sequelize) {
        // Adicionar coluna de volta
        await queryInterface.addColumn('sys_cron_jobs', 'nextExecution', {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Data e hora da próxima execução calculada'
        });

        // Adicionar índice de volta
        await queryInterface.addIndex('sys_cron_jobs', ['nextExecution'], {
            name: 'idx_cron_jobs_next_execution'
        });
    }
};

