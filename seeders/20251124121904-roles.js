'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('sys_roles', [
      { id: 1, name: 'ADMIN', id_system: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: 'MANAGER', id_system: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: 3, name: 'ATENDENTE', id_system: 2, createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_roles', null, {});
  }
};
