'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('sys_settings', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            id_system: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'sys_systems',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            id_user: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'sys_users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            id_organization: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'sys_organizations',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            moduleName: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Nome do módulo (ex: chat, system, locations)'
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'Nome da configuração (ex: smtp_host, xmpp_server)'
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Descrição da configuração'
            },
            configType: {
                type: Sequelize.ENUM('text', 'number', 'boolean', 'password', 'json'),
                allowNull: false,
                defaultValue: 'text',
                comment: 'Tipo da configuração'
            },
            configValue: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Valor da configuração'
            },
            active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
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
        await queryInterface.addIndex('sys_settings', ['moduleName'], {
            name: 'idx_settings_module_name'
        });

        await queryInterface.addIndex('sys_settings', ['name'], {
            name: 'idx_settings_name'
        });

        await queryInterface.addIndex('sys_settings', ['id_system'], {
            name: 'idx_settings_id_system'
        });

        await queryInterface.addIndex('sys_settings', ['id_user'], {
            name: 'idx_settings_id_user'
        });

        await queryInterface.addIndex('sys_settings', ['id_organization'], {
            name: 'idx_settings_id_organization'
        });

        // Criar índice único composto
        await queryInterface.addIndex('sys_settings',
            ['moduleName', 'name', 'id_system', 'id_user', 'id_organization'],
            {
                unique: true,
                name: 'unique_setting_scope'
            }
        );

        // Adicionar constraint para garantir que pelo menos um ID esteja presente
        // await queryInterface.addConstraint('sys_settings', {
        //     type: 'check',
        //     name: 'check_at_least_one_id',
        //     where: {
        //         [Sequelize.Op.or]: [
        //             { id_system: { [Sequelize.Op.ne]: null } },
        //             { id_user: { [Sequelize.Op.ne]: null } },
        //             { id_organization: { [Sequelize.Op.ne]: null } }
        //         ]
        //     }
        // });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('sys_settings');
    }
};
