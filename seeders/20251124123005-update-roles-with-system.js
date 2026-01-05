'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Atualizar roles existentes para incluir id_system
    // await queryInterface.bulkUpdate('sys_roles',
    //   { id_system: 1 },
    //   { id_system: null }
    // );
  },

  async down(queryInterface, Sequelize) {
    // Reverter: remover id_system dos roles
    // await queryInterface.bulkUpdate('sys_roles',
    //   { id_system: null },
    //   { id_system: 1 }
    // );
  }
};

