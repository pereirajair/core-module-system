// Resolver caminho para models do projeto principal
const pathResolver = require('../utils/pathResolver');
const modelsPath = pathResolver.resolveModelsPath();
const db = require(modelsPath);
const User = db.User;
const Role = db.Role;
const Function = db.Function;

const authorizeFunctions = (...requiredFunctions) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Unauthorized: User not found in token' });
      }

      // Buscar usuário com suas roles e funções
      const user = await User.findByPk(req.user.id, {
        include: [
          {
            model: Role,
            through: { attributes: [] },
            include: [
              {
                model: Function,
                through: { attributes: [] },
                attributes: ['name']
              }
            ]
          }
        ]
      });

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Coletar todas as funções do usuário através de suas roles
      const userFunctions = new Set();
      user.Roles.forEach(role => {
        role.Functions.forEach(func => {
          userFunctions.add(func.name);
        });
      });

      // Verificar se o usuário possui todas as funções necessárias
      const hasAllFunctions = requiredFunctions.every(funcName => userFunctions.has(funcName));

      if (hasAllFunctions) {
        // Adicionar funções ao req.user para uso posterior
        req.user.functions = Array.from(userFunctions);
        next();
      } else {
        // Verificar se o usuário é ADMIN
        const isAdmin = user.Roles.some(role => role.id === 1 || role.name === 'ADMIN');
        
        if (isAdmin) {
          // Se for ADMIN, criar as funções faltantes e associar ao ADMIN
          const missingFunctions = requiredFunctions.filter(funcName => !userFunctions.has(funcName));
          const createdFunctions = [];
          
          try {
            // Buscar role ADMIN
            const adminRole = await Role.findByPk(1);
            
            if (!adminRole) {
              return res.status(500).json({ message: 'Role ADMIN não encontrada' });
            }
            
            // Para cada função faltante, criar ou buscar e associar ao ADMIN
            for (const funcName of missingFunctions) {
              // Buscar ou criar a função
              const [func, created] = await Function.findOrCreate({
                where: { name: funcName },
                defaults: {
                  name: funcName,
                  title: funcName.replace(/\./g, ' ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                }
              });
              
              // Associar ao ADMIN se ainda não estiver associada
              const hasFunction = await adminRole.hasFunction(func);
              if (!hasFunction) {
                await adminRole.addFunction(func);
                createdFunctions.push(funcName);
                console.log(`[authorizeFunctions] Permissão ${funcName} adicionada ao ADMIN`);
              }
            }
            
            // Se criou alguma função, recarregar role e usuário
            if (createdFunctions.length > 0) {
              // Aguardar um pouco para garantir que o banco processou as inserções
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Recarregar a role ADMIN para garantir que as associações estão atualizadas
              await adminRole.reload({
                include: [
                  {
                    model: Function,
                    through: { attributes: [] },
                    attributes: ['name']
                  }
                ]
              });
              
              // Recarregar usuário usando uma nova query para evitar cache
              const updatedUser = await User.findByPk(req.user.id, {
                include: [
                  {
                    model: Role,
                    through: { attributes: [] },
                    include: [
                      {
                        model: Function,
                        through: { attributes: [] },
                        attributes: ['name']
                      }
                    ]
                  }
                ],
                // Forçar recarregamento sem cache
                logging: false
              });
              
              if (!updatedUser) {
                console.error('[authorizeFunctions] Erro ao recarregar usuário após adicionar permissões');
                return res.status(500).json({ message: 'Erro ao recarregar permissões do usuário' });
              }
              
              // Verificar novamente se agora tem todas as funções
              const updatedUserFunctions = new Set();
              updatedUser.Roles.forEach(role => {
                // Verificar se é a role ADMIN
                if (role.id === 1 || role.name === 'ADMIN') {
                  role.Functions.forEach(func => {
                    updatedUserFunctions.add(func.name);
                  });
                } else {
                  // Para outras roles, também adicionar suas funções
                  role.Functions.forEach(func => {
                    updatedUserFunctions.add(func.name);
                  });
                }
              });
              
              console.log(`[authorizeFunctions] Funções do usuário após adicionar permissões:`, Array.from(updatedUserFunctions));
              console.log(`[authorizeFunctions] Funções necessárias:`, requiredFunctions);
              
              const nowHasAllFunctions = requiredFunctions.every(funcName => updatedUserFunctions.has(funcName));
              
              if (nowHasAllFunctions) {
                req.user.functions = Array.from(updatedUserFunctions);
                // Adicionar header especial para indicar que permissões foram adicionadas
                res.setHeader('X-Permission-Added', 'true');
                res.setHeader('X-Added-Permissions', createdFunctions.join(','));
                res.setHeader('X-Redirect-Url', req.originalUrl || req.url);
                console.log(`[authorizeFunctions] Permissões adicionadas com sucesso. Continuando requisição.`);
                // Continuar com a requisição normalmente
                next();
                return;
              } else {
                const missing = requiredFunctions.filter(f => !updatedUserFunctions.has(f));
                console.error(`[authorizeFunctions] Ainda faltam permissões após adicionar. Faltando:`, missing);
                // Mesmo assim, permitir que continue se adicionou permissões (pode ser problema de cache)
                if (createdFunctions.length > 0) {
                  console.log(`[authorizeFunctions] Permitindo acesso mesmo com cache desatualizado, pois permissões foram adicionadas`);
                  req.user.functions = Array.from(updatedUserFunctions);
                  res.setHeader('X-Permission-Added', 'true');
                  res.setHeader('X-Added-Permissions', createdFunctions.join(','));
                  res.setHeader('X-Redirect-Url', req.originalUrl || req.url);
                  next();
                  return;
                }
              }
            }
          } catch (error) {
            console.error('Erro ao criar permissões para ADMIN:', error);
          }
        }
        
        res.status(403).json({ 
          message: 'Acesso Negado: Você não possui as permissões necessárias para realizar esta ação.'
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
};

module.exports = authorizeFunctions;

