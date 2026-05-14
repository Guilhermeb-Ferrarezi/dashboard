# Codex Admin Access Token

## Objetivo
Permitir que cada admin tenha um token de acesso próprio para o Codex, sem expiração, mostrado apenas uma vez na criação, revogável a qualquer momento, e usado automaticamente pelo painel quando existir.

## Escopo
- Criar um token por admin, não compartilhado entre admins.
- Mostrar o valor bruto apenas uma vez, no momento da criação.
- Persistir apenas o hash do token e seus metadados.
- Bloquear o acesso ao Codex quando o admin não tiver token ativo.
- Exibir na tela de configurações uma ação para criar o token.
- Permitir revogação normal.
- Preparar a base para suportar outros tokens no futuro, sem exigir mudança estrutural.

## Decisão de arquitetura
Usar token opaco, não JWT, com validação por hash no backend.

Motivos:
- revogação simples
- auditoria simples
- compatível com vários tokens futuros
- evita expor claims desnecessárias

## Modelo de dados
Entidade de token de acesso:
- `adminId`
- `type` (`codex`, com possibilidade de outros tipos depois)
- `label`
- `tokenHash`
- `createdAt`
- `revokedAt` opcional
- `lastUsedAt` opcional

Regras:
- um admin pode ter vários tokens no futuro
- para Codex, o sistema considera apenas o token ativo associado ao tipo `codex`
- token revogado nunca volta a ser válido

## Fluxo de UI
### Configurações
- Adicionar uma seção nova em configurações de admin para `Acesso Codex`.
- Quando não existir token ativo:
  - mostrar estado bloqueado
  - mostrar CTA `Criar token de acesso`
- Quando existir token ativo:
  - mostrar estado habilitado
  - mostrar ação `Revogar`
  - não mostrar o valor bruto novamente

### Criação
- O admin clica em `Criar token`.
- O backend gera o token e salva somente o hash.
- A UI mostra o token uma única vez.
- Depois que a modal/alerta é fechada, o valor deixa de ser recuperável.

### Uso automático
- Quando o token existe, o Codex do painel passa a usar esse segredo automaticamente.
- Se o token não existir, o Codex fica bloqueado e a interface aponta para as configurações.

## API
### Admin tokens
- `POST /api/admin/tokens`
  - cria token
  - retorna o valor bruto apenas na resposta de criação
- `GET /api/admin/tokens`
  - lista tokens do admin atual, sem expor o segredo
- `POST /api/admin/tokens/:id/revoke`
  - revoga token

### Codex
- As rotas do Codex passam a exigir token ativo do admin para operar.
- Sem token ativo:
  - retornar estado bloqueado
  - não iniciar sessão Codex
  - não abrir websocket do drawer

## Fluxo de backend
1. A request chega autenticada como admin.
2. O backend identifica o admin atual.
3. O backend busca um token ativo do tipo `codex`.
4. Se existir, usa esse segredo para habilitar o acesso ao Codex.
5. Se não existir, bloqueia o fluxo e informa que o admin precisa criar token.

## Bloqueio de acesso
- O bloqueio deve acontecer antes de iniciar o `codex app-server`.
- O bloqueio também deve ser refletido na API, para evitar que a UI dependa só de esconder botões.
- O usuário deve receber um estado claro de `sem token configurado`.

## Segurança
- Salvar somente hash do token, nunca o valor bruto.
- Mostrar o token bruto só na criação.
- Permitir revogação sem quebrar outras credenciais de sessão.
- Não misturar o token do Codex com o JWT de login do admin.

## Testes
- Criar token e garantir que o valor bruto só aparece na resposta inicial.
- Listar tokens sem expor o segredo.
- Revogar token e garantir que o acesso ao Codex seja bloqueado.
- Bloquear o Codex quando o admin não tiver token ativo.
- Permitir acesso ao Codex quando o token ativo existir.

## Fora de escopo
- Não mudar a autenticação principal do portal.
- Não criar token compartilhado entre admins.
- Não adicionar expiração automática neste primeiro corte.
