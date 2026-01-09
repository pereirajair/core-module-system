# Regras de Documentação

## 📋 Princípio Fundamental

**Toda mudança no código deve ser refletida na documentação.**

A documentação do sistema está centralizada em `mod/system/docs/` e deve ser mantida sempre atualizada e sincronizada com o código.

## 📁 Estrutura da Documentação

A documentação está organizada em categorias:

```
mod/system/docs/
├── CHANGELOG.md                    # Histórico de mudanças
├── DOCUMENTATION_RULES.md          # Este arquivo (regras)
├── getting-started/                # Guias de início rápido
├── architecture/                   # Documentação de arquitetura
├── modules/                        # Documentação de módulos
├── frontend/                       # Documentação do frontend
├── backend/                       # Documentação do backend
└── api/                           # Documentação de APIs
```

## ✍️ Quando Atualizar a Documentação

### Sempre Atualizar

1. **Ao adicionar novas funcionalidades:**
   - Documentar a funcionalidade
   - Adicionar exemplos de uso
   - Atualizar CHANGELOG.md

2. **Ao modificar funcionalidades existentes:**
   - Atualizar documentação relacionada
   - Marcar mudanças como breaking changes se aplicável
   - Atualizar CHANGELOG.md

3. **Ao remover funcionalidades:**
   - Marcar como deprecated ou removido
   - Atualizar CHANGELOG.md
   - Remover documentação obsoleta

4. **Ao mudar a estrutura do projeto:**
   - Atualizar README.md principal
   - Atualizar documentação de arquitetura
   - Atualizar guias de instalação

5. **Ao adicionar/modificar APIs:**
   - Atualizar documentação da API
   - Atualizar exemplos de uso
   - Atualizar OpenAPI/Swagger se aplicável

## 📝 Formato de Documentação

### CHANGELOG.md

Seguir o formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/):

```markdown
## [Versão] - YYYY-MM-DD

### Adicionado
- Nova funcionalidade X

### Mudado
- Funcionalidade Y agora faz Z

### Removido
- Funcionalidade obsoleta W
```

### Documentação de Funcionalidades

Incluir:
- **Descrição**: O que a funcionalidade faz
- **Como usar**: Exemplos práticos
- **Parâmetros**: Se aplicável
- **Retorno**: Se aplicável
- **Exemplos**: Código de exemplo

### Documentação de APIs

Incluir:
- **Endpoint**: URL e método HTTP
- **Autenticação**: Se requerida
- **Parâmetros**: Query params, body, headers
- **Resposta**: Formato da resposta
- **Exemplos**: cURL, JavaScript, etc.
- **Códigos de erro**: Possíveis erros

## 🔄 Processo de Atualização

1. **Fazer a mudança no código**
2. **Imediatamente atualizar a documentação relacionada**
3. **Atualizar CHANGELOG.md**
4. **Revisar se outras documentações precisam ser atualizadas**
5. **Commitar código + documentação juntos**

## 📚 Categorias de Documentação

### Getting Started
- Guias de instalação
- Configuração inicial
- Primeiros passos

### Architecture
- Estrutura do projeto
- Padrões arquiteturais
- Decisões de design

### Modules
- Como criar módulos
- Como instalar módulos
- Estrutura de módulos

### Frontend
- Componentes
- Composables
- Stores
- Rotas

### Backend
- Controllers
- Models
- Middleware
- Utils

### API
- Endpoints
- Autenticação
- Exemplos de uso

## ✅ Checklist de Documentação

Antes de finalizar uma mudança, verificar:

- [ ] Documentação da funcionalidade atualizada
- [ ] CHANGELOG.md atualizado
- [ ] Exemplos de uso atualizados
- [ ] README.md atualizado (se necessário)
- [ ] Documentação de API atualizada (se aplicável)
- [ ] Comentários no código atualizados (se necessário)
- [ ] Documentação obsoleta removida

## 🚫 O que NÃO fazer

- ❌ Deixar documentação desatualizada
- ❌ Documentar apenas em comentários do código
- ❌ Criar documentação duplicada
- ❌ Documentar funcionalidades que não existem mais
- ❌ Usar exemplos que não funcionam

## 📖 Referências

- [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
- [Semantic Versioning](https://semver.org/lang/pt-BR/)
- [Documentação como Código](https://www.writethedocs.org/guide/docs-as-code/)

## 🎯 Objetivo

Manter a documentação sempre:
- ✅ **Atualizada**: Reflete o estado atual do código
- ✅ **Completa**: Cobre todas as funcionalidades
- ✅ **Clara**: Fácil de entender e seguir
- ✅ **Organizada**: Estrutura lógica e fácil de navegar
- ✅ **Acessível**: Fácil de encontrar e consultar

