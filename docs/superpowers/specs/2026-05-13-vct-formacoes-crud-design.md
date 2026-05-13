# VCT Formações CRUD

## Objetivo
Adicionar criação, edição e exclusão de formações no painel de admin de VCT, reutilizando o card e o modal de detalhes existentes.

## Escopo
- Criar formação com logo, nome, tag e exatamente 4 membros.
- Editar formação existente, incluindo logo e membros.
- Excluir formação existente com confirmação.
- Manter o modal de detalhes atual como ponto de acesso.

## Fluxo de UI
- O card continua abrindo o modal de detalhes ao clicar.
- O modal de detalhes passa a ter ações explícitas:
  - Criar formação
  - Editar formação
  - Excluir formação
- Criar e editar usam o mesmo formulário.
- Excluir usa uma confirmação separada.

## Dados editáveis
- Time:
  - nome
  - tag
  - logo
- Membros:
  - capitão
  - 4 jogadores
  - ordem
  - nome, email, Instagram, WhatsApp, nick, elo atual e peak-ranking

## API
- `POST /api/vct/formacoes`
  - já existe
- `PUT /api/vct/formacoes/:id`
  - atualiza nome, tag, logo e membros
- `DELETE /api/vct/formacoes/:id`
  - remove logo, membros e time

## Regras
- A formação deve continuar tendo um capitão e 4 jogadores.
- Emails e WhatsApp devem ser normalizados como hoje.
- A exclusão deve remover o logo do R2.
- A exclusão deve apagar os membros associados.

## Testes
- Criar formação com payload válido.
- Editar formação preservando a estrutura.
- Excluir formação e limpar dependências.
- Manter os testes de ordenação e render do modal de detalhes.
