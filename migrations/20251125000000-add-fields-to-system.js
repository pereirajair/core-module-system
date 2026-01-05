'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sys_systems', 'sigla', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });
    await queryInterface.addColumn('sys_systems', 'icon', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('sys_systems', 'logo', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('sys_systems', 'description', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('sys_systems', 'sigla');
    await queryInterface.removeColumn('sys_systems', 'icon');
    await queryInterface.removeColumn('sys_systems', 'logo');
    await queryInterface.removeColumn('sys_systems', 'description');
  }
};

