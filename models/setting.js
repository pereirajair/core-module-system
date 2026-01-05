'use strict';
const {
    Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Setting extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // Associações opcionais - pelo menos uma deve estar presente
            if (models.System) {
                Setting.belongsTo(models.System, { foreignKey: 'id_system', as: 'System' });
            }
            if (models.User) {
                Setting.belongsTo(models.User, { foreignKey: 'id_user', as: 'User' });
            }
            if (models.Organization) {
                Setting.belongsTo(models.Organization, { foreignKey: 'id_organization', as: 'Organization' });
            }
        }
    }

    Setting.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_system: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'sys_systems',
                key: 'id'
            }
        },
        id_user: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'sys_users',
                key: 'id'
            }
        },
        id_organization: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'sys_organizations',
                key: 'id'
            }
        },
        moduleName: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Nome do módulo (ex: chat, system, locations)'
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Nome da configuração (ex: smtp_host, xmpp_server)'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Descrição da configuração'
        },
        configType: {
            type: DataTypes.ENUM('text', 'number', 'boolean', 'password', 'json'),
            allowNull: false,
            defaultValue: 'text',
            comment: 'Tipo da configuração'
        },
        configValue: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Valor da configuração'
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'Setting',
        tableName: 'sys_settings',
        validate: {
            atLeastOneId() {
                if (!this.id_system && !this.id_user && !this.id_organization) {
                    throw new Error('Pelo menos um dos campos id_system, id_user ou id_organization deve ser preenchido');
                }
            }
        },
        indexes: [
            {
                unique: true,
                fields: ['moduleName', 'name', 'id_system', 'id_user', 'id_organization'],
                name: 'unique_setting_scope'
            },
            {
                fields: ['moduleName']
            },
            {
                fields: ['name']
            },
            {
                fields: ['id_system']
            },
            {
                fields: ['id_user']
            },
            {
                fields: ['id_organization']
            }
        ]
    });

    return Setting;
};
