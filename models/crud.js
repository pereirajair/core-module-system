'use strict';
// SYSTEM MODEL - Não editar ou excluir manualmente
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Crud extends Model {
    static associate(models) {
      // Associações podem ser adicionadas aqui se necessário
    }
  }
  
  Crud.init({
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
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    icon: {
      type: DataTypes.STRING,
      defaultValue: 'settings'
    },
    resource: {
      type: DataTypes.STRING,
      allowNull: false
    },
    endpoint: {
      type: DataTypes.STRING,
      allowNull: false
    },
    config: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const value = this.getDataValue('config');
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue('config', JSON.stringify(value));
      }
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Crud',
    tableName: 'sys_cruds'
  });
  
  return Crud;
};

