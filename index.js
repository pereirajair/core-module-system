/**
 * Módulo System
 * Exporta informações do módulo para uso pelo sistema Gestor
 */
const fs = require('fs');
const path = require('path');

// Carregar module.json se existir, senão usar informações do package.json
let moduleInfo = {};
const moduleJsonPath = path.join(__dirname, 'module.json');
const packageJsonPath = path.join(__dirname, 'package.json');

if (fs.existsSync(moduleJsonPath)) {
  moduleInfo = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf8'));
} else if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (pkg.gestor) {
    moduleInfo = pkg.gestor;
  }
}

moduleInfo.path = __dirname;

module.exports = moduleInfo;

