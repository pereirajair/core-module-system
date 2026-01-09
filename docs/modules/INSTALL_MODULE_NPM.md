# Instalação de Módulos via NPM

## Visão Geral

O sistema permite instalar módulos dinamicamente via npm através de uma API REST. Isso facilita a instalação de novos módulos sem precisar acessar o servidor diretamente.

**Nota**: Os módulos são instalados no diretório `frontend/` onde o backend está integrado.

## Endpoints Disponíveis

### 1. Instalar Módulo

**POST** `/api/modules/npm/install`

Instala um módulo via npm no backend.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "packageName": "@gestor/meu-modulo"
}
```

**Exemplos de packageName:**
- `@gestor/locations` - Pacote npm público
- `@gestor/pessoa` - Pacote npm público
- `https://github.com/user/gestor-module.git` - Repositório Git
- `git+https://github.com/user/gestor-module.git` - Repositório Git com protocolo
- `file:../modules/meu-modulo` - Caminho local

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Módulo instalado com sucesso via npm",
  "packageName": "@gestor/locations",
  "output": "added 1 package...",
  "module": {
    "name": "locations",
    "version": "1.0.0",
    "enabled": true
  },
  "nextSteps": [
    "Execute migrations: npm run db:migrate",
    "Execute seeders: npm run db:seed",
    "Ative o módulo em: /api/modules/locations/install"
  ]
}
```

**Resposta de Erro (400):**
```json
{
  "message": "Nome do pacote é obrigatório",
  "example": "@gestor/meu-modulo ou https://github.com/user/repo.git"
}
```

**Resposta de Erro (500):**
```json
{
  "success": false,
  "message": "Erro ao instalar módulo via npm",
  "error": "npm ERR! 404 Not Found...",
  "packageName": "@gestor/modulo-inexistente"
}
```

### 2. Desinstalar Módulo

**POST** `/api/modules/npm/uninstall`

Desinstala um módulo via npm do backend.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "packageName": "@gestor/meu-modulo"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Módulo desinstalado com sucesso via npm",
  "packageName": "@gestor/locations",
  "output": "removed 1 package..."
}
```

## Permissões Necessárias

- **Instalar:** Requer permissão `adm.criar_modules`
- **Desinstalar:** Requer permissão `adm.manter_modules`

## Fluxo Completo de Instalação

### 1. Instalar via npm
```bash
POST /api/modules/npm/install
{
  "packageName": "@gestor/locations"
}
```

### 2. Executar migrations
```bash
# No servidor
npm run db:migrate
```

### 3. Executar seeders
```bash
# No servidor
npm run db:seed
```

### 4. Ativar módulo (se necessário)
```bash
POST /api/modules/locations/install
```

## Usando via cURL

### Instalar módulo:
```bash
curl -X POST http://localhost:3000/api/modules/npm/install \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"packageName": "@gestor/locations"}'
```

### Desinstalar módulo:
```bash
curl -X POST http://localhost:3000/api/modules/npm/uninstall \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"packageName": "@gestor/locations"}'
```

## Usando via JavaScript (Frontend)

```javascript
// Função para instalar módulo
async function installModule(packageName) {
  try {
    const response = await fetch('/api/modules/npm/install', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ packageName })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Módulo instalado:', data.packageName);
      console.log('Próximos passos:', data.nextSteps);
      return data;
    } else {
      console.error('❌ Erro:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Erro ao instalar módulo:', error);
    throw error;
  }
}

// Exemplo de uso
installModule('@gestor/locations')
  .then(result => console.log('Instalado:', result))
  .catch(error => console.error('Erro:', error));
```

## Validações

O sistema valida:

1. **Formato do pacote:**
   - URLs devem começar com `http://`, `https://` ou `git+`
   - Nomes npm devem seguir o padrão: `[@scope/]package-name[@version]`

2. **Permissões:**
   - Usuário deve estar autenticado
   - Usuário deve ter as permissões necessárias

3. **Execução:**
   - Comando npm é executado no diretório `frontend/`
   - Saída do npm é capturada e retornada

## Segurança

- ✅ Autenticação obrigatória via JWT
- ✅ Autorização baseada em permissões
- ✅ Validação do formato do pacote
- ✅ Execução em diretório controlado (`frontend/`)
- ✅ Captura de erros do npm

## Limitações

1. **Migrations e Seeders:** Devem ser executados manualmente após a instalação
2. **Restart do servidor:** Pode ser necessário para carregar novos módulos
3. **Dependências:** Módulos devem estar disponíveis no npm ou Git

## Troubleshooting

### Erro: "Formato de pacote inválido"
- Verifique se o nome do pacote está correto
- Use @ para pacotes com escopo: `@gestor/modulo`

### Erro: "404 Not Found"
- Pacote não existe no npm
- Verifique a URL do repositório Git

### Erro: "Permission denied"
- Usuário não tem permissão `adm.criar_modules`
- Verifique as permissões do usuário

### Módulo instalado mas não aparece
- Execute o reload de módulos
- Reinicie o servidor: `npm restart`

## Exemplos de Módulos

```json
// Módulo npm público
{
  "packageName": "@gestor/locations"
}

// Repositório GitHub
{
  "packageName": "https://github.com/pereirajair/gestor-locations.git"
}

// Módulo local (desenvolvimento)
{
  "packageName": "file:../modules/meu-modulo"
}

// Versão específica
{
  "packageName": "@gestor/locations@1.2.3"
}
```

## Integração com Frontend

Para integrar com o frontend, crie um componente de diálogo:

```vue
<template>
  <v-dialog v-model="dialog" max-width="500">
    <v-card>
      <v-card-title>Instalar Módulo</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="packageName"
          label="Nome do Pacote ou URL"
          placeholder="@gestor/meu-modulo"
          hint="Exemplo: @gestor/locations ou https://github.com/user/repo.git"
          persistent-hint
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="dialog = false">Cancelar</v-btn>
        <v-btn color="primary" @click="install">Instalar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  data() {
    return {
      dialog: false,
      packageName: '',
      loading: false
    }
  },
  methods: {
    async install() {
      this.loading = true;
      try {
        const response = await this.$axios.post('/api/modules/npm/install', {
          packageName: this.packageName
        });
        
        this.$toast.success('Módulo instalado com sucesso!');
        this.dialog = false;
        this.$emit('installed', response.data);
      } catch (error) {
        this.$toast.error(error.response?.data?.message || 'Erro ao instalar módulo');
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>
```

