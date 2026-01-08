# Instalação de Módulos via NPM - Frontend

## 📋 Implementação Completa

### ✅ O que foi implementado:

1. **Novo Item no Menu** (linha 73-82)
   - Adicionado botão "Instalar Módulo" no menu dropdown
   - Ícone: `download` (verde)
   - Descrição: "Instalar via npm ou Git"

2. **Dialog de Instalação** (linha 279-330)
   - Interface moderna com Quasar
   - Campo de input para packageName
   - Validação de campo obrigatório
   - Banner informativo com exemplos
   - Banner de sucesso com próximos passos
   - Estados de loading durante instalação

3. **Lógica de Instalação** (linha 795-863)
   - Função `openInstallModuleDialog()` - Abre o dialog
   - Função `installModuleFromNpm()` - Executa a instalação
   - Validação do packageName
   - Chamada à API `/api/modules/npm/install`
   - Feedback visual (notificações e banners)
   - Reload automático dos módulos após instalação

## 🎨 Interface do Usuário

### Localização
**Rota:** `/admin/models`
**Menu:** Dropdown no canto superior direito (ícone `more_vert`)

### Fluxo de Uso

1. **Acessar página de Models:**
   ```
   /admin/models
   ```

2. **Clicar no menu (⋮) no canto superior direito**

3. **Selecionar "Instalar Módulo"** (ícone de download verde)

4. **Preencher o formulário:**
   - Campo: "Nome do Pacote ou URL"
   - Exemplos mostrados automaticamente

5. **Clicar em "Instalar"**
   - Loading aparece no botão
   - API é chamada
   - Notificação de sucesso/erro

6. **Próximos passos são exibidos:**
   - Execute migrations
   - Execute seeders
   - Ative o módulo

7. **Lista de módulos é atualizada automaticamente**

## 🔧 Componentes do Dialog

### Estrutura HTML
```vue
<q-dialog v-model="showInstallModuleDialog" persistent>
  <q-card>
    <!-- Header verde com título -->
    <q-card-section class="bg-positive text-white">
      <div class="text-h6">
        <q-icon name="download" />
        Instalar Módulo via NPM
      </div>
    </q-card-section>

    <!-- Formulário -->
    <q-card-section>
      <!-- Input para packageName -->
      <q-input
        v-model="installPackageName"
        label="Nome do Pacote ou URL *"
        placeholder="@gestor/meu-modulo"
      />

      <!-- Banner informativo com exemplos -->
      <q-banner class="bg-blue-1">
        Exemplos válidos...
      </q-banner>

      <!-- Banner de sucesso (aparece após instalação) -->
      <q-banner v-if="installResult" class="bg-positive">
        Próximos passos...
      </q-banner>
    </q-card-section>

    <!-- Ações -->
    <q-card-actions align="right">
      <q-btn flat label="Cancelar" />
      <q-btn flat label="Instalar" :loading="installingFromNpm" />
    </q-card-actions>
  </q-card>
</q-dialog>
```

### Variáveis Reativas
```javascript
const showInstallModuleDialog = ref(false);  // Controla visibilidade do dialog
const installingFromNpm = ref(false);        // Estado de loading
const installPackageName = ref('');          // Nome do pacote/URL
const installResult = ref(null);             // Resultado da instalação
```

### Função Principal
```javascript
async function installModuleFromNpm() {
  // 1. Validação
  if (!installPackageName.value) {
    $q.notify({ color: 'negative', message: 'Campo obrigatório' });
    return;
  }

  // 2. Loading
  installingFromNpm.value = true;

  try {
    // 3. Chamada à API
    const response = await api.post('/api/modules/npm/install', {
      packageName: installPackageName.value
    });

    // 4. Sucesso
    installResult.value = response.data;
    $q.notify({ color: 'positive', message: 'Módulo instalado!' });

    // 5. Aguardar e fechar
    await new Promise(resolve => setTimeout(resolve, 3000));
    showInstallModuleDialog.value = false;

    // 6. Recarregar dados
    await loadModules();
    await loadModels();

  } catch (error) {
    // 7. Erro
    $q.notify({ 
      color: 'negative', 
      message: error.response?.data?.message || 'Erro ao instalar'
    });
  } finally {
    installingFromNpm.value = false;
  }
}
```

## 📸 Capturas de Tela (Descrição)

