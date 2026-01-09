# Sistema de Actions

Sistema flexível para definir e executar actions em CRUDs, suportando actions aninhadas, abreviações e execução sequencial.

## Estrutura Básica

As actions são definidas na coluna `actions` do CRUD config:

```json
{
  "name": "actions",
  "label": "Ações",
  "align": "right",
  "sortable": false,
  "items": [
    {
      "type": "edit",
      "icon": "edit",
      "color": "primary",
      "tooltip": "Editar",
      "actions": ["edit"],
      "roles": ["addr.manter_paises"]
    }
  ]
}
```

## Tipos de Actions

### 1. Abreviações (Strings)

Actions simples podem ser definidas como strings:

- `"delete"` - Exclui o item com confirmação
- `"edit"` - Navega para a rota de edição
- `"refresh"` - Atualiza a lista
- `"reload"` - Recarrega a página
- `"redirect"` - Redireciona para a lista
- `"route:/path"` - Navega para uma rota específica
- `"message:texto"` - Exibe uma mensagem

### 2. Action: `dialog`

Abre um dialog com um componente:

```json
{
  "type": "dialog",
  "title": "Editar País",
  "component": "CrudEdit",
  "props": {
    "config": {
      "title": "Editar País",
      "resource": "Countries",
      "endpoint": "/api/countries"
    }
  },
  "onSuccessActions": [
    { "type": "message", "message": "Salvo com sucesso!", "color": "positive" },
    "refresh"
  ]
}
```

### 3. Action: `route`

Navega para uma rota:

```json
{
  "type": "route",
  "route": "/crud/countries/${row.id}",
  "target": "_blank" // opcional, abre em nova aba
}
```

### 4. Action: `message`

Exibe uma notificação:

```json
{
  "type": "message",
  "message": "Operação realizada com sucesso!",
  "color": "positive",
  "icon": "check",
  "position": "top"
}
```

### 5. Action: `confirm`

Exibe uma confirmação e executa actions se confirmado:

```json
{
  "type": "confirm",
  "title": "Confirmar exclusão",
  "message": "Deseja realmente excluir ${row.name}?",
  "persistent": true,
  "actions": [
    {
      "type": "api",
      "method": "delete",
      "endpoint": "/api/countries/${row.id}",
      "onSuccessActions": ["refresh"]
    }
  ]
}
```

### 6. Action: `api`

Executa uma chamada à API:

```json
{
  "type": "api",
  "method": "post",
  "endpoint": "/api/countries/${row.id}/activate",
  "payload": {
    "status": "active"
  },
  "onSuccess": {
    "type": "message",
    "message": "Ativado com sucesso!",
    "color": "positive"
  },
  "onSuccessActions": ["refresh"]
}
```

### 7. Action: `refresh`

Atualiza a lista de itens:

```json
{
  "type": "refresh"
}
```

### 8. Action: `reload`

Recarrega a página:

```json
{
  "type": "reload"
}
```

## Propriedades dos Items

Cada item na coluna `actions` pode ter:

- `type` - Tipo do botão (edit, delete, view, etc.)
- `icon` - Ícone do botão
- `color` - Cor do botão (primary, negative, positive, etc.)
- `label` - Texto do botão (opcional)
- `tooltip` - Tooltip do botão
- `flat` - Botão flat (padrão: true)
- `round` - Botão round (padrão: false)
- `dense` - Botão dense (padrão: true)
- `size` - Tamanho do botão (padrão: 'sm')
- `actions` - Array de actions a executar quando clicado
- `roles` - Array de roles necessárias para exibir o botão
- `condition` - Função ou string de condição para exibir o botão

## Interpolação de Variáveis

Você pode usar variáveis nas strings:

- `${row.field}` - Valor do campo do row
- `${context.field}` - Valor do campo do context

Exemplo:
```json
{
  "message": "Excluir ${row.name}?",
  "route": "/crud/countries/${row.id}"
}
```

## Exemplos Completos

### Exemplo 1: Botões simples

```json
{
  "items": [
    { 
      "type": "edit", 
      "icon": "edit", 
      "color": "primary", 
      "tooltip": "Editar",
      "actions": ["edit"],
      "roles": ["addr.manter_paises"]
    },
    { 
      "type": "delete", 
      "icon": "delete", 
      "color": "negative", 
      "tooltip": "Excluir",
      "actions": ["delete"],
      "roles": ["addr.excluir_paises"]
    }
  ]
}
```

### Exemplo 2: Dialog com actions sequenciais

```json
{
  "items": [
    {
      "type": "edit",
      "icon": "edit",
      "color": "primary",
      "tooltip": "Editar",
      "actions": [
        {
          "type": "dialog",
          "component": "CrudEdit",
          "props": {
            "config": {
              "title": "Editar País",
              "resource": "Countries",
              "endpoint": "/api/countries",
              "rowKey": "id",
              "editRoute": "/crud/countries/:id"
            }
          },
          "onSuccessActions": [
            { 
              "type": "message", 
              "message": "País modificado com sucesso!", 
              "color": "positive", 
              "icon": "check" 
            },
            "refresh"
          ]
        }
      ],
      "roles": ["addr.manter_paises"]
    }
  ]
}
```

### Exemplo 3: Confirmação antes de excluir

```json
{
  "items": [
    {
      "type": "delete",
      "icon": "delete",
      "color": "negative",
      "tooltip": "Excluir",
      "actions": [
        {
          "type": "confirm",
          "title": "Confirmar exclusão",
          "message": "Deseja realmente excluir ${row.name}?",
          "actions": [
            {
              "type": "api",
              "method": "delete",
              "endpoint": "/api/countries/${row.id}",
              "onSuccessActions": [
                {
                  "type": "message",
                  "message": "País excluído com sucesso!",
                  "color": "positive",
                  "icon": "check"
                },
                "refresh"
              ]
            }
          ]
        }
      ],
      "roles": ["addr.excluir_paises"]
    }
  ]
}
```

### Exemplo 4: Action customizada com condição

```json
{
  "items": [
    {
      "type": "activate",
      "icon": "check_circle",
      "color": "positive",
      "tooltip": "Ativar",
      "condition": "row.status !== 'active'",
      "actions": [
        {
          "type": "api",
          "method": "post",
          "endpoint": "/api/countries/${row.id}/activate",
          "onSuccessActions": ["refresh"]
        }
      ],
      "roles": ["addr.manter_paises"]
    }
  ]
}
```

## Permissões

As actions respeitam as roles definidas:

```json
{
  "roles": ["addr.manter_paises", "addr.excluir_paises"]
}
```

Se o usuário não tiver nenhuma das roles, o botão não será exibido.

## Condições

Você pode definir condições para exibir actions:

```json
{
  "condition": "row.status === 'active'"
}
```

Ou como função (no código):
```javascript
condition: (row) => row.status === 'active'
```

## Execução Sequencial

Actions são executadas em sequência. Se uma action falhar, as seguintes não serão executadas.

```json
{
  "actions": [
    { "type": "api", "method": "delete", "endpoint": "/api/item/${row.id}" },
    { "type": "message", "message": "Excluído!" },
    "refresh"
  ]
}
```

## Actions Aninhadas

Actions podem conter outras actions:

```json
{
  "type": "confirm",
  "actions": [
    {
      "type": "api",
      "onSuccessActions": [
        { "type": "message", "message": "Sucesso!" },
        "refresh"
      ]
    }
  ]
}
```

