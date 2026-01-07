'use strict';
// SYSTEM MODEL - Não editar ou excluir manualmente
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class QueueItem extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // QueueItem pertence a uma Queue
      if (models.Queue && !QueueItem.associations.Queue) {
        QueueItem.belongsTo(models.Queue, {
          foreignKey: 'id_queue',
          as: 'Queue'
        });
      }
    }
  }
  QueueItem.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_queue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID da fila à qual este item pertence'
    },
    data: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Dados do item em formato JSON',
      get() {
        const value = this.getDataValue('data');
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue('data', value ? JSON.stringify(value) : null);
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'retry'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Status do item'
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Prioridade do item (maior número = maior prioridade)'
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Número de tentativas de processamento'
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mensagem de erro se o processamento falhou'
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data e hora em que o item foi processado'
    }
  }, {
    sequelize,
    modelName: 'QueueItem',
    tableName: 'sys_queue_items',
    timestamps: true,
    underscored: false
  });
  return QueueItem;
};

