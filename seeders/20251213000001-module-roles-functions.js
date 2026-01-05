'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const rolesFunctions = [];

    // Role 1 (ADMIN) - Todas as funções de módulos (45, 46, 47)
    [45, 46, 47].forEach(id_function => {
      rolesFunctions.push({
        id_role: 1, // ADMIN
        id_function: id_function,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    // Role 2 (MANAGER) - Apenas visualizar módulos (46)
    [46].forEach(id_function => {
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
      id_function: [45, 46, 47]
    }, {});
  }
};

