# Etapa 5 — Gestão de projetos

Implementada em 4 de novembro de 2026, conforme o [plano aprovado](plano-avaliacoes.md). Responsável, controles de visibilidade e arquivamento com auditoria estão no código; 63 testes locais passaram em 6 de novembro. Revisão independente anterior do núcleo sem bloqueadores e inspeção do seletor registradas no [histórico](historico-implementacao.md). Integração real do arquivamento/concorrência e validação visual completa desse fluxo continuam pendentes. O commit local da etapa consta no Git; esta consolidação não verificou publicação remota.

## Escopo e abordagem

- Reutilizar os campos existentes e a API interna: selecionar usuário ativo como responsável e controlar separadamente a visibilidade do projeto e do link.
- Novos projetos começam privados. A publicação é uma alteração explícita posterior, independente do status.
- Preservar o responsável antigo enquanto não houver seleção explícita; não inferir vínculos por nomes. Responsáveis já vinculados e posteriormente inativos podem ser mantidos, mas não escolhidos para outra atribuição.
- Remover projetos sem avaliações; arquivar os que possuem avaliações, inclusive ocultas, preservando alternativas, avaliações e histórico. A decisão ocorre na transação, sob bloqueio do projeto.
- Registrar autor e snapshots das alterações, inclusive visibilidade, vínculo de responsável e arquivamento.
- Preservar o modo local legado. Catálogo público e curadoria pertencem às próximas etapas.

Reutilizar o schema evita migration e duplicação de dados. Preservar o nome legado permite editar projetos antigos antes do mapeamento, ao custo de manter a indicação de vínculo pendente. Exigir mapeamento de todo o acervo antes de qualquer edição bloquearia correções sem benefício para esta etapa.

## Aceite e validação

TDD para seleção válida/inválida, preservação do legado, visibilidade, criação privada, arquivamento e auditoria transacional. Executar suíte local, build, sintaxe e revisão do diff; usar apenas dados sintéticos e conexões simuladas. Conferir formulário e auditoria por testes de interface isolados quando disponíveis.

## Limites

Sem dependências novas, alterações de autenticação, migration ou acesso remoto. Integração real com banco, produção e publicação não fizeram parte da implementação inicial. O usuário posteriormente autorizou commit e push; o commit local foi conferido. Novas operações exigem autorização própria. A consulta pública segura foi implementada na etapa 6, com validação local e integração real ainda pendente. As pendências reais de logout e recuperação da etapa 4 permanecem independentes.
