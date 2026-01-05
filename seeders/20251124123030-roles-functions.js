'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const rolesFunctions = [];

    // Role 1 (ADMIN) - Todas as funções (1-42)
    // Nota: Funções 43-44 (Chat IA) serão adicionadas em seeder separado
    const adminFunctionIds = Array.from({ length: 42 }, (_, i) => i + 1);
    adminFunctionIds.forEach(id_function => {
      rolesFunctions.push({
      id_role: 1, // ADMIN
      id_function: id_function,
      createdAt: new Date(),
      updatedAt: new Date()
      });
    });

    // Role 2 (MANAGER) - Todas as funções de manter_ e visualizar_, mas não excluir_
    // Sistemas: 1, 2
    // Functions: 4, 5
    // Roles: 7, 8
    // Users: 10, 11
    // Organizations: 13, 14
    // Contacts: 16, 17
    // Channel Types: 19, 20
    // Channels: 22, 23
    // Conversations: 25, 26
    // Messages: 28, 29
    // Menus: 37, 38
    // MenuItems: 40, 41
    // Nota: Chat IA (43, 44) será adicionado em seeder separado
    const managerFunctionIds = [1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28, 29, 37, 38, 40, 41];
    managerFunctionIds.forEach(id_function => {
      rolesFunctions.push({
        id_role: 2, // MANAGER
        id_function: id_function,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    // Role 3 (USER) - Apenas:
    // Channels: 22, 23, 24 (todas as funções)
    // Contacts: 16, 17, 18 (todas as funções)
    // visualizar_organizacoes: 14
    // visualizar_usuarios: 11
    // visualizar_sistemas: 2
    // ChannelTypes: 19, 20, 21 (todas as funções)
    // Conversations: 25, 26, 27 (todas as funções)
    // Messages: 28, 29, 30 (todas as funções)
    const userFunctionIds = [2, 11, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 33]; // Adicionar visualizar_cruds
    userFunctionIds.forEach(id_function => {
      rolesFunctions.push({
        id_role: 3, // USER
        id_function: id_function,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    await queryInterface.bulkInsert('sys_roles_functions', rolesFunctions, {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_roles_functions', null, {});
  }
};

