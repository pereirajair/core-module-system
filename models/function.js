'use strict';
// SYSTEM MODEL - Não editar ou excluir manualmente
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Function extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Function.belongsToMany(models.System, { 
        through: 'sys_system_functions', 
        foreignKey: 'id_function',
        otherKey: 'id_system'
      });
      Function.belongsToMany(models.Role, { 
        through: 'sys_roles_functions', 
        foreignKey: 'id_function',
        otherKey: 'id_role'
      });
    }
  }
  Function.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    title: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Function',
    tableName: 'sys_functions'
  });
  return Function;
};

