#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Tentar carregar .env do diretório frontend (onde está o projeto principal)
// O módulo pode estar em mod/system ou node_modules/@gestor/system
const possibleEnvPaths = [
  path.resolve(__dirname, '../../../frontend/.env'), // node_modules/@gestor/system/scripts -> frontend/.env
  path.resolve(__dirname, '../../../../frontend/.env'), // node_modules/@gestor/system/scripts -> frontend/.env (alternativo)
  path.resolve(__dirname, '../../frontend/.env'), // mod/system/scripts -> frontend/.env
  path.resolve(__dirname, '../.env'), // mod/system/.env ou node_modules/@gestor/system/.env
  path.resolve(__dirname, '../../.env'), // raiz do projeto
];

let envPath = null;
for (const envPathCandidate of possibleEnvPaths) {
  if (fs.existsSync(envPathCandidate)) {
    envPath = envPathCandidate;
    break;
  }
}

if (envPath) {
  require('dotenv').config({ path: envPath });
}

// Executar sequelize db:create
// Tentar encontrar sequelize em vários locais possíveis
let sequelize = 'sequelize';
const possiblePaths = [
  path.resolve(__dirname, '../node_modules/.bin/sequelize'),
  path.resolve(__dirname, '../../../node_modules/.bin/sequelize'),
  path.resolve(__dirname, '../../../../node_modules/.bin/sequelize')
];

for (const sequelizePath of possiblePaths) {
  if (fs.existsSync(sequelizePath)) {
    sequelize = sequelizePath;
    break;
  }
}

const child = spawn(sequelize, ['db:create'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

