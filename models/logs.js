'use strict';
// SYSTEM MODEL - Não editar ou excluir manualmente
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Logs extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The Logs `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Verificar se as associações já existem antes de criar
      if (models.User && !Logs.associations.User) {
        Logs.belongsTo(models.User, { foreignKey: 'id_user' });
      }
      if (models.Organization && !Logs.associations.Organization) {
        Logs.belongsTo(models.Organization, { foreignKey: 'id_organization' });
      }
      if (models.System && !Logs.associations.System) {
        Logs.belongsTo(models.System, { foreignKey: 'id_system' });
      }
    }
  }
  Logs.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Data e hora do log'
    },
    module: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nome do módulo que gerou o log'
    },
    logMessage: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Mensagem do log'
    },
    logType: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Tipo do log: 1=normal, 2=warning, 3=error'
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sys_users',
        key: 'id'
      },
      comment: 'ID do usuário relacionado'
    },
    id_organization: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sys_organizations',
        key: 'id'
      },
      comment: 'ID da organização relacionada'
    },
    id_system: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sys_systems',
        key: 'id'
      },
      comment: 'ID do sistema relacionado'
    },
    context: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Contexto adicional do log em formato JSON',
      get() {
        const value = this.getDataValue('context');
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue('context', value ? JSON.stringify(value) : null);
      }
    },
    stackTrace: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Stack trace do erro (se for logType=3)'
    }
  }, {
    sequelize,
    modelName: 'Logs',
    tableName: 'sys_logs',
    timestamps: true,
    underscored: false
  });
  return Logs;
};


