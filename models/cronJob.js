'use strict';
// SYSTEM MODEL - Não editar ou excluir manualmente
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CronJob extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Adicionar associações se necessário no futuro
    }
  }
  CronJob.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Nome único do cron job'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descrição do que o cron job faz'
    },
    controller: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Caminho do controller (ex: ../controllers/cronController)'
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nome do método do controller a ser executado'
    },
    cronExpression: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0 0 * * *',
      comment: 'Expressão cron no formato ***** (minuto hora dia mês dia-semana)'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Status ativo/inativo do cron job'
    },
    lastExecution: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data e hora da última execução'
    },
    lastExecutionSuccess: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Indica se a última execução foi bem-sucedida (true) ou teve erro (false)'
    },
    lastExecutionLog: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Último log de execução (sucesso ou erro)'
    }
  }, {
    sequelize,
    modelName: 'CronJob',
    tableName: 'sys_cron_jobs',
    timestamps: true,
    underscored: false
  });
  return CronJob;
};

