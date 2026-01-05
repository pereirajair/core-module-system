'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sys_roles', 'id_system', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'sys_systems',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('sys_roles', 'id_system');
  }
};

