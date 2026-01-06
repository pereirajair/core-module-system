'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar se as organizações já existem antes de inserir (evitar duplicatas)
    const existingOrgs = await queryInterface.sequelize.query(
      "SELECT name FROM sys_organizations WHERE name IN ('GESTOR', 'CLIENTE 1')",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingNames = new Set((existingOrgs || []).map(org => org.name));
    
    const organizationsToInsert = [];
    if (!existingNames.has('GESTOR')) {
      organizationsToInsert.push({
        name: 'GESTOR',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    if (!existingNames.has('CLIENTE 1')) {
      organizationsToInsert.push({
        name: 'CLIENTE 1',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    if (organizationsToInsert.length > 0) {
      await queryInterface.bulkInsert('sys_organizations', organizationsToInsert, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_organizations', null, {});
  }
};
