'use strict';
// SYSTEM MODEL - Não editar ou excluir manualmente
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Queue extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Queue tem muitos QueueItems
      if (models.QueueItem && !Queue.associations.QueueItems) {
        Queue.hasMany(models.QueueItem, {
          foreignKey: 'id_queue',
          as: 'QueueItems'
        });
      }
    }
  }
  Queue.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Nome único da fila'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descrição da fila'
    },
    controller: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Caminho do controller que processa os itens'
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nome do método do controller que processa os itens'
    },
    itemsPerBatch: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: 'Quantidade de itens processados por vez'
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      comment: 'Número máximo de tentativas para processar um item com erro'
    },
    retryDelay: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      comment: 'Delay em segundos antes de tentar processar novamente um item com erro'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Status ativo/inativo da fila'
    },
    processing: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica se a fila está sendo processada no momento'
    },
    lastProcessed: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data e hora da última execução de processamento'
    },
    totalItems: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total de itens já adicionados à fila'
    },
    totalProcessed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total de itens processados com sucesso'
    },
    totalFailed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total de itens que falharam no processamento'
    }
  }, {
    sequelize,
    modelName: 'Queue',
    tableName: 'sys_queues',
    timestamps: true,
    underscored: false
  });
  return Queue;
};

