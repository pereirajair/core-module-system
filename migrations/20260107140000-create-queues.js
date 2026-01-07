'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Tabela de filas (queues)
        await queryInterface.createTable('sys_queues', {
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
                comment: 'Nome único da fila'
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Descrição da fila'
            },
            controller: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Caminho do controller que processa os itens (ex: @gestor/pessoa/controllers/queueController)'
            },
            method: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Nome do método do controller que processa os itens'
            },
            itemsPerBatch: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 10,
                comment: 'Quantidade de itens processados por vez'
            },
            maxAttempts: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 3,
                comment: 'Número máximo de tentativas para processar um item com erro'
            },
            retryDelay: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 60,
                comment: 'Delay em segundos antes de tentar processar novamente um item com erro'
            },
            active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Status ativo/inativo da fila'
            },
            processing: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Indica se a fila está sendo processada no momento'
            },
            lastProcessed: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Data e hora da última execução de processamento'
            },
            totalItems: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Total de itens já adicionados à fila'
            },
            totalProcessed: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Total de itens processados com sucesso'
            },
            totalFailed: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Total de itens que falharam no processamento'
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

        // Tabela de itens da fila (queue_items)
        await queryInterface.createTable('sys_queue_items', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            id_queue: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'ID da fila à qual este item pertence',
                references: {
                    model: 'sys_queues',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            data: {
                type: Sequelize.TEXT,
                allowNull: false,
                comment: 'Dados do item em formato JSON'
            },
            status: {
                type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'retry'),
                allowNull: false,
                defaultValue: 'pending',
                comment: 'Status do item: pending, processing, completed, failed, retry'
            },
            priority: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Prioridade do item (maior número = maior prioridade)'
            },
            attempts: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Número de tentativas de processamento'
            },
            error: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Mensagem de erro se o processamento falhou'
            },
            processedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Data e hora em que o item foi processado'
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
        await queryInterface.addIndex('sys_queues', ['name'], {
            name: 'idx_queues_name'
        });

        await queryInterface.addIndex('sys_queues', ['active'], {
            name: 'idx_queues_active'
        });

        await queryInterface.addIndex('sys_queue_items', ['id_queue'], {
            name: 'idx_queue_items_queue'
        });

        await queryInterface.addIndex('sys_queue_items', ['status'], {
            name: 'idx_queue_items_status'
        });

        await queryInterface.addIndex('sys_queue_items', ['priority'], {
            name: 'idx_queue_items_priority'
        });

        await queryInterface.addIndex('sys_queue_items', ['id_queue', 'status', 'priority'], {
            name: 'idx_queue_items_composite'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('sys_queue_items');
        await queryInterface.dropTable('sys_queues');
    }
};

