'use strict';
// SYSTEM MODEL - Não editar ou excluir manualmente
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ModelDefinition extends Model {
    static associate(models) {
      // Associações podem ser adicionadas aqui se necessário
    }
  }
  
  ModelDefinition.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    className: {
      type: DataTypes.STRING,
      allowNull: false
    },
    definition: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const value = this.getDataValue('definition');
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue('definition', JSON.stringify(value));
      }
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    module: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nome do módulo onde a model está localizada'
    }
  }, {
    sequelize,
    modelName: 'ModelDefinition',
    tableName: 'sys_model_definitions'
  });
  
  return ModelDefinition;
};

