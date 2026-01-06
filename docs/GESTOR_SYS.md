# GestorSys - Classe Utilitária do Sistema

A classe `GestorSys` fornece métodos padrões para operações comuns do sistema, especialmente para inserção de logs.

## Importação

```javascript
const GestorSys = require('@gestor/system/utils/gestorSys');
// ou
const GestorSys = require('../../../old/system/utils/gestorSys'); // caminho relativo
```

## Métodos Disponíveis

### `GestorSys.log(options)`

Insere um log no sistema com opções customizadas.

**Parâmetros:**
- `options.module` (string, obrigatório): Nome do módulo (ex: 'system', 'pessoa', 'locations')
- `options.message` (string, obrigatório): Mensagem do log
- `options.type` (number, opcional): Tipo do log (1=normal, 2=warning, 3=error). Padrão: 1
- `options.userId` (number, opcional): ID do usuário relacionado
- `options.organizationId` (number, opcional): ID da organização relacionada
- `options.systemId` (number, opcional): ID do sistema relacionado
- `options.context` (object, opcional): Contexto adicional em formato objeto
- `options.stackTrace` (string, opcional): Stack trace do erro (geralmente para type=3)

**Retorno:** Promise<Object> - Instância do log criado

**Exemplo:**
```javascript
await GestorSys.log({
  module: 'pessoa',
  message: 'Pessoa criada com sucesso',
  type: 1,
  userId: 1,
  context: { pessoaId: 123, nome: 'João Silva' }
});
```

### `GestorSys.logNormal(module, message, options)`

Insere um log normal (tipo 1).

**Parâmetros:**
- `module` (string): Nome do módulo
- `message` (string): Mensagem do log
- `options` (object, opcional): Opções adicionais (userId, organizationId, systemId, context)

**Exemplo:**
```javascript
await GestorSys.logNormal('system', 'Operação concluída com sucesso', {
  userId: 1,
  context: { operation: 'backup', duration: '5min' }
});
```

### `GestorSys.logWarning(module, message, options)`

Insere um log de warning (tipo 2).

**Exemplo:**
```javascript
await GestorSys.logWarning('pessoa', 'CPF duplicado detectado', {
  userId: 1,
  context: { cpf: '123.456.789-00' }
});
```

### `GestorSys.logError(module, message, options)`

Insere um log de erro (tipo 3).

**Parâmetros:**
- `options.stackTrace` (string, opcional): Stack trace do erro
- `options.error` (Error, opcional): Objeto de erro (stack trace será extraído automaticamente)

**Exemplo:**
```javascript
try {
  // código que pode gerar erro
} catch (error) {
  await GestorSys.logError('pessoa', 'Erro ao criar pessoa', {
    userId: 1,
    error: error,
    context: { pessoaData: { nome: 'João' } }
  });
}
```

### `GestorSys.logException(module, error, options)`

Insere um log de erro a partir de uma exceção (tipo 3).

**Exemplo:**
```javascript
try {
  // código que pode gerar erro
} catch (error) {
  await GestorSys.logException('system', error, {
    userId: 1,
    context: { operation: 'processPayment' }
  });
}
```

## Exemplos de Uso em Controllers

### Exemplo 1: Log em Controller de Cron Job

```javascript
// old/pessoa/controllers/cronController.js
const GestorSys = require('@gestor/system/utils/gestorSys');

module.exports = {
  async runEveryTenMinutes(context) {
    const { db, token, job } = context;
    
    try {
      // Operação do cron job
      const result = await db.Pessoa.create({ /* ... */ });
      
      // Log de sucesso
      await GestorSys.logNormal('pessoa', 'Cron job executado com sucesso', {
        context: { pessoaId: result.id, jobName: job.name }
      });
      
      return result;
    } catch (error) {
      // Log de erro
      await GestorSys.logException('pessoa', error, {
        context: { jobName: job.name }
      });
      throw error;
    }
  }
};
```

### Exemplo 2: Log em Controller de API

```javascript
// old/pessoa/controllers/pessoaController.js
const GestorSys = require('@gestor/system/utils/gestorSys');

exports.createPessoa = async (req, res) => {
  try {
    const pessoa = await db.Pessoa.create(req.body);
    
    // Log de sucesso
    await GestorSys.logNormal('pessoa', `Pessoa ${pessoa.nome} criada`, {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      context: { pessoaId: pessoa.id }
    });
    
    res.json(pessoa);
  } catch (error) {
    // Log de erro
    await GestorSys.logError('pessoa', 'Erro ao criar pessoa', {
      userId: req.user.id,
      error: error,
      context: { body: req.body }
    });
    
    res.status(500).json({ message: error.message });
  }
};
```

## Notas Importantes

1. **Tratamento de Erros**: Se houver erro ao inserir o log, a função não lançará exceção para não quebrar o fluxo da aplicação. O erro será apenas logado no console.

2. **Performance**: Os logs são inseridos de forma assíncrona, mas não bloqueiam a execução do código principal.

3. **Contexto**: O campo `context` é armazenado como JSON na tabela, permitindo armazenar informações estruturadas adicionais.

4. **Stack Trace**: Para logs de erro (tipo 3), é recomendado sempre incluir o `stackTrace` ou passar o objeto `error` para que seja extraído automaticamente.

