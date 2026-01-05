const db = require('../../../models');
const Setting = db.Setting;
const System = db.System;
const User = db.User;
const Organization = db.Organization;

/**
 * Get all settings with optional filtering
 */
exports.getAllSettings = async (req, res) => {
    try {
        const { moduleName, id_system, id_user, id_organization, active } = req.query;

        const where = {};
        if (moduleName) where.moduleName = moduleName;
        if (id_system) where.id_system = id_system;
        if (id_user) where.id_user = id_user;
        if (id_organization) where.id_organization = id_organization;
        if (active !== undefined) where.active = active === 'true';

        const settings = await Setting.findAll({
            where,
            include: [
                { model: System, as: 'System', attributes: ['id', 'name'] },
                { model: User, as: 'User', attributes: ['id', 'name'] },
                { model: Organization, as: 'Organization', attributes: ['id', 'name'] }
            ],
            order: [['moduleName', 'ASC'], ['name', 'ASC']]
        });

        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get setting by ID
 */
exports.getSettingById = async (req, res) => {
    try {
        const setting = await Setting.findByPk(req.params.id, {
            include: [
                { model: System, as: 'System', attributes: ['id', 'name'] },
                { model: User, as: 'User', attributes: ['id', 'name'] },
                { model: Organization, as: 'Organization', attributes: ['id', 'name'] }
            ]
        });

        if (!setting) {
            return res.status(404).json({ message: 'Setting not found' });
        }

        res.json(setting);
    } catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get setting value by module and name with scope resolution
 * Priority: User > Organization > System
 */
exports.getSettingValue = async (req, res) => {
    try {
        const { moduleName, name } = req.params;
        const { id_system, id_user, id_organization } = req.query;

        // Build query with priority order
        const where = {
            moduleName,
            name,
            active: true
        };

        // Try to find setting with most specific scope first
        let setting = null;

        // 1. Try user-specific setting
        if (id_user) {
            setting = await Setting.findOne({
                where: { ...where, id_user, id_system: null, id_organization: null }
            });
        }

        // 2. Try organization-specific setting
        if (!setting && id_organization) {
            setting = await Setting.findOne({
                where: { ...where, id_organization, id_user: null, id_system: null }
            });
        }

        // 3. Try system-specific setting
        if (!setting && id_system) {
            setting = await Setting.findOne({
                where: { ...where, id_system, id_user: null, id_organization: null }
            });
        }

        if (!setting) {
            return res.status(404).json({ message: 'Setting not found' });
        }

        // Return parsed value based on type
        let value = setting.configValue;
        switch (setting.configType) {
            case 'number':
                value = parseFloat(value);
                break;
            case 'boolean':
                value = value === 'true' || value === '1';
                break;
            case 'json':
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    console.error('Error parsing JSON setting:', e);
                }
                break;
            case 'password':
                // Don't return password values in plain text
                value = '***';
                break;
        }

        res.json({
            name: setting.name,
            value,
            type: setting.configType,
            description: setting.description
        });
    } catch (error) {
        console.error('Error fetching setting value:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Create new setting
 */
exports.createSetting = async (req, res) => {
    try {
        const { id_system, id_user, id_organization, moduleName, name, description, configType, configValue, active } = req.body;

        // Validate that at least one ID is provided
        if (!id_system && !id_user && !id_organization) {
            return res.status(400).json({
                message: 'Pelo menos um dos campos id_system, id_user ou id_organization deve ser preenchido'
            });
        }

        const setting = await Setting.create({
            id_system,
            id_user,
            id_organization,
            moduleName,
            name,
            description,
            configType,
            configValue,
            active
        });

        const settingWithAssociations = await Setting.findByPk(setting.id, {
            include: [
                { model: System, as: 'System', attributes: ['id', 'name'] },
                { model: User, as: 'User', attributes: ['id', 'name'] },
                { model: Organization, as: 'Organization', attributes: ['id', 'name'] }
            ]
        });

        res.status(201).json(settingWithAssociations);
    } catch (error) {
        console.error('Error creating setting:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Update setting
 */
exports.updateSetting = async (req, res) => {
    try {
        const setting = await Setting.findByPk(req.params.id);

        if (!setting) {
            return res.status(404).json({ message: 'Setting not found' });
        }

        const { id_system, id_user, id_organization, moduleName, name, description, configType, configValue, active } = req.body;

        // Validate that at least one ID is provided
        if (id_system === null && id_user === null && id_organization === null) {
            return res.status(400).json({
                message: 'Pelo menos um dos campos id_system, id_user ou id_organization deve ser preenchido'
            });
        }

        await setting.update({
            id_system,
            id_user,
            id_organization,
            moduleName,
            name,
            description,
            configType,
            configValue,
            active
        });

        const settingWithAssociations = await Setting.findByPk(setting.id, {
            include: [
                { model: System, as: 'System', attributes: ['id', 'name'] },
                { model: User, as: 'User', attributes: ['id', 'name'] },
                { model: Organization, as: 'Organization', attributes: ['id', 'name'] }
            ]
        });

        res.json(settingWithAssociations);
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Delete setting
 */
exports.deleteSetting = async (req, res) => {
    try {
        const setting = await Setting.findByPk(req.params.id);

        if (!setting) {
            return res.status(404).json({ message: 'Setting not found' });
        }

        await setting.destroy();
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting setting:', error);
        res.status(500).json({ message: error.message });
    }
};
