'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Associar todas as funções ao sistema MyChat (id: 1)
    const functionIds = Array.from({ length: 30 }, (_, i) => i + 1);
    const systemFunctions = functionIds.map(id_function => ({
      id_system: 1,
      id_function: id_function,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    await queryInterface.bulkInsert('sys_system_functions', systemFunctions, {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_system_functions', null, {});
  }
};

