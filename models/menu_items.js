'use strict';
// SYSTEM MODEL - Não editar ou excluir manualmente
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MenuItems extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The MenuItems `models/index` file will call this method automatically.
     */
    static associate(models) {
      MenuItems.belongsTo(models.Organization, { foreignKey: 'id_organization' });
      MenuItems.belongsTo(models.System, { foreignKey: 'id_system' });
      MenuItems.belongsTo(models.Menu, { foreignKey: 'id_menu' });
      MenuItems.belongsTo(models.Role, { foreignKey: 'id_role' });
    }
  }
  MenuItems.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    icon: DataTypes.STRING,
    route: DataTypes.STRING,
    target_blank: DataTypes.BOOLEAN,
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
    },
    id_menu: {
      type: DataTypes.INTEGER,
      references: {
        model: 'sys_menus',
        key: 'id'
      }
    },
    order: DataTypes.INTEGER,
    id_role: {
      type: DataTypes.INTEGER,
      references: {
        model: 'sys_roles',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'MenuItems',
    tableName: 'sys_menu_items'
  });
  return MenuItems;
};
