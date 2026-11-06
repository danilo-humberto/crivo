# Etapa 6 — Catálogo e páginas públicas

Implementação solicitada em 6 de novembro de 2026, conforme o [plano aprovado](plano-avaliacoes.md). Estado atual: implementada e integrada à main local no commit `6136b34`, conferido no Git. A autorização posterior de integração inclui esta etapa e consta na [etapa 7](implementacao-etapa-7.md). Suíte de integração via driver e publicação continuam pendentes; push remoto não foi revalidado nesta revisão documental.

## Escopo e abordagem

- Catálogo compartilhável em `/catalogo` e página individual em `/projetos/~:id`; no modo gerenciado, a raiz encaminha ao catálogo. O modo local conserva sua entrada e acervo.
- HTML renderizado no servidor Node existente: links e formulário GET funcionam sem JavaScript, com títulos próprios e respostas HTTP de erro. Alternativa: carregar os dados no navegador exigiria estados de carregamento e tratamento adicional de navegação sem benefício necessário nesta etapa.
- Repositório público de leitura com projeção SQL explícita: identificador para navegação, nome, resumo, solução, área, status, datas e nome do responsável. Link somente quando liberado e válido. Nenhum custo, alternativa, auditoria, CPF, foto do responsável ou identificador de usuário.
- Listagem e consulta individual filtram projetos públicos e não arquivados no banco, sem restrição de status. Privado, arquivado e inexistente retornam a mesma resposta 404. API pública separada em `/api/public/projects` e `/api/public/projects/~:id`, somente GET/HEAD.
- A página pública substitui o modal de apresentação para visitantes. O modal administrativo permanece para edição e dados internos. Incluir acesso ao catálogo e à página publicada na gestão.
- Reutilizar tipografia Outfit/Source Sans 3, papel #F0F2F6, branco #FFFFFF, tinta #243052, azul #3549B8, lavanda #E3E6FA e verde #376B59. Catálogo com fichas e títulos alinhados à esquerda; detalhe com texto principal e informações do projeto ao lado, empilhados no celular. Sem métricas fictícias ou controles de etapas futuras.

## Aceite e validação

TDD para projeção pública, filtro de visibilidade/arquivamento, link oculto, acesso sem sessão, métodos recusados, escape de HTML, erros sem detalhes internos e preservação da proteção da gestão. Testes HTTP com repositório simulado e dados sintéticos. Executar suíte local, build, sintaxe, diff e inspeção visual isolada em desktop/celular. Revisão independente justificada pela nova superfície pública de dados.

## Limites

O escopo inicial não incluiu migrations, dependências novas, acesso remoto ou mudança na política de autenticação interna, nem commit, push ou deploy. Avaliações e fotos foram implementadas posteriormente na etapa 7; indicadores nos cards e curadoria foram implementados localmente na [etapa 8](implementacao-etapa-8.md), aprovados para integração à main em 6 de novembro de 2026. A suíte de integração com PostgreSQL via driver continua dependente de ambiente isolado autorizado; não usar produção. Autorizações e integração posteriores estão distinguidas dos registros iniciais abaixo.

O prefixo fixo ~ nos links impede que IDs legados como ponto e ponto duplo sejam normalizados pelo navegador. Gestão e catálogo usam o mesmo helper; a API decodifica o sufixo uma única vez.

## Evidências em 6 de novembro de 2026

- RED: `node --test tests/public-repository.test.cjs tests/public-http.test.cjs` falhou por módulo ausente e rotas públicas ainda inexistentes (404 em vez de 200). GREEN: os testes públicos passaram após implementação.
- Revisão independente encontrou normalização de IDs legados `.`/`..` e concatenação de palavras na quebra móvel do título. Ambos corrigidos; teste adicional de IDs passou pelo RED/GREEN. Reavaliação independente: 9/9 testes públicos aprovados, sem bloqueadores restantes identificados.
- `npm test`: 72/72 aprovados; `npm run build`, `node --check` nos dez arquivos JS/CJS novos ou alterados e `git diff --check` aprovados. Testes usam dados sintéticos e banco/provedor simulados. O teste SQL `tests/integration/public.test.cjs` foi preparado para desenvolvimento descartável com rollback, mas não executado.
- Chrome em origem isolada: catálogo e detalhe inspecionados no desktop e viewport de 390 px (área útil de 375 px, largura de conteúdo de 375 px). Busca por “relatorios” encontrou “Relatórios financeiros”; abertura por Enter, retorno ao catálogo e link liberado conferidos. Nenhuma consulta a banco, autenticação real ou navegação para a solução externa foi realizada.
- TDD aplicado aos comportamentos; layout verificado visualmente. Não houve auditoria completa com leitor de tela ou ferramenta de acessibilidade, que permanece na validação final do sistema.

Roteiro de reprodução: iniciar `node tests/fixtures/public-preview.cjs`; abrir `http://127.0.0.1:4186/catalogo`; buscar um projeto, abrir seu título, voltar e conferir em celular. Na prévia, caminhos de projetos ausentes retornam 404. Para conferir SQL e alternar visibilidade real, usar exclusivamente desenvolvimento isolado e autorizado. O modo legado e a proteção da gestão são cobertos pela regressão local.

Commit e push da branch `codex/etapa-6-catalogo` autorizados pelo usuário em 6 de novembro de 2026, incluindo a consolidação documental desta conversa. Antes do commit, `npm test` passou novamente com 72/72 testes e o build foi aprovado. Ajustes visuais solicitados: cabeçalho alinhado à largura da main, texto introdutório à direita e seta no retorno ao catálogo. Não há mudança de schema ou dependências; merge e deploy não fazem parte desta autorização. A integração com PostgreSQL real permanece pendente.
