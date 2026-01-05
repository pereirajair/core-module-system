'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Funções para Chat IA
    await queryInterface.bulkInsert('sys_functions', [
      { id: 43, name: 'chatia.usar_chat', title: 'Usar Chat IA', createdAt: new Date(), updatedAt: new Date() },
      { id: 44, name: 'chatia.executar_comandos', title: 'Executar Comandos no Chat IA', createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_functions', { id: [43, 44] }, {});
  }
};

