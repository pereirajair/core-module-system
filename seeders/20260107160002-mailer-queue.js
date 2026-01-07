'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Inserir fila de envio de emails
        await queryInterface.bulkInsert('sys_queues', [
            {
                name: 'mailer-send',
                description: 'Fila para envio de emails do sistema',
                controller: '@gestor/system/controllers/mailerQueueController',
                method: 'processMailerItem',
                itemsPerBatch: 10,
                maxAttempts: 3,
                retryDelay: 60,
                active: true,
                processing: false,
                lastProcessed: null,
                totalItems: 0,
                totalProcessed: 0,
                totalFailed: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], { ignoreDuplicates: true });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('sys_queues', {
            name: 'mailer-send'
        }, {});
    }
};

