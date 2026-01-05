'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sys_model_definitions', 'module', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Nome do módulo onde a model está localizada'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('sys_model_definitions', 'module');
  }
};

