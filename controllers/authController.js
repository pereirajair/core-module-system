const bcrypt = require('bcryptjs');
const pathResolver = require('../utils/pathResolver');
const jwt = require('jsonwebtoken');
const db = require(pathResolver.resolveModelsPath());
const User = db.User;
const md5 = require('md5');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email not informed' });
  }
  if (!password) {
    return res.status(400).json({ message: 'Password not informed' });
  }

  try {
    const user = await User.scope('withPassword').findOne({
      where: { email },
      include: [
        {
          model: db.Role,
          as: 'Roles',
          attributes: ['name', 'id_system'],
          through: { attributes: [] },
          include: [
            {
              model: db.Function,
              through: { attributes: [] },
              attributes: ['name']
            },
            {
              model: db.System,
              attributes: ['id', 'name', 'sigla', 'logo', 'primaryColor', 'secondaryColor', 'textColor']
            }
          ]
        }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // TODO: Compare hashed password with plain password
    // const isMatch = await bcrypt.compare(password, user.password);
    // For now, directly compare since structure.json uses md5 which is not bcrypt
    const isMatch = (md5(password) === user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const roles = user.Roles.map(role => role.name);
    
    // Coletar todas as funções do usuário através de suas roles
    const userFunctions = new Set();
    user.Roles.forEach(role => {
      role.Functions.forEach(func => {
        userFunctions.add(func.name);
      });
    });

    // Buscar o sistema através da primeira role do usuário
    let systemInfo = null;
    if (user.Roles && user.Roles.length > 0) {
      const firstRole = user.Roles[0];
      if (firstRole.System) {
        systemInfo = {
          id: firstRole.System.id,
          name: firstRole.System.name,
          sigla: firstRole.System.sigla,
          logo: firstRole.System.logo,
          primaryColor: firstRole.System.primaryColor,
          secondaryColor: firstRole.System.secondaryColor,
          textColor: firstRole.System.textColor
        };
      }
    }

    const token = jwt.sign({ 
      id: user.id, 
      name: user.name,
      email: user.email, 
      roles: roles,
      functions: Array.from(userFunctions)
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, system: systemInfo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.logout = (req, res) => {
  // In a token-based authentication system, logout is typically handled client-side
  // by discarding the token. However, you might want to blacklist tokens on the server
  // for security reasons (e.g., if a token is compromised).
  // For this basic implementation, we'll just send a success message.
  res.json({ message: 'Logged out successfully' });
};

exports.impersonate = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Buscar o usuário atual com suas roles e funções para verificar se tem permissão
    const currentUser = await User.findByPk(currentUserId, {
      include: [
        {
          model: db.Role,
          as: 'Roles',
          attributes: ['name'],
          through: { attributes: [] },
          include: [
            {
              model: db.Function,
              through: { attributes: [] },
              attributes: ['name']
            }
          ]
        }
      ]
    });

    if (!currentUser) {
      return res.status(401).json({ message: 'Current user not found' });
    }

    // Verificar se o usuário atual tem a função adm.impersonate_user
    const userFunctions = new Set();
    currentUser.Roles.forEach(role => {
      role.Functions.forEach(func => {
        userFunctions.add(func.name);
      });
    });

    if (!userFunctions.has('adm.impersonate_user')) {
      return res.status(403).json({ message: 'You do not have permission to impersonate users' });
    }

    // Buscar o usuário a ser impersonado
    const targetUser = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: db.Role,
          as: 'Roles',
          attributes: ['name', 'id_system'],
          through: { attributes: [] },
          include: [
            {
              model: db.Function,
              through: { attributes: [] },
              attributes: ['name']
            },
            {
              model: db.System,
              attributes: ['id', 'name', 'sigla', 'logo', 'primaryColor', 'secondaryColor', 'textColor']
            }
          ]
        }
      ]
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const roles = targetUser.Roles.map(role => role.name);
    
    // Coletar todas as funções do usuário alvo através de suas roles
    const targetUserFunctions = new Set();
    targetUser.Roles.forEach(role => {
      role.Functions.forEach(func => {
        targetUserFunctions.add(func.name);
      });
    });

    // Criar token para o usuário alvo, mas incluir informação de quem está impersonando
    const token = jwt.sign({ 
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email, 
      roles: roles,
      functions: Array.from(targetUserFunctions),
      impersonatedBy: currentUserId,
      originalUserId: currentUserId
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Buscar o sistema através da primeira role do usuário alvo
    let systemInfo = null;
    if (targetUser.Roles && targetUser.Roles.length > 0) {
      const firstRole = targetUser.Roles[0];
      if (firstRole.System) {
        systemInfo = {
          id: firstRole.System.id,
          name: firstRole.System.name,
          sigla: firstRole.System.sigla,
          logo: firstRole.System.logo,
          primaryColor: firstRole.System.primaryColor,
          secondaryColor: firstRole.System.secondaryColor,
          textColor: firstRole.System.textColor
        };
      }
    }

    res.json({ 
      token,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email
      },
      impersonatedBy: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email
      },
      system: systemInfo
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
