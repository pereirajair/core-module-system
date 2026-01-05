'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sys_systems', 'primaryColor', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: '#1976D2'
    });
    await queryInterface.addColumn('sys_systems', 'secondaryColor', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: '#26A69A'
    });
    await queryInterface.addColumn('sys_systems', 'textColor', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: '#FFFFFF'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('sys_systems', 'primaryColor');
    await queryInterface.removeColumn('sys_systems', 'secondaryColor');
    await queryInterface.removeColumn('sys_systems', 'textColor');
  }
};

