// Lazy load db
function getDb() {
  const modelsLoader = require('./modelsLoader');
  return modelsLoader.loadModels();
}

const db = getDb();
const Setting = db.Setting;

/**
 * Get setting value with scope resolution
 * Priority: User > Organization > System
 * 
 * @param {string} moduleName - Module name (e.g., 'system', 'chat')
 * @param {string} name - Setting name (e.g., 'smtp_host')
 * @param {object} scope - Scope object { id_system, id_user, id_organization }
 * @param {*} defaultValue - Default value if setting not found
 * @returns {Promise<*>} Setting value parsed according to its type
 */
async function getSetting(moduleName, name, scope = {}, defaultValue = null) {
    try {
        const { id_system, id_user, id_organization } = scope;

        const where = {
            moduleName,
            name,
            active: true
        };

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
            return defaultValue;
        }

        // Parse value based on type
        return parseSettingValue(setting.configValue, setting.configType);
    } catch (error) {
        console.error('Error getting setting:', error);
        return defaultValue;
    }
}

/**
 * Get multiple settings for a module
 * 
 * @param {string} moduleName - Module name
 * @param {object} scope - Scope object { id_system, id_user, id_organization }
 * @returns {Promise<object>} Object with setting names as keys and parsed values
 */
async function getModuleSettings(moduleName, scope = {}) {
    try {
        const { id_system, id_user, id_organization } = scope;

        const where = {
            moduleName,
            active: true
        };

        // Build OR conditions for scope
        const scopeConditions = [];
        if (id_user) {
            scopeConditions.push({ id_user, id_system: null, id_organization: null });
        }
        if (id_organization) {
            scopeConditions.push({ id_organization, id_user: null, id_system: null });
        }
        if (id_system) {
            scopeConditions.push({ id_system, id_user: null, id_organization: null });
        }

        if (scopeConditions.length === 0) {
            return {};
        }

        const settings = await Setting.findAll({
            where: {
                ...where,
                [db.Sequelize.Op.or]: scopeConditions
            },
            order: [
                // Order by specificity: user > organization > system
                [db.Sequelize.literal('CASE WHEN id_user IS NOT NULL THEN 1 WHEN id_organization IS NOT NULL THEN 2 ELSE 3 END'), 'ASC']
            ]
        });

        // Build result object, keeping only the most specific value for each setting name
        const result = {};
        const processedNames = new Set();

        for (const setting of settings) {
            if (!processedNames.has(setting.name)) {
                result[setting.name] = parseSettingValue(setting.configValue, setting.configType);
                processedNames.add(setting.name);
            }
        }

        return result;
    } catch (error) {
        console.error('Error getting module settings:', error);
        return {};
    }
}

/**
 * Parse setting value based on its type
 * 
 * @param {string} value - Raw value from database
 * @param {string} type - Setting type (text, number, boolean, password, json)
 * @returns {*} Parsed value
 */
function parseSettingValue(value, type) {
    if (value === null || value === undefined) {
        return null;
    }

    switch (type) {
        case 'number':
            return parseFloat(value);
        case 'boolean':
            return value === 'true' || value === '1' || value === true;
        case 'json':
            try {
                return JSON.parse(value);
            } catch (e) {
                console.error('Error parsing JSON setting:', e);
                return value;
            }
        case 'password':
        case 'text':
        default:
            return value;
    }
}

/**
 * Set or update a setting value
 * 
 * @param {string} moduleName - Module name
 * @param {string} name - Setting name
 * @param {*} value - Setting value
 * @param {object} scope - Scope object { id_system, id_user, id_organization }
 * @param {object} options - Additional options { configType, description }
 * @returns {Promise<object>} Created or updated setting
 */
async function setSetting(moduleName, name, value, scope = {}, options = {}) {
    try {
        const { id_system, id_user, id_organization } = scope;
        const { configType = 'text', description = '' } = options;

        // Validate that at least one ID is provided
        if (!id_system && !id_user && !id_organization) {
            throw new Error('Pelo menos um dos campos id_system, id_user ou id_organization deve ser preenchido');
        }

        // Convert value to string based on type
        let configValue = value;
        if (configType === 'json') {
            configValue = JSON.stringify(value);
        } else if (configType === 'boolean') {
            configValue = value ? 'true' : 'false';
        } else {
            configValue = String(value);
        }

        // Try to find existing setting
        const where = {
            moduleName,
            name,
            id_system: id_system || null,
            id_user: id_user || null,
            id_organization: id_organization || null
        };

        let setting = await Setting.findOne({ where });

        if (setting) {
            // Update existing
            await setting.update({ configValue, configType, description });
        } else {
            // Create new
            setting = await Setting.create({
                moduleName,
                name,
                description,
                configType,
                configValue,
                id_system: id_system || null,
                id_user: id_user || null,
                id_organization: id_organization || null,
                active: true
            });
        }

        return setting;
    } catch (error) {
        console.error('Error setting value:', error);
        throw error;
    }
}

module.exports = {
    getSetting,
    getModuleSettings,
    setSetting,
    parseSettingValue
};
