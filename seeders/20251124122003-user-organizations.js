'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('sys_user_organizations', [
      { id_user: 1, id_organization: 1, createdAt: new Date(), updatedAt: new Date() },
      { id_user: 2, id_organization: 1, createdAt: new Date(), updatedAt: new Date() },
      { id_user: 3, id_organization: 1, createdAt: new Date(), updatedAt: new Date() },
      { id_user: 1, id_organization: 2, createdAt: new Date(), updatedAt: new Date() },
      { id_user: 3, id_organization: 2, createdAt: new Date(), updatedAt: new Date() },
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_user_organizations', null, {});
  }
};
