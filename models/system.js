'use strict';
// SYSTEM MODEL - Não editar ou excluir manualmente
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class System extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      System.hasMany(models.Role, { foreignKey: 'id_system' });
      // System.belongsToMany(models.Function, { 
      //   through: 'sys_system_functions', 
      //   foreignKey: 'id_system',
      //   otherKey: 'id_function'
      // });
    }
  }
  System.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    sigla: DataTypes.STRING,
    icon: DataTypes.TEXT,
    logo: DataTypes.TEXT,
    description: DataTypes.TEXT,
    primaryColor: DataTypes.STRING,
    secondaryColor: DataTypes.STRING,
    textColor: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'System',
    tableName: 'sys_systems'
  });
  return System;
};

