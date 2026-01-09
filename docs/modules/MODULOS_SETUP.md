# Setup de Módulos como Pacotes NPM

## ✅ Estrutura Criada

Os módulos estão organizados em `mod/` na raiz do projeto e configurados como pacotes npm.

## 📦 Estrutura dos Módulos

Cada módulo agora tem:
- `package.json` - Configuração do pacote npm com campo `mychat`
- `index.js` - Exporta informações do módulo
- `.gitignore` - Arquivos ignorados pelo git
- `README.md` - Documentação do módulo
- Repositório git inicializado

## 🚀 Como Instalar

### Opção 1: Instalar como pacote local (desenvolvimento)

```bash
# No diretório raiz do projeto
cd /Users/pereirajair/Sites/mychat

# Instalar módulos no frontend
cd frontend
npm install file:../mod/locations --save
npm install file:../mod/pessoa --save
npm install file:../mod/system --save
```

### Opção 2: Instalar de repositório git local

```bash
cd frontend
npm install file:///Users/pereirajair/Sites/mychat/mod/locations --save
npm install file:///Users/pereirajair/Sites/mychat/mod/pessoa --save
```

### Opção 3: Instalar de repositório git remoto (futuro)

Quando você criar repositórios remotos:

```bash
cd frontend
npm install git+https://github.com/seu-usuario/mychat-locations.git --save
npm install git+https://github.com/seu-usuario/mychat-pessoa.git --save
```

## 🔄 Como Funciona

1. O carregador de módulos procura módulos em:
   - `frontend/node_modules/@gestor/*` (pacotes npm instalados)
   - `mod/*` (módulos locais para desenvolvimento)

2. Módulos npm têm prioridade sobre módulos locais

3. As dependências são normalizadas automaticamente:
   - `@mychat/pessoa` → `pessoa`
   - `@mychat/locations` → `locations`

## 📝 Próximos Passos

1. **Instalar os módulos:**
   ```bash
   cd frontend
   npm install file:../mod/locations --save
   npm install file:../mod/pessoa --save
   npm install file:../mod/system --save
   ```

2. **Verificar instalação:**
   ```bash
   ls -la node_modules/@mychat/
   ```

3. **Testar o sistema:**
   - Os módulos devem aparecer automaticamente em `/admin/models`
   - Você pode instalar/desinstalar através da interface

4. **Criar repositórios remotos (opcional):**
   ```bash
   # No GitHub/GitLab, criar repositórios:
   # - mychat-pessoa
   # - mychat-locations
   
   # Depois adicionar remotes:
   cd modules/pessoa
   git remote add origin https://github.com/seu-usuario/mychat-pessoa.git
   git push -u origin main
   ```

## 🔧 Desenvolvimento

Para desenvolver os módulos:

1. Faça alterações em `mod/pessoa/` ou `mod/locations/`
2. Commit as alterações:
   ```bash
   cd mod/pessoa
   git add .
   git commit -m "Sua mensagem"
   ```
3. Atualizar no projeto:
   ```bash
   cd frontend
   npm install file:../mod/pessoa --save --force
   ```

## 📚 Documentação

- Veja [Módulos Gestor](MODULOS.md) para mais detalhes sobre módulos
- Veja [Instalação de Módulos](INSTALL_MODULES.md) para instruções completas

