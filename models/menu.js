'use strict';
// SYSTEM MODEL - Não editar ou excluir manualmente
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Menu extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The Menu `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Verificar se as associações já existem antes de criar
      if (!Menu.associations.Organization) {
        Menu.belongsTo(models.Organization, { foreignKey: 'id_organization' });
      }
      if (!Menu.associations.System) {
        Menu.belongsTo(models.System, { foreignKey: 'id_system' });
      }
      // Verificar se a associação MenuItems já existe antes de criar
      if (!Menu.associations.MenuItems) {
        Menu.hasMany(models.MenuItems, { foreignKey: 'id_menu', as: 'MenuItems' });
      }
    }
  }
  Menu.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    id_organization: {
      type: DataTypes.INTEGER,
      references: {
        model: 'sys_organizations',
        key: 'id'
      }
    },
    id_system: {
      type: DataTypes.INTEGER,
      references: {
        model: 'sys_systems',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Menu',
    tableName: 'sys_menus'
  });
  return Menu;
};
