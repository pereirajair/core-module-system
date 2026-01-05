'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('sys_organizations', [{
      name: 'GESTOR',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'CLIENTE 1',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_organizations', null, {});
  }
};
