# Etapa 8 — Indicadores e curadoria

Implementação autorizada em 6 de novembro de 2026, conforme o [plano aprovado](plano-avaliacoes.md). Branch `codex/etapa-8-indicadores-curadoria`, baseada na main com as etapas 6/7. Preservar a revisão documental preexistente.

Estado: implementada e aprovada pelo usuário após validação da prévia; revisão independente sem bloqueadores de código. Commit, integração à main e push expressamente autorizados em 6 de novembro de 2026. Integração real permanece pendente. Não equivale a entrega publicada nem à conclusão da etapa 9.

## Escopo e abordagem

- Calcular média e quantidade somente de avaliações visíveis na consulta pública do projeto. Mostrar estrelas, média, quantidade e link para `#avaliacoes` nos cards; vazio explícito “Sem avaliações”. Sem cache de indicadores ou valores persistidos que possam divergir.
- Incluir na ficha interna a listagem paginada de avaliações visíveis e ocultas, com ações Ocultar/Reexibir, sem motivo obrigatório. Reutilizar sessão, autorização interna, origem e CSRF existentes; autor sempre obtido da sessão.
- Alterar somente a visibilidade da avaliação, sob bloqueio transacional, e registrar autor e snapshots mínimos na auditoria. Não copiar CPF ou URL da foto para a curadoria/auditoria. Repetir o estado atual não gera novo evento; comparar o estado visto pelo usuário para recusar alterações conflitantes.
- Preservar unicidade por projeto/CPF, inclusive após ocultação. Reexibir restaura a participação nos indicadores na próxima consulta pública. Projetos privados continuam sem consulta pública; arquivados não permitem curadoria pela ficha.
- Reutilizar schema, dependências e interface atuais. Integrar eventos de curadoria à consulta, filtros, detalhes e exportação da auditoria.

## Aceite e validação

TDD para agregação/projeção, rotas protegidas, autoria, estados inválidos, conflito, idempotência, rollback e auditoria; testes de interface e transporte. Regressão local, build, sintaxe, diff e prévia sintética desktop/celular. Preparar integração PostgreSQL sem executá-la em produção; mocks não comprovam concorrência real. Revisão independente ao final pela nova escrita interna.

## Limites

Sem migration, dependências novas ou mudança da política de acesso. Sem credenciais ou acesso a produção/deploy. Commit, integração à main e push receberam autorização posterior, registrada abaixo. Integração real via driver depende de ambiente descartável autorizado. As pendências anteriores permanecem no plano consolidado.

## Evidências

- Base antes das alterações de código: `npm test`, 87/87 aprovados.
- RED: `node --test tests/curation.test.cjs` falhou nos cinco casos iniciais por métodos/rotas/indicadores ausentes; `node --test tests/curation-ui.test.cjs` falhou nos dois casos iniciais por módulo e transporte ausentes. GREEN após implementação. Casos adicionais cobrem listagem interna, clique duplo, fallback sem comandos nativos, falha de leitura após escrita e integridade/importação dos snapshots.
- Final: `npm test`, **97/97 aprovados**; `npm run build`, `node --check` nos 16 arquivos JS/CJS alterados ou novos e `git diff --check` aprovados. Após o último ajuste, app e teste afetado tiveram sintaxe reconferida. Sem lint/análise de tipos configurados. Avisos Git apenas de normalização LF/CRLF.
- Chrome em prévia sintética na porta 4193 (4188 estava ocupada): ocultar retirou o comentário e mudou o catálogo de 12 avaliações/média 4,0 para 11/média 3,9; reexibir restaurou os valores. Conferidos link para comentários, paginação interna 10/2, autoria e antes/depois na auditoria, toast e ação pelo teclado. Desktop e viewport de 390 px inspecionados; página com 375 px de largura útil/conteúdo e diálogo móvel com 320 px, sem overflow horizontal. Corrigida a cor do botão de fechar toast após inspeção visual.
- Revisão independente examinou SQL, rotas, autorização, CSRF, autoria, snapshots e importação/exportação. Executou 94 testes na primeira revisão, além de build/diff; pediu cobertura adicional para listagem, controlador e integração. Reavaliação conferiu os acréscimos e executou 9/9 testes focados, sem bloqueadores. A suíte final do implementador inclui ainda a validação de snapshots/importação, totalizando 97 testes.
- Preparados `tests/integration/curation.test.cjs` e extensão de `tests/integration/public.test.cjs`: indicadores antes/depois, auditoria, rollback, duplicidade após ocultação, conflito simultâneo e recusa de arquivados. **Não executados**: falta ambiente descartável especificamente autorizado. Os novos testes locais e a prévia em memória não comprovam integração/concorrência real no PostgreSQL. Nenhum acesso a credenciais ou produção nesta etapa.

## Funcionamento e roteiro de conferência

Arquivos principais: `server/persistence/public-repository.cjs` calcula os indicadores; `server/persistence/repository.cjs` lista e altera avaliações com auditoria; `server/auth/http.cjs` expõe as rotas protegidas. `server/public/pages.cjs` apresenta os indicadores, `src/web/scripts/curation.js` controla a ficha e `app.js` apresenta os novos eventos da auditoria. O contrato e os comandos atuais estão no [README](../README.md#curadoria-de-avaliações).

1. Executar `node tests/fixtures/curation-preview.cjs --seed-reviews` e abrir `/management` na porta 4188, ou definir `VAULT_PREVIEW_PORT` para uma porta livre. Só usa dados sintéticos; não cobre gravações de projetos.
2. Abrir a ficha do Portal de atendimento, ocultar/reexibir uma avaliação e recarregar o catálogo/página pública. Conferir total, média, comentário e bloqueio de duplicidade em integração autorizada.
3. Abrir Auditoria, filtrar a ação e conferir autor/antes/depois. Testar teclado, paginação e celular. A suíte PostgreSQL só pode ser executada com as proteções e autorização descritas no README.

README, plano consolidado, arquitetura e referências das etapas anteriores atualizados. Alterações documentais anteriores foram preservadas; sem novas dependências ou migrations. Prévia validada e entrega aprovada pelo usuário; commit, integração à main e push autorizados. Integração real, acessibilidade completa/múltiplos navegadores e pendências operacionais anteriores permanecem abertas.

## Aprovação para finalização

Em 6 de novembro de 2026, o usuário validou a prévia e autorizou expressamente criar o commit da etapa 8, integrar à main e fazer push, incluindo a documentação alinhada e a regra do AGENTS.md. Antes da finalização, `npm test` passou novamente com 97/97 e o build foi aprovado. Main local/remota alinhadas na base `628e303`; sem proteção de branch ou workflows GitHub Actions na conferência. Não há configuração de deploy no repositório. A rastreabilidade da integração e publicação do código fica no histórico Git e nas referências remotas; push não equivale a deploy. Nenhuma migration se aplica, e os testes de integração real continuam pendentes.
