/**
 * Resolve caminhos relativos ao projeto principal quando o módulo está instalado via npm
 */
const path = require('path');
const fs = require('fs');

/**
 * Detecta se estamos rodando como módulo npm ou local
 */
function isNpmModule() {
  return __dirname.includes('node_modules/@gestor/system');
}

/**
 * Resolve o caminho base do projeto backend
 */
function getBackendPath() {
  if (isNpmModule()) {
    // Se estamos em node_modules/@gestor/system/utils
    // Voltar para backend: ../../../../backend
    const possiblePaths = [
      path.join(__dirname, '../../../../backend'),
      path.join(__dirname, '../../../../../backend'),
      path.join(process.cwd(), 'backend')
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }
    
    // Fallback: assumir estrutura padrão
    return path.join(__dirname, '../../../../backend');
  } else {
    // Se estamos em modules/system/utils, voltar para backend
    return path.join(__dirname, '../../../backend');
  }
}

/**
 * Resolve caminho relativo ao backend
 */
function resolveBackendPath(relativePath) {
  return path.join(getBackendPath(), relativePath);
}

/**
 * Resolve caminho para models do projeto principal
 */
function resolveModelsPath() {
  return resolveBackendPath('src/models');
}

/**
 * Resolve caminho para config do projeto principal
 */
function resolveConfigPath() {
  return resolveBackendPath('src/config');
}

module.exports = {
  isNpmModule,
  getBackendPath,
  resolveBackendPath,
  resolveModelsPath,
  resolveConfigPath
};


