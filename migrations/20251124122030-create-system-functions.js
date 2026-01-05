'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sys_system_functions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
    await queryInterface.addIndex('sys_system_functions', ['id_system', 'id_function'], {
      unique: true,
      name: 'unique_system_function'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sys_system_functions');
  }
};

