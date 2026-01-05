'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sys_cruds', 'isSystem', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
    
    // Marcar interfaces de sistema existentes
    await queryInterface.sequelize.query(`
      UPDATE sys_cruds 
      SET isSystem = true 
      WHERE name IN ('users', 'functions', 'menus', 'menu-items', 'organizations', 'roles', 'systems')
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('sys_cruds', 'isSystem');
  }
};

