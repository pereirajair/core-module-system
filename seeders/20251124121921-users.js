'use strict';

const md5 = require('md5');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('sys_users', [
      { id: 1, name: 'ADMIN', email: 'admin@admin.com', password: md5('test123'), createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: 'MANAGER', email: 'manager@admin.com', password: md5('test123'), createdAt: new Date(), updatedAt: new Date() },
      { id: 3, name: 'USER', email: 'atende@admin.com', password: md5('test123'), createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_users', null, {});
  }
};
