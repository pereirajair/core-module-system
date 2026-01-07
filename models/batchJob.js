'use strict';
// SYSTEM MODEL - Não editar ou excluir manualmente
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BatchJob extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // BatchJob não tem associações diretas com outras models
    }
  }
  BatchJob.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Nome único do batch job'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descrição do que o batch job faz'
    },
    controller: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Caminho do controller (ex: @gestor/pessoa/controllers/batchController)'
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nome do método do controller a ser executado'
    },
    parameters: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Parâmetros em formato JSON para passar ao método do controller',
      get() {
        const value = this.getDataValue('parameters');
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue('parameters', value ? JSON.stringify(value) : null);
      }
    },
    cronExpression: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '*/2 * * * *',
      comment: 'Expressão cron no formato ***** (minuto hora dia mês dia-semana)'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Status ativo/inativo do batch job'
    },
    lastExecution: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data e hora da última execução'
    },
    lastExecutionSuccess: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Indica se a última execução foi bem-sucedida'
    },
    lastExecutionLog: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Último log de execução'
    },
    totalExecutions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total de execuções realizadas'
    },
    totalSuccess: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total de execuções bem-sucedidas'
    },
    totalErrors: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total de execuções com erro'
    }
  }, {
    sequelize,
    modelName: 'BatchJob',
    tableName: 'sys_batch_jobs',
    timestamps: true,
    underscored: false
  });
  return BatchJob;
};

