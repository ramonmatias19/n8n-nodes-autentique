# Configuração de Webhooks - Autentique

## Como configurar webhooks para receber notificações da Autentique

### 1. Configuração no N8N

1. **Adicione o nó "Autentique Trigger"** ao seu workflow
2. **Configure os parâmetros**:
   - **Evento**: Selecione o tipo de evento que deseja monitorar
   - **Documentos Específicos**: Se deseja filtrar apenas documentos específicos
   - **Validar Assinatura**: Recomendado manter ativado para segurança

3. **Salve e ative o workflow**
4. **Copie a URL do webhook** gerada pelo N8N

### 2. Configuração na Autentique

Como a Autentique não possui endpoints para configurar webhooks via API, você precisa configurá-los manualmente:

#### Opção 1: Painel da Autentique (Recomendado)
1. Acesse o painel da Autentique
2. Vá em **Configurações** → **Integrações** → **Webhooks**
3. Clique em **Adicionar Webhook**
4. Configure:
   - **URL**: Cole a URL do webhook gerada pelo N8N
   - **Eventos**: Selecione os eventos que deseja receber
   - **Ativo**: Marque como ativo

#### Opção 2: Contato com Suporte
Se você não encontrar a opção de webhooks no painel:
1. Entre em contato com o suporte da Autentique
2. Solicite a configuração de webhook para sua conta
3. Forneça a URL do webhook e os eventos desejados

### 3. Eventos Disponíveis

O trigger suporta os seguintes eventos:

- **`document_signed`**: Documento totalmente assinado por todos os signatários
- **`document_rejected`**: Documento rejeitado por algum signatário
- **`signatory_signed`**: Um signatário específico assinou o documento
- **`signatory_rejected`**: Um signatário rejeitou a assinatura
- **`document_created`**: Novo documento criado
- **`*`**: Todos os eventos (recebe todas as notificações)

### 4. Formato dos Dados Recebidos

Quando um webhook é disparado, você receberá os seguintes dados:

```json
{
  "event": "document_signed",
  "timestamp": "2024-01-15T10:30:00Z",
  "document": {
    "id": "doc_123456",
    "name": "Contrato de Prestação de Serviços",
    "status": "signed",
    "created_at": "2024-01-15T09:00:00Z",
    "completed_at": "2024-01-15T10:30:00Z"
  },
  "signatory": {
    "id": "sig_789",
    "name": "João Silva",
    "email": "joao@email.com",
    "signed_at": "2024-01-15T10:30:00Z"
  },
  "organization": {
    "id": "org_456",
    "name": "Minha Empresa"
  },
  "webhook_data": {
    // Dados brutos completos do webhook
  }
}
```

### 5. Validação de Segurança

Para garantir que os webhooks são legítimos:

1. **Mantenha "Validar Assinatura" ativado**
2. O nó verificará os headers `x-autentique-signature` e `x-autentique-timestamp`
3. Apenas webhooks com assinatura válida serão processados

### 6. Filtros Avançados

#### Filtro por Documento
- Ative **"Apenas Documentos Específicos"**
- Adicione os IDs dos documentos separados por vírgula
- Exemplo: `doc_123,doc_456,doc_789`

#### Filtro por Evento
- Selecione o evento específico no campo **"Evento"**
- Use **"Todos os Eventos"** para receber todas as notificações

### 7. Troubleshooting

#### Webhook não está funcionando:
1. Verifique se o workflow está ativo
2. Confirme se a URL do webhook está correta na Autentique
3. Verifique os logs do N8N para erros

#### Recebendo muitas notificações:
1. Use filtros por documento ou evento específico
2. Ajuste o tipo de evento para ser mais restritivo

#### Erro de assinatura:
1. Verifique se o token da API está correto
2. Confirme se a validação de assinatura está configurada na Autentique

### 8. Exemplo de Workflow

```
[Autentique Trigger] → [If Node] → [Enviar Email]
                         ↓
                    [Log Evento]
```

### 9. Limitações

- Os webhooks precisam ser configurados manualmente na Autentique
- Rate limit de 60 requisições por minuto
- Validação de assinatura pode variar dependendo da configuração da conta

### 10. Suporte

Para dúvidas sobre configuração de webhooks na Autentique:
- Email: contato@autentique.com.br
- Documentação: https://docs.autentique.com.br/api

Para problemas com o nó N8N:
- Email: contato@lumiaria.com.br
- GitHub: https://github.com/ramonmatias19/n8n-nodes-autentique 