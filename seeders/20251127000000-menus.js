'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Inserir Menus para o sistema Manager (id_system: 1)
    await queryInterface.bulkInsert('sys_menus', [
      {
        id: 1,
        name: 'Administração',
        id_system: 1,
        id_organization: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        name: 'Desenvolvimento',
        id_system: 1,
        id_organization: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Menu para o sistema Atende (id_system: 2)
      {
        id: 3,
        name: 'Atende',
        id_system: 2,
        id_organization: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    // Inserir MenuItems para o sistema Manager
    await queryInterface.bulkInsert('sys_menu_items', [
      // Menu Principal - Manager
      {
        id: 1,
        name: 'Usuários',
        icon: 'people',
        route: '/crud/users',
        target_blank: false,
        id_menu: 1,
        id_system: 1,
        id_organization: null,
        id_role: null, // null = todos os roles podem ver
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        name: 'Permissões',
        icon: 'admin_panel_settings',
        route: '/crud/roles',
        target_blank: false,
        id_menu: 1,
        id_system: 1,
        id_organization: null,
        id_role: null,
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        name: 'Organizações',
        icon: 'business',
        route: '/crud/organizations',
        target_blank: false,
        id_menu: 1,
        id_system: 1,
        id_organization: null,
        id_role: null,
        order: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 4,
        name: 'Sistemas',
        icon: 'computer',
        route: '/crud/systems',
        target_blank: false,
        id_menu: 1,
        id_system: 1,
        id_organization: null,
        id_role: null,
        order: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 5,
        name: 'Funções',
        icon: 'functions',
        route: '/crud/functions',
        target_blank: false,
        id_menu: 1,
        id_system: 1,
        id_organization: null,
        id_role: null,
        order: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Menu Administração - Manager
      {
        id: 6,
        name: 'Interfaces',
        icon: 'view_module',
        route: '/admin/cruds',
        target_blank: false,
        id_menu: 2,
        id_system: 1,
        id_organization: null,
        id_role: null,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 7,
        name: 'Database',
        icon: 'storage',
        route: '/admin/models',
        target_blank: false,
        id_menu: 2,
        id_system: 1,
        id_organization: null,
        id_role: null,
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 9,
        name: 'Menus',
        icon: 'menu',
        route: '/crud/menus',
        target_blank: false,
        id_menu: 2,
        id_system: 1,
        id_organization: null,
        id_role: null,
        order: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // {
      //   id: 10,
      //   name: 'Itens de Menu',
      //   icon: 'list',
      //   route: '/crud/menu-items',
      //   target_blank: false,
      //   id_menu: 2,
      //   id_system: 1,
      //   id_organization: null,
      //   id_role: null,
      //   order: 4,
      //   createdAt: new Date(),
      //   updatedAt: new Date()
      // },
      // Menu Principal - Atende
      {
        id: 8,
        name: 'Home',
        icon: 'home',
        route: '/',
        target_blank: false,
        id_menu: 3,
        id_system: 2,
        id_organization: null,
        id_role: null,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_menu_items', null, {});
    await queryInterface.bulkDelete('sys_menus', null, {});
  }
};

