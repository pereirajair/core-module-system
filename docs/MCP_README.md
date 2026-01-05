# Model Context Protocol (MCP) Server

Este backend implementa um servidor MCP (Model Context Protocol) que expõe ferramentas disponíveis para modelos de IA de forma padronizada.

## O que é MCP?

O Model Context Protocol (MCP) é um protocolo padronizado baseado em JSON-RPC 2.0 que permite que modelos de IA interajam com ferramentas e recursos externos de forma segura e estruturada.

## Endpoint

```
POST /api/mcp
```

**Autenticação:** Requer token JWT (Bearer Token)

## Métodos Suportados

### 1. `initialize`
Inicializa a conexão com o servidor MCP.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "mychat-mcp-server",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

### 2. `tools/list`
Lista todas as ferramentas disponíveis.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 2
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "createCrud",
        "description": "Cria um novo CRUD dinâmico na plataforma",
        "inputSchema": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "title": { "type": "string" },
            ...
          },
          "required": ["name", "title", "resource", "endpoint", "config"]
        }
      },
      ...
    ]
  },
  "id": 2
}
```

### 3. `tools/call`
Executa uma ferramenta específica.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "createCrud",
    "arguments": {
      "name": "usuarios",
      "title": "Usuários",
      "resource": "users",
      "endpoint": "/api/users",
      "config": {
        "title": "Usuários",
        "columns": [...],
        "fields": [...]
      }
    }
  },
  "id": 3
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"data\":{...},\"message\":\"CRUD criado com sucesso!\"}"
      }
    ],
    "isError": false
  },
  "id": 3
}
```

## Ferramentas Disponíveis

O servidor MCP expõe as seguintes ferramentas:

1. **createCrud** - Cria um novo CRUD dinâmico
2. **createFunction** - Cria uma nova função/permissão
3. **createMenu** - Cria um novo menu
4. **createMenuItem** - Cria um novo item de menu
5. **createModel** - Cria uma nova model Sequelize
6. **updateModel** - Atualiza uma model existente
7. **createMigration** - Cria uma migration Sequelize
8. **runMigration** - Executa migrations pendentes
9. **reloadDynamicRoutes** - Recarrega rotas dinâmicas da API
10. **assignPermissionsToRole** - Atribui permissões a uma role
11. **getModels** - Lista todos os models disponíveis
12. **getModel** - Obtém detalhes de uma model específica
13. **getSystems** - Lista todos os sistemas disponíveis
14. **getRoles** - Lista todas as roles disponíveis
15. **deleteModel** - Exclui uma model do sistema

## Códigos de Erro

O servidor MCP usa códigos de erro padrão JSON-RPC 2.0:

- `-32600`: Invalid Request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

## Integração com ChatIA

O endpoint `/api/chatia` pode ser adaptado para usar o protocolo MCP, permitindo que modelos de IA chamem ferramentas de forma padronizada.

## Exemplo de Uso

```bash
# Listar ferramentas disponíveis
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'

# Chamar uma ferramenta
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "getModels",
      "arguments": {}
    },
    "id": 2
  }'
```

## Funções Automáticas (Controllers)

Além das funções manuais listadas acima, o sistema **descobre automaticamente** todos os métodos exportados pelos controllers Express e os expõe via MCP.

### Nomenclatura

Cada método de controller é exposto com dois formatos de nome:

1. **Nome completo**: `{ControllerName}_{methodName}`
   - Exemplo: `Channel_getAllChannels`, `Organization_getAllOrganizations`, `Function_getAllFunctions`

2. **Aliases amigáveis**: Nomes simplificados gerados automaticamente
   - `getAllChannels` → `getChannels`, `listChannels`
   - `getAllOrganizations` → `getOrganizations`, `listOrganizations`
   - `getChannelById` → `getChannel`
   - `getOrganizationById` → `getOrganization`

### Como Chamar Funções Automáticas

**Exemplo 1: Listar Organizações (usando alias)**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "getOrganizations",
    "arguments": {}
  },
  "id": 1
}
```

**Exemplo 2: Listar Organizações (usando nome completo)**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "Organization_getAllOrganizations",
    "arguments": {}
  },
  "id": 1
}
```

**Exemplo 3: Obter Organização por ID**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "getOrganization",
    "arguments": {
      "id": 1
    }
  },
  "id": 2
}
```

**Exemplo 4: Criar Canal**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "Channel_createChannel",
    "arguments": {
      "data": {
        "name": "Meu Canal",
        "type": "whatsapp"
      }
    }
  },
  "id": 3
}
```

**Exemplo 5: Atualizar Canal**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "Channel_updateChannel",
    "arguments": {
      "id": 1,
      "data": {
        "name": "Canal Atualizado"
      }
    }
  },
  "id": 4
}
```

### Parâmetros por Tipo de Operação

#### Listagem (getAll, list)
```json
{
  "arguments": {
    "query": {
      "page": 1,
      "limit": 10,
      "filter": "texto de busca"
    }
  }
}
```

#### Busca por ID (getById, get)
```json
{
  "arguments": {
    "id": 1
  }
}
```

#### Criação (create)
```json
{
  "arguments": {
    "data": {
      "campo1": "valor1",
      "campo2": "valor2"
    }
  }
}
```

#### Atualização (update, edit)
```json
{
  "arguments": {
    "id": 1,
    "data": {
      "campo1": "novo valor"
    }
  }
}
```

#### Exclusão (delete)
```json
{
  "arguments": {
    "id": 1
  }
}
```

### Descobrir Funções Disponíveis

Ao iniciar o servidor, você verá no console uma lista completa de todas as funções disponíveis:

```
🔍 Inicializando sistema de descoberta automática de MCP...
✅ Sistema MCP inicializado:
   - 10 controllers descobertos
   - 15 rotas descobertas
   - 50 schemas MCP gerados
   - 75 wrappers MCP criados (incluindo aliases)

   📦 channel:
      • getAllChannels
        Nomes MCP disponíveis: Channel_getAllChannels, getChannels, listChannels
      • getChannelById
        Nomes MCP disponíveis: Channel_getChannelById, getChannel
      • createChannel
        Nomes MCP disponíveis: Channel_createChannel
```

Você também pode listar todas as funções disponíveis chamando `tools/list` no endpoint MCP.

## Benefícios do MCP

1. **Padronização**: Protocolo único para comunicação com modelos de IA
2. **Interoperabilidade**: Funciona com diferentes modelos de IA (Claude, GPT, etc.)
3. **Segurança**: Autenticação e validação de parâmetros
4. **Extensibilidade**: Fácil adicionar novas ferramentas
5. **Documentação**: Schema automático das ferramentas disponíveis
6. **Descoberta Automática**: Controllers Express são automaticamente expostos via MCP sem código adicional

