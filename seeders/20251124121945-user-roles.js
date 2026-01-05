'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('sys_user_roles', [
      { id_user: 1, id_role: 1, createdAt: new Date(), updatedAt: new Date() },
      { id_user: 2, id_role: 2, createdAt: new Date(), updatedAt: new Date() },
      { id_user: 3, id_role: 3, createdAt: new Date(), updatedAt: new Date() },
      { id_user: 1, id_role: 3, createdAt: new Date(), updatedAt: new Date() },
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_user_roles', null, {});
  }
};
