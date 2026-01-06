'use strict';

const jwt = require('jsonwebtoken');

// Lazy load db
function getDb() {
  const modelsLoader = require('./modelsLoader');
  return modelsLoader.loadModels();
}

/**
 * Gera um token de sistema com permissões de ADMIN
 * @param {Object} db - Instância do banco de dados
 * @returns {string} Token JWT
 */
async function generateSystemToken(db) {
  const User = db.User;
  const Role = db.Role;
  
  // Buscar usuário admin (assumindo que existe um usuário admin com id=1)
  const adminUser = await User.findByPk(1, {
    include: [{
      model: Role,
      through: { attributes: [] }
    }]
  });

  if (!adminUser) {
    throw new Error('Usuário admin não encontrado para gerar token de sistema');
  }

  // Buscar todas as funções dos roles do admin através da tabela de relacionamento
  const Function = db.Function;
  const roleIds = adminUser.Roles.map(r => r.id);
  
  // Buscar funções através da tabela sys_roles_functions
  const functions = await db.sequelize.query(
    `SELECT DISTINCT f.id, f.name, f.title 
     FROM sys_functions f
     INNER JOIN sys_roles_functions rf ON f.id = rf.id_function
     WHERE rf.id_role IN (:roleIds)`,
    {
      replacements: { roleIds },
      type: db.sequelize.QueryTypes.SELECT
    }
  );

  const functionNames = functions.map(f => f.name);

  // Criar payload do token
  const payload = {
    id: adminUser.id,
    name: adminUser.name,
    email: adminUser.email,
    roles: adminUser.Roles.map(r => r.name),
    functions: functionNames,
    isSystemToken: true // Flag para identificar token de sistema
  };

  // Gerar token (usar a mesma chave secreta do sistema)
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });

  return token;
}

/**
 * Gera um token para um usuário específico
 * @param {Object} db - Instância do banco de dados
 * @param {number} userId - ID do usuário
 * @returns {string} Token JWT
 */
async function generateUserToken(db, userId) {
  const User = db.User;
  const Role = db.Role;
  
  const user = await User.findByPk(userId, {
    include: [{
      model: Role,
      through: { attributes: [] }
    }]
  });

  if (!user) {
    throw new Error(`Usuário com ID ${userId} não encontrado`);
  }

  // Buscar funções dos roles do usuário através da tabela de relacionamento
  const Function = db.Function;
  const roleIds = user.Roles.map(r => r.id);
  
  // Buscar funções através da tabela sys_roles_functions
  const functions = await db.sequelize.query(
    `SELECT DISTINCT f.id, f.name, f.title 
     FROM sys_functions f
     INNER JOIN sys_roles_functions rf ON f.id = rf.id_function
     WHERE rf.id_role IN (:roleIds)`,
    {
      replacements: { roleIds },
      type: db.sequelize.QueryTypes.SELECT
    }
  );

  const functionNames = functions.map(f => f.name);

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.Roles.map(r => r.name),
    functions: functionNames,
    isSystemToken: false
  };

  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });

  return token;
}

module.exports = {
  generateSystemToken,
  generateUserToken
};