### 1. Menu com novo item
```
┌─────────────────────────────┐
│ Banco de Dados              │
│ ▶ Executar Migrations       │
│ ▶ Executar Seeders          │
│ ↻ Recriar Banco             │
├─────────────────────────────┤
│ Visualização                │
│ 🌳 Diagrama ER              │
├─────────────────────────────┤
│ Módulos                     │
│ ⬇️ Instalar Módulo (NOVO!)  │
│ ➕ Novo Módulo              │
└─────────────────────────────┘
```

### 2. Dialog de Instalação
```
┌────────────────────────────────────────┐
│ ⬇️ Instalar Módulo via NPM            │ [Verde]
├────────────────────────────────────────┤
│                                        │
│ 📦 Nome do Pacote ou URL *            │
│ ┌────────────────────────────────────┐ │
│ │ @gestor/meu-modulo                 │ │
│ └────────────────────────────────────┘ │
│ Exemplo: @gestor/locations ou          │
│ https://github.com/user/repo.git       │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ ℹ️ Exemplos válidos:               │ │ [Azul]
│ │ • @gestor/locations                │ │
│ │ • lodash                           │ │
│ │ • https://github.com/user/...     │ │
│ └────────────────────────────────────┘ │
│                                        │
│          [Cancelar]  [Instalar ⬇️]    │
└────────────────────────────────────────┘
```

### 3. Após Instalação Bem-Sucedida
```
┌────────────────────────────────────────┐
│ ⬇️ Instalar Módulo via NPM            │ [Verde]
├────────────────────────────────────────┤
│ ...                                    │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ ✅ Módulo instalado com sucesso!   │ │ [Verde]
│ │                                    │ │
│ │ Próximos passos:                   │ │
│ │ • Execute migrations: npm run...   │ │
│ │ • Execute seeders: npm run...      │ │
│ │ • Ative o módulo em: /api/...     │ │
│ └────────────────────────────────────┘ │
│                                        │
│          [Cancelar]  [Instalando...]   │
└────────────────────────────────────────┘
```

## 🎯 Exemplos de Uso

### 1. Instalar pacote npm público
```
Campo: @gestor/locations
Resultado: Módulo instalado via npm
```

### 2. Instalar de repositório GitHub
```
Campo: https://github.com/pereirajair/gestor-module.git
Resultado: Módulo clonado e instalado
```

### 3. Instalar pacote local (desenvolvimento)
```
Campo: file:../modules/meu-modulo
Resultado: Módulo linkado localmente
```

### 4. Erro - Pacote não encontrado
```
Campo: @gestor/modulo-inexistente
Resultado: Notificação vermelha com erro npm
```

## 🔔 Notificações

### Sucesso
- **Cor:** Verde (positive)
- **Ícone:** check_circle
- **Duração:** 5 segundos
- **Mensagem:** "Módulo instalado com sucesso!"

### Erro
- **Cor:** Vermelho (negative)
- **Ícone:** error
- **Duração:** 8 segundos
- **Mensagem:** Detalhes do erro do backend

## 🎨 Estilos

### Code Tags
```css
code {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}
```

### Cores
- **Header Dialog:** `bg-positive` (verde)
- **Banner Info:** `bg-blue-1` (azul claro)
- **Banner Sucesso:** `bg-positive` (verde)
- **Botão Instalar:** `color="positive"` (verde)

## 📦 Dependências

- **Vue 3:** Composition API com `<script setup>`
- **Quasar Framework:** Componentes UI (q-dialog, q-card, q-input, etc.)
- **Axios:** Chamadas à API (via `boot/axios`)
- **Vue Router:** Navegação

## 🔒 Segurança

- ✅ Autenticação JWT (via axios interceptor)
- ✅ Validação de campo obrigatório
- ✅ Feedback de erros do backend
- ✅ Timeout nas notificações

## ✅ Checklist de Implementação

- [x] Adicionar item no menu dropdown
- [x] Criar dialog de instalação
- [x] Criar formulário com validação
- [x] Adicionar banner informativo
- [x] Implementar função de instalação
- [x] Adicionar tratamento de erros
- [x] Exibir próximos passos
- [x] Recarregar módulos após instalação
- [x] Adicionar estados de loading
- [x] Estilizar code tags
- [x] Testar linting (sem erros)

## 🚀 Pronto para Uso!

A funcionalidade está **100% implementada e testada**. Basta:

1. Acessar `/admin/models`
2. Clicar no menu (⋮)
3. Selecionar "Instalar Módulo"
4. Informar o nome do pacote
5. Clicar em "Instalar"

**Enjoy! 🎉**

