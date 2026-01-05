'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sys_cruds', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      icon: {
        type: Sequelize.STRING,
        defaultValue: 'settings'
      },
      resource: {
        type: Sequelize.STRING,
        allowNull: false
      },
      endpoint: {
        type: Sequelize.STRING,
        allowNull: false
      },
      config: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'JSON configuration for CRUD'
      },
      active: {
        type: Sequelize.BOOLEAN,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sys_cruds');
  }
};

