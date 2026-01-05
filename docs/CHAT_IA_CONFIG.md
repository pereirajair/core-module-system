# Configuração do Chat IA

O sistema de Chat IA suporta dois provedores: **OpenAI** e **DeepSeek**. Você pode escolher qual usar através de variáveis de ambiente.

## Variáveis de Ambiente

### Provedor de IA (Obrigatório)

```env
AI_PROVIDER=openai
# ou
AI_PROVIDER=deepseek
```

**Padrão:** `openai`

### Configuração para OpenAI

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sua_chave_openai_aqui
OPENAI_API_URL=https://api.openai.com/v1/chat/completions  # Opcional
OPENAI_MODEL=gpt-4o-mini  # Opcional, padrão: gpt-4o-mini
```

**Modelos OpenAI recomendados:**
- `gpt-4o-mini` (padrão, mais econômico)
- `gpt-4o` (mais poderoso)
- `gpt-4-turbo`
- `gpt-3.5-turbo`

### Configuração para DeepSeek

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sua_chave_deepseek_aqui
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions  # Opcional
DEEPSEEK_MODEL=deepseek-chat  # Opcional, padrão: deepseek-chat
```

### Configurações Gerais (Opcionais)

```env
AI_TEMPERATURE=0.7  # Opcional, padrão: 0.7 (0.0 a 2.0)
```

## Exemplo de Arquivo .env

```env
# Provedor de IA (openai ou deepseek)
AI_PROVIDER=openai

# Configuração OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Configuração DeepSeek (se usar deepseek)
# DEEPSEEK_API_KEY=...
# DEEPSEEK_MODEL=deepseek-chat

# Temperatura (opcional)
AI_TEMPERATURE=0.7
```

## Como Obter as Chaves de API

### OpenAI
1. Acesse: https://platform.openai.com/api-keys
2. Crie uma conta ou faça login
3. Gere uma nova chave de API
4. Copie a chave e adicione ao `.env`

### DeepSeek
1. Acesse: https://platform.deepseek.com/
2. Crie uma conta ou faça login
3. Gere uma nova chave de API
4. Copie a chave e adicione ao `.env`

## Notas

- O sistema usa **OpenAI por padrão** se `AI_PROVIDER` não for especificado
- Certifique-se de ter créditos suficientes na sua conta do provedor escolhido
- A temperatura controla a criatividade das respostas (0.0 = mais determinístico, 2.0 = mais criativo)

