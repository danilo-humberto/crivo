# Etapa 7 — Avaliações e fotos

Implementação autorizada em 6 de novembro de 2026, após apresentação do escopo da etapa 7 no [plano aprovado](plano-avaliacoes.md). Branch `codex/etapa-7-avaliacoes`, baseada na entrega local da etapa 6.

Estado atual: entrega aprovada e integrada à main local no commit `628e303`, incluindo a etapa 6 no histórico. Git local conferido em 6 de novembro de 2026; push autorizado conforme registro abaixo, sem nova conferência remota. Última suíte registrada: 87/87 testes locais; ensaio SQL isolado aprovado. Integração completa via aplicação/driver, proteção no runtime de publicação e deploy permanecem pendentes. Os registros abaixo preservam a sequência de implementação e validação; limites iniciais foram parcialmente superados pelas evidências finais.

## Abordagem e aceite

- Reutilizar a inserção transacional existente e a restrição de unicidade do banco, incluindo avaliações ocultas. Manter o bloqueio da linha do projeto contra arquivamento/retirada de publicação durante o envio.
- API pública GET/HEAD/POST por projeto e formulário HTML POST na página individual, sem exigir login ou JavaScript. Nome até 120 caracteres e comentário até 2.000; nota inteira de 1 a 5 e CPF validado no servidor. Sem edição após envio.
- Listagem paginada de avaliações visíveis com projeção explícita, nome, nota, comentário, data e URL HTTPS da foto; nunca um campo CPF separado. Avatar padrão enquanto a foto carrega ou falha. Não copiar imagens.
- Origem exata, token assinado com validade de uma hora e vínculo ao projeto, corpo limitado a 16 KiB e prazo de leitura. Limitar tentativas por IP do socket e globalmente, com memória limitada. Não confiar em cabeçalhos de proxy enviados pelo cliente.
- Reutilizar HTML/CSS do catálogo e controles nativos acessíveis. Publicação imediata com redirecionamento após POST; erros preservam nome/comentário/nota, mas não devolvem CPF digitado.

HTML no servidor mantém o fluxo sem JavaScript e evita dependências. A limitação em memória atende o servidor Node de processo único; armazenamento distribuído/controle na borda exigiria infraestrutura adicional, fora desta implementação. Antes de publicação com proxy ou múltiplas instâncias, validar o limite e a identificação confiável do cliente no runtime escolhido.

## Validação e limites

TDD de validação, rotas, projeção pública, duplicidade, origem/token, limites, escape, fotos e fallback. Regressão local, build, sintaxe, diff, prévia sintética e revisão independente pela nova escrita pública com CPF. Integração real depende de PostgreSQL descartável autorizado; mocks não comprovam concorrência real.

Não foram necessárias migrations ou dependências novas. O escopo inicial não autorizava acesso a produção, commit, push, merge ou deploy; autorizações posteriores e a leitura em produção estão registradas abaixo. Indicadores agregados nos cards e curadoria foram implementados localmente na [etapa 8](implementacao-etapa-8.md), aprovados para integração à main em 6 de novembro de 2026. A proteção contra abuso não verifica identidade nem impede um terceiro de informar CPF alheio, limitação já aceita no plano.

## Evidências iniciais em 6 de novembro de 2026

