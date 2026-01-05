'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sys_roles_functions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_role: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sys_roles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_function: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sys_functions',
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
    
    // Adicionar índice único para evitar duplicatas
    await queryInterface.addIndex('sys_roles_functions', ['id_role', 'id_function'], {
      unique: true,
      name: 'unique_role_function'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sys_roles_functions');
  }
};

