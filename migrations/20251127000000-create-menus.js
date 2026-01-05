'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Criar tabela Menus
    await queryInterface.createTable('sys_menus', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      id_organization: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sys_organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      id_system: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sys_systems',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

    // Criar tabela MenuItems
    await queryInterface.createTable('sys_menu_items', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      icon: {
        type: Sequelize.STRING,
        allowNull: true
      },
      route: {
        type: Sequelize.STRING,
        allowNull: false
      },
      target_blank: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      id_organization: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sys_organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      id_system: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sys_systems',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_menu: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sys_menus',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      id_role: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sys_roles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sys_menu_items');
    await queryInterface.dropTable('sys_menus');
  }
};

