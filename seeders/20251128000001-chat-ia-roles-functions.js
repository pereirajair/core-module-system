'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const rolesFunctions = [];

    // Role 1 (ADMIN) - Adicionar funções de Chat IA (43, 44)
    [43, 44].forEach(id_function => {
      rolesFunctions.push({
        id_role: 1, // ADMIN
        id_function: id_function,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    // Role 2 (MANAGER) - Adicionar funções de Chat IA (43, 44)
    [43, 44].forEach(id_function => {
      rolesFunctions.push({
        id_role: 2, // MANAGER
        id_function: id_function,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    await queryInterface.bulkInsert('sys_roles_functions', rolesFunctions, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_roles_functions', { 
      id_role: [1, 2],
      id_function: [43, 44]
    }, {});
  }
};

