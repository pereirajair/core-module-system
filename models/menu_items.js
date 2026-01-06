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
      // Verificar se as associações já existem antes de criar
      if (!MenuItems.associations.Organization) {
        MenuItems.belongsTo(models.Organization, { foreignKey: 'id_organization' });
      }
      if (!MenuItems.associations.System) {
        MenuItems.belongsTo(models.System, { foreignKey: 'id_system' });
      }
      // NÃO criar belongsTo(Menu) explicitamente aqui
      // O Menu já cria hasMany com alias 'MenuItems', e o Sequelize criará o belongsTo inverso automaticamente
      // Criar explicitamente causaria conflito porque o Sequelize criaria um hasMany sem alias no Menu
      // O belongsTo será criado automaticamente quando Menu.hasMany for associado
      if (!MenuItems.associations.Role) {
        MenuItems.belongsTo(models.Role, { foreignKey: 'id_role' });
      }
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
