'use strict';
// SYSTEM MODEL - Não editar ou excluir manualmente
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
  static associate(models) {
    Role.belongsToMany(models.User, { through: 'sys_user_roles', foreignKey: 'id_role' });
    Role.belongsTo(models.System, { foreignKey: 'id_system' });
    Role.belongsToMany(models.Function, { 
      through: 'sys_roles_functions', 
      foreignKey: 'id_role',
      otherKey: 'id_function'
    });
  }
  }
  Role.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    id_system: {
      type: DataTypes.INTEGER,
      references: {
        model: 'sys_systems',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Role',
    tableName: 'sys_roles'
  });
  return Role;
};