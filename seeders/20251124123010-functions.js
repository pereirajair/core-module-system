'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Funções para Systems
    await queryInterface.bulkInsert('sys_functions', [
      { id: 1, name: 'sys.manter_sistemas', title: 'Manter Sistemas', createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: 'sys.visualizar_sistemas', title: 'Visualizar Sistemas', createdAt: new Date(), updatedAt: new Date() },
      { id: 3, name: 'sys.excluir_sistemas', title: 'Excluir Sistemas', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para Functions
      { id: 4, name: 'func.manter_funcoes', title: 'Manter Funções', createdAt: new Date(), updatedAt: new Date() },
      { id: 5, name: 'func.visualizar_funcoes', title: 'Visualizar Funções', createdAt: new Date(), updatedAt: new Date() },
      { id: 6, name: 'func.excluir_funcoes', title: 'Excluir Funções', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para Roles
      { id: 7, name: 'role.manter_roles', title: 'Manter Roles', createdAt: new Date(), updatedAt: new Date() },
      { id: 8, name: 'role.visualizar_roles', title: 'Visualizar Roles', createdAt: new Date(), updatedAt: new Date() },
      { id: 9, name: 'role.excluir_roles', title: 'Excluir Roles', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para Users
      { id: 10, name: 'user.manter_usuarios', title: 'Manter Usuários', createdAt: new Date(), updatedAt: new Date() },
      { id: 11, name: 'user.visualizar_usuarios', title: 'Visualizar Usuários', createdAt: new Date(), updatedAt: new Date() },
      { id: 12, name: 'user.excluir_usuarios', title: 'Excluir Usuários', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para Organizations
      { id: 13, name: 'org.manter_organizacoes', title: 'Manter Organizações', createdAt: new Date(), updatedAt: new Date() },
      { id: 14, name: 'org.visualizar_organizacoes', title: 'Visualizar Organizações', createdAt: new Date(), updatedAt: new Date() },
      { id: 15, name: 'org.excluir_organizacoes', title: 'Excluir Organizações', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para Contacts
      { id: 16, name: 'cont.manter_contatos', title: 'Manter Contatos', createdAt: new Date(), updatedAt: new Date() },
      { id: 17, name: 'cont.visualizar_contatos', title: 'Visualizar Contatos', createdAt: new Date(), updatedAt: new Date() },
      { id: 18, name: 'cont.excluir_contatos', title: 'Excluir Contatos', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para Channel Types
      { id: 19, name: 'cht.manter_tipos_canais', title: 'Manter Tipos de Canais', createdAt: new Date(), updatedAt: new Date() },
      { id: 20, name: 'cht.visualizar_tipos_canais', title: 'Visualizar Tipos de Canais', createdAt: new Date(), updatedAt: new Date() },
      { id: 21, name: 'cht.excluir_tipos_canais', title: 'Excluir Tipos de Canais', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para Channels
      { id: 22, name: 'chan.manter_canais', title: 'Manter Canais', createdAt: new Date(), updatedAt: new Date() },
      { id: 23, name: 'chan.visualizar_canais', title: 'Visualizar Canais', createdAt: new Date(), updatedAt: new Date() },
      { id: 24, name: 'chan.excluir_canais', title: 'Excluir Canais', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para Conversations
      { id: 25, name: 'conv.manter_conversas', title: 'Manter Conversas', createdAt: new Date(), updatedAt: new Date() },
      { id: 26, name: 'conv.visualizar_conversas', title: 'Visualizar Conversas', createdAt: new Date(), updatedAt: new Date() },
      { id: 27, name: 'conv.excluir_conversas', title: 'Excluir Conversas', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para Messages
      { id: 28, name: 'msg.manter_mensagens', title: 'Manter Mensagens', createdAt: new Date(), updatedAt: new Date() },
      { id: 29, name: 'msg.visualizar_mensagens', title: 'Visualizar Mensagens', createdAt: new Date(), updatedAt: new Date() },
      { id: 30, name: 'msg.excluir_mensagens', title: 'Excluir Mensagens', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para Administração
      { id: 31, name: 'adm.impersonate_user', title: 'Impersonar Usuário', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para CRUDs Dinâmicos
      { id: 32, name: 'adm.manter_cruds', title: 'Manter CRUDs', createdAt: new Date(), updatedAt: new Date() },
      { id: 33, name: 'adm.visualizar_cruds', title: 'Visualizar CRUDs', createdAt: new Date(), updatedAt: new Date() },
      { id: 34, name: 'adm.excluir_cruds', title: 'Excluir CRUDs', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para Models
      { id: 35, name: 'adm.manter_models', title: 'Manter Models', createdAt: new Date(), updatedAt: new Date() },
      { id: 36, name: 'adm.visualizar_models', title: 'Visualizar Models', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para Menus
      { id: 37, name: 'menu.manter_menus', title: 'Manter Menus', createdAt: new Date(), updatedAt: new Date() },
      { id: 38, name: 'menu.visualizar_menus', title: 'Visualizar Menus', createdAt: new Date(), updatedAt: new Date() },
      { id: 39, name: 'menu.excluir_menus', title: 'Excluir Menus', createdAt: new Date(), updatedAt: new Date() },
      
      // Funções para MenuItems
      { id: 40, name: 'menu.manter_menu_items', title: 'Manter Itens de Menu', createdAt: new Date(), updatedAt: new Date() },
      { id: 41, name: 'menu.visualizar_menu_items', title: 'Visualizar Itens de Menu', createdAt: new Date(), updatedAt: new Date() },
      { id: 42, name: 'menu.excluir_menu_items', title: 'Excluir Itens de Menu', createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_functions', null, {});
  }
};