- Base: `npm test`, 72/72 aprovados antes das alterações. RED: `node --test tests/reviews-public.test.cjs` falhou por módulo ausente. GREEN: 11/11 testes novos aprovados, incluindo projeção SQL simulada, publicação, duplicidade, validação, token/origem, limites HTTP, paginação, escape e fallback de foto. Teste de corpo fragmentado confirma limite sem depender de Content-Length.
- Verificação final: `npm test` 83/83 aprovados; `npm run build`, `node --check` nos 12 arquivos JS/CJS envolvidos e `git diff --check` aprovados. Nenhuma dependência instalada no projeto; sem migration ou operação remota.
- Revisão independente identificou POST nativo bloqueado por `no-referrer` e escape de hífen inválido no `pattern` HTML com flag `v`. Ambos tiveram regressão RED/GREEN e correção reavaliada; nenhum bloqueador adicional de código identificado. Política `same-origin` restrita às páginas com formulário (inclusive reexibição após erro); fotos permanecem `no-referrer`.
- Chrome com dados sintéticos e sem conexão a banco/Auth: CPF com dígito inválido foi recusado; nome/comentário/nota preservados, CPF limpo e foco no erro. Correção com CPF formatado publicou imediatamente e redirecionou. Foto local inexistente manteve avatar. Desktop e viewport de 390 px inspecionados; conteúdo e área útil de 375 px, sem transbordamento horizontal; controles de nota em uma linha e formulário empilhado no celular.
- `tests/integration/public.test.cjs` ampliado para projeção de avaliações, fotos e exclusão de ocultas/privadas/arquivadas, com rollback. `tests/integration/persistence.test.cjs` já cobre envios simultâneos e unicidade após ocultação na inserção reutilizada. **Não executados**: falta ambiente PostgreSQL descartável especificamente autorizado. A concorrência real não está comprovada nesta entrega.
- Sem lint ou análise de tipos configurados. Acessibilidade completa com leitor de tela, múltiplos navegadores e operação distribuída permanecem pendentes; não declarar publicação pronta.

Roteiro manual: iniciar a prévia sintética, abrir um projeto, enviar CPF sintético inválido e corrigir; conferir publicação, avatar e recusa de segunda avaliação. Redimensionar para celular e navegar por teclado. Use somente dados sintéticos; a prévia não persiste após reinício. A API documentada no README permite conferir origem, token, paginação e respostas de erro.

## Ajustes solicitados na revisão visual

Removidos os textos auxiliares de CPF, comentário e publicação imediata. CPF recebe máscara progressiva no navegador; a normalização existente no servidor mantém somente os 11 dígitos na persistência. Comentário exibe contador no canto inferior interno, com espaço reservado para não cobrir o texto e mantendo redimensionamento vertical. Dois testes novos passaram pelo RED/GREEN para máscara, posição de edição, exclusão junto da pontuação e atualização do contador. Suíte final: 85/85; build e diff aprovados. Não houve nova inspeção de navegador desses ajustes; reiniciar a prévia para carregar o HTML atualizado.

## Aprovação e conferência para integração

Entrega aprovada pelo usuário, com autorização explícita para commit, integração à main, push e conferência do banco de produção. Escopo inclui a etapa 6, base da branch da etapa 7, ainda não integrada à main. Ajustes finais: avatar reduzido, nota no cabeçalho, toast, cinco avaliações por página, badge de total e navegação Voltar/Próximo com quantidade de páginas. README atualizado.

- `npm test`: **87/87 aprovados**; `npm run build` e `git diff --check` aprovados. Revisão independente final executou os 15 testes de avaliações/formulário/toast e não identificou bloqueadores adicionais.
- PostgreSQL 18 descartável, container `postgres:18-alpine` sem rede, migrations 001/002 e somente dados sintéticos: executada a consulta real do repositório via `psql`. Confirmados lotes 5/5/2, total 12, três páginas, ajuste de página excedente, ocultação, privacidade e arquivamento. Duas transações concorrentes de inserção tiveram um único vencedor; ocultar a avaliação não liberou a combinação projeto/CPF. O container temporário foi encerrado após a conferência. Esse ensaio SQL não equivale à suíte completa de integração do driver Neon.
- Produção: credencial carregada pelo processo a partir da configuração existente, sem impressão de segredos; ambiente `production`, banco `neondb`, papel `neondb_owner` e identidade esperada conferidos. Transação `BEGIN READ ONLY`, com timeout de dez segundos: migrations 1/2, permissões de SELECT/INSERT, FK de projetos e UNIQUE(project_id, cpf) confirmados. Consulta de avaliações com total/paginação executou sem erro. Não havia projeto público ativo; não foi possível conferir avaliações reais nessa condição. Nenhuma escrita, migration, fixture ou suíte automatizada executada em produção.
- Repositório remoto sem workflows GitHub Actions e main sem proteção no momento da conferência. Nenhum mecanismo de deploy configurado no repositório; push não comprova publicação de uma aplicação hospedada. Workers e validação completa de escrita via aplicação/driver permanecem pendentes.
