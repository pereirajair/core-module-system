'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Funções para Módulos
    await queryInterface.bulkInsert('sys_functions', [
      { id: 45, name: 'adm.manter_modules', title: 'Manter Módulos', createdAt: new Date(), updatedAt: new Date() },
      { id: 46, name: 'adm.visualizar_modules', title: 'Visualizar Módulos', createdAt: new Date(), updatedAt: new Date() },
      { id: 47, name: 'adm.criar_modules', title: 'Criar Módulos', createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_functions', { id: [45, 46, 47] }, {});
  }
};

