'use strict';
// SYSTEM MODEL - Não editar ou excluir manualmente
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Mailer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Mailer não tem associações diretas com outras models
    }
  }
  Mailer.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    from: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Email do remetente'
    },
    to: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Email do destinatário'
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Assunto do email'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Mensagem/corpo do email'
    },
    status: {
      type: DataTypes.ENUM('pending', 'queued', 'sending', 'sent', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Status do email'
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data e hora em que o email foi enviado'
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mensagem de erro se o envio falhou'
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Número de tentativas de envio'
    }
  }, {
    sequelize,
    modelName: 'Mailer',
    tableName: 'sys_mailers',
    timestamps: true,
    underscored: false
  });
  return Mailer;
};


