'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  async up(queryInterface, Sequelize) {
    const modelsPath = path.join(__dirname, '../../../models');
    const modelController = require('../controllers/modelController');
    
    // Lista de models de sistema
    const systemModels = ['user', 'permission', 'organization', 'role', 'system', 'crud', 'function', 'menu', 'menu_items'];
    
    // Obter todos os arquivos de model
    const files = fs.readdirSync(modelsPath)
      .filter(file => file !== 'index.js' && file.endsWith('.js') && file !== 'model_definition.js');
    
    const modelDefinitions = [];
    
    for (const file of files) {
      const modelName = file.replace('.js', '');
      const filePath = path.join(modelsPath, file);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const modelInfo = modelController.parseModelFile(content);
        
        const isSystem = systemModels.includes(modelName.toLowerCase()) || 
                         content.includes('// SYSTEM MODEL') || 
                         content.includes('/* SYSTEM MODEL */');
        
        modelDefinitions.push({
          name: modelName,
          className: modelInfo.className || modelName.charAt(0).toUpperCase() + modelName.slice(1),
          definition: JSON.stringify({
            fields: modelInfo.fields || [],
            associations: modelInfo.associations || [],
            options: modelInfo.options || {}
          }),
          isSystem: isSystem,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch (error) {
        console.error(`Erro ao processar model ${modelName}:`, error.message);
      }
    }
    
    if (modelDefinitions.length > 0) {
      // Fazer upsert individual para evitar duplicatas
      for (const modelDef of modelDefinitions) {
        const [existing] = await queryInterface.sequelize.query(
          `SELECT id FROM sys_model_definitions WHERE name = :name LIMIT 1`,
          {
            replacements: { name: modelDef.name },
            type: queryInterface.sequelize.QueryTypes.SELECT
          }
        );
        
        if (existing) {
          // Atualizar existente
          await queryInterface.bulkUpdate('sys_model_definitions', {
            className: modelDef.className,
            definition: modelDef.definition,
            isSystem: modelDef.isSystem,
            updatedAt: modelDef.updatedAt
          }, {
            name: modelDef.name
          });
        } else {
          // Inserir novo
          await queryInterface.bulkInsert('sys_model_definitions', [modelDef]);
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_model_definitions', null, {});
  }
};

