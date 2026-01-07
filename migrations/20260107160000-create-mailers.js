'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('sys_mailers', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            from: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Email do remetente'
            },
            to: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Email do destinatário'
            },
            subject: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Assunto do email'
            },
            message: {
                type: Sequelize.TEXT,
                allowNull: false,
                comment: 'Mensagem/corpo do email'
            },
            status: {
                type: Sequelize.ENUM('pending', 'queued', 'sending', 'sent', 'failed'),
                allowNull: false,
                defaultValue: 'pending',
                comment: 'Status do email: pending, queued, sending, sent, failed'
            },
            sentAt: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Data e hora em que o email foi enviado'
            },
            error: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Mensagem de erro se o envio falhou'
            },
            attempts: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Número de tentativas de envio'
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
        await queryInterface.addIndex('sys_mailers', ['status'], {
            name: 'idx_mailers_status'
        });

        await queryInterface.addIndex('sys_mailers', ['to'], {
            name: 'idx_mailers_to'
        });

        await queryInterface.addIndex('sys_mailers', ['createdAt'], {
            name: 'idx_mailers_created'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('sys_mailers');
    }
};

