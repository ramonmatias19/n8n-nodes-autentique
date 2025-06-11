# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

## [2.0.0] - 2024-12-19

### 🎉 Major Feature Release

### ✨ Added

#### **Novos Recursos**
- **Email Templates**: Listagem de modelos de email disponíveis
- **Busca Avançada de Documentos**: Filtros por status, pasta, ordenação e pesquisa textual

#### **Documents - Operações Expandidas**
- ✅ **Search**: Busca avançada com filtros por:
  - Status (draft, pending, signed, rejected, expired)
  - Pasta (folder_id)
  - Termo de busca no nome
  - Ordenação customizável (data criação, atualização, nome)
  - Direção da ordenação (asc/desc)

#### **Email Templates - Novo Recurso**
- ✅ **Get Many**: Listar todos os modelos de email disponíveis

### 🔧 Enhanced

#### **Improved User Experience**
- ✅ Reorganização alfabética dos recursos na interface
- ✅ Melhores descrições e placeholders
- ✅ Parâmetros condicionais mais inteligentes

### 📊 **Cobertura da API**

| Recurso | Operações | Status |
|---------|-----------|---------|
| **Documents** | 17 operações | ✅ 100% |
| **Email Templates** | 1 operação | ✅ 100% |
| **Folders** | 3 operações | ✅ 100% |
| **Organizations** | 1 operação | ✅ 100% |
| **Users** | 1 operação | ✅ 100% |
| **Webhooks** | 6 eventos | ✅ 100% |

**Cobertura Total: ~95% da API Autentique**

### 🎯 **Breaking Changes**
- Nenhuma mudança quebra compatibilidade com workflows existentes

### 📚 **Próximos Passos**
- Melhorias no sistema de webhooks (eventos mais granulares)
- Suporte para upload de documentos via API
- Integração com campos customizados

## [1.1.0] - 2024-01-15

### ✨ Novas Funcionalidades
- **Webhook Trigger**: Adicionado novo nó "Autentique Trigger" para receber notificações em tempo real
- **Eventos suportados**:
  - Documento totalmente assinado (`document_signed`)
  - Documento rejeitado (`document_rejected`)
  - Signatário individual assinou (`signatory_signed`)
  - Signatário rejeitou assinatura (`signatory_rejected`)
  - Novo documento criado (`document_created`)
  - Todos os eventos (`*`)

### 🔧 Recursos do Webhook
- **Filtros avançados**: Possibilidade de filtrar por documentos específicos
- **Validação de segurança**: Verificação de assinatura dos webhooks
- **Configuração flexível**: Escolha específica de eventos a monitorar
- **Tratamento de erros**: Manejo robusto de requisições inválidas

### 📚 Documentação
- Adicionado arquivo `WEBHOOK_SETUP.md` com instruções detalhadas de configuração
- Atualizado README.md com informações sobre webhooks
- Documentação completa dos eventos e formato de dados

### 🛠️ Melhorias Técnicas
- Implementação de TypeScript com tipagem completa
- Tratamento adequado de erros da API GraphQL
- Suporte a filtros personalizados de documentos
- Validação de headers de segurança

### 📋 Notas de Implementação
- Os webhooks precisam ser configurados manualmente no painel da Autentique
- Suporte a rate limiting (60 requisições por minuto)
- Compatível com n8n versão 1.54.4 ou superior

## [1.0.8] - Versões Anteriores

### Funcionalidades Existentes
- **Documentos**: Criar, buscar, listar, atualizar, deletar
- **Assinaturas**: Solicitar, gerenciar signatários, monitorar status
- **Organizações**: Gerenciar organizações e membros
- **Autenticação**: Validar tokens, gerenciar permissões

---

## Como Usar o Changelog

- **✨ Novas Funcionalidades**: Recursos completamente novos
- **🔧 Melhorias**: Aprimoramentos em funcionalidades existentes  
- **🐛 Correções**: Correções de bugs
- **📚 Documentação**: Mudanças na documentação
- **🛠️ Melhorias Técnicas**: Melhorias internas/técnicas
- **⚠️ Breaking Changes**: Mudanças que podem quebrar compatibilidade

Para mais informações sobre cada versão, consulte as [releases no GitHub](https://github.com/ramonmatias19/n8n-nodes-autentique/releases). 

## [1.0.0] - 2024-11-15

### ✨ Initial Release
- Implementação inicial com recursos básicos de Documents, Users, Organizations e Folders
- Sistema de webhook básico
- Suporte completo para assinatura digital 