# Vault TI

Aplicativo em HTML, CSS e JavaScript com servidor Node, autenticação Neon Managed Better Auth e persistência PostgreSQL no Neon. A gestão inclui as funcionalidades da etapa 5; a etapa 6 acrescenta catálogo e páginas públicas de projetos, e a etapa 7 implementa avaliações públicas com fotos. Indicadores agregados e curadoria ainda não estão disponíveis.

Estado consolidado em 6 de novembro de 2026 por inspeção do código e documentação. Operações remotas citadas são registros anteriores, não uma nova conferência do ambiente remoto.

## Referências

- [Plano aprovado e acompanhamento](docs/plano-avaliacoes.md): requisitos e pendências por etapa.
- [Arquitetura](docs/arquitetura-etapa-2.md): escolhas adotadas e validação pendente no Cloudflare.
- Planos de [persistência](docs/implementacao-etapa-3.md), [autenticação](docs/implementacao-etapa-4.md), [gestão](docs/implementacao-etapa-5.md) e [catálogo público](docs/implementacao-etapa-6.md).
- [Avaliações e fotos](docs/implementacao-etapa-7.md): implementação, limites de proteção contra abuso e evidências locais.
- [Histórico](docs/historico-implementacao.md): evidências RED/GREEN, inspeções de navegador, revisões, migrations e recuperação anteriores. Estados intermediários desse histórico não substituem este README.

## Executar

Requer Node 22 ou posterior. Instale as versões do lockfile com `npm ci`. Configure as variáveis de `.env.example` por mecanismo seguro e execute `npm start`: gera `dist/auth.js` antes de iniciar o servidor. Os comandos não carregam `.env` automaticamente.

No modo padrão (`VAULT_MODE=managed`), abra http://localhost:4173. `APP_ORIGIN` deve coincidir com a origem usada e autorizada no Auth. O servidor escuta em `127.0.0.1:4173`; acessos às páginas de entrada/gestão por host diferente redirecionam para a origem configurada. Use HTTPS fora do desenvolvimento local. Sem configuração, a API protegida nega acesso.

- `/` e `/index.html` redirecionam para `/catalogo` no modo gerenciado.
- `/catalogo` e `/projetos/~:id` oferecem leitura pública, sem sessão. O prefixo `~` preserva IDs legados como `.` e `..`; o restante do ID é codificado para URL.
- `/auth` reúne entrada, cadastro, verificação, recuperação e convites.
- `/management` exige sessão válida, e-mail verificado e usuário interno ativo.

Reinicie após mudanças no servidor/configuração e recarregue as abas após atualizar a interface. `node server.cjs` e `node server/server.cjs` iniciam sem gerar o bundle; prefira `npm start`.

## Gestão e auditoria

Cadastro e edição com nome, descrição, solução, link, responsável, área, status, datas, custo e alternativas. Busca, filtros e ordenação. Economia potencial calculada contra a alternativa de menor custo, somando apenas projetos concluídos e excluindo desenvolvimento e implantação.

Na gestão remota, novos projetos exigem responsável ativo e começam privados, com link público desabilitado. Depois de salvar, é possível controlar separadamente a visibilidade do projeto e do link, independentemente do status. O cabeçalho abre o catálogo; a ficha de um projeto público oferece acesso à sua página pública em outra aba.

Nomes legados são preservados sem associação automática a contas. O vínculo é feito por seleção explícita. Responsável vinculado que se torne inativo pode ser mantido, mas não escolhido para nova atribuição. A lista mostra nome/foto com fallback de iniciais e alternativa textual em navegadores sem seletor personalizável.

A remoção exclui projetos sem avaliações e arquiva aqueles com qualquer avaliação, inclusive oculta. Arquivamento preserva alternativas, avaliações e histórico e retira o projeto da listagem da gestão. Não há interface de desarquivamento.

Alterações e auditoria são transacionais e verificam a versão esperada. Criação, edição, exclusão e arquivamento registram o autor autenticado e snapshots; salvar sem alteração não gera evento. Autoria antiga não é atribuída retroativamente. A auditoria oferece busca, filtros, comparação antes/depois, paginação e downloads JSON, sem restauração automática.

## Catálogo e páginas públicas

O catálogo apresenta fichas com área, status, resumo, responsável e datas, com busca sem acento e filtros por status/área. Cada título abre uma página própria, com detalhes e link da solução somente quando liberado. Navegação e busca funcionam sem JavaScript; o HTML é renderizado no servidor. O modal administrativo permanece para edição e consulta de dados internos.

`GET/HEAD /api/public/projects` lista projetos; `GET/HEAD /api/public/projects/~:id` consulta um projeto. A consulta SQL pública seleciona somente os campos permitidos e filtra `is_public=true` e `archived_at IS NULL`, sem depender do status. O link oculto não sai do banco; custos, alternativas, auditoria, CPF e identificador/foto de usuários não integram a projeção pública. Privado, arquivado e inexistente recebem o mesmo 404. Respostas usam `Cache-Control: no-store`; falhas de banco retornam 503 genérico. O catálogo depende da configuração do banco, sem consultar o Auth para leitura.

Para prévia isolada, execute `node tests/fixtures/public-preview.cjs` e abra http://127.0.0.1:4186/catalogo. Usa somente quatro projetos sintéticos em memória, sem banco, Auth ou importação; encerre com Ctrl+C. Não representa o acervo real.

## Avaliações públicas

### Padrão de feedback da interface

Use **toast para feedback das ações do usuário**, como confirmação de publicação, salvamento, exclusão ou cópia. A exceção são mensagens de preenchimento e validação de formulários: mantenha erros e orientações no próprio formulário, junto ao campo ou em um resumo acessível. Após concluir o envio com sucesso, use toast, como na publicação de avaliações.

Toasts devem anunciar a mensagem com `role="status"`, sem mover o foco, oferecer fechamento manual e desaparecer após seis segundos (preservando a notificação enquanto seu botão está focado). O toast de avaliações usa Popover manual com alternativa de posicionamento fixo; remove `enviada` da URL para não repetir a confirmação ao recarregar. Sem JavaScript, a confirmação permanece visível. Este é o padrão para novas alterações; não implica revisão retroativa de todas as telas existentes.

A página individual permite avaliar sem login: nome (até 120 caracteres), CPF válido, nota inteira de 1 a 5 e comentário (até 2.000 caracteres). O formulário usa POST nativo, funciona sem JavaScript e redireciona após a gravação. Uma avaliação por CPF/projeto, sem edição; avaliações ocultas continuam ocupando essa combinação. A inserção reutiliza a transação, o bloqueio do projeto e a restrição UNIQUE existentes. Integração e concorrência em PostgreSQL real permanecem pendentes.

`GET/HEAD /api/public/projects/~:id/reviews?page=1` retorna até 5 avaliações visíveis, `nextPage` e `formToken`. O POST nessa rota recebe JSON com nome (`name`), CPF (`cpf`), nota numérica (`rating`), comentário (`comment`) e `formToken`. Exige `Origin` correspondente a `APP_ORIGIN`. A listagem seleciona apenas nome, nota, comentário, data e identificador, além do CPF usado exclusivamente para montar `photoUrl`. Não retorna campo CPF separado. Projeto privado, arquivado ou ausente recebe 404; duplicidade recebe 409. Fotos são carregadas diretamente pelo navegador, sem proxy, e o avatar padrão permanece durante carregamento/falha ou sem JavaScript.

O token é assinado por processo, vinculado ao projeto, expira em uma hora e deixa de valer ao reiniciar o servidor; reabra a página nesses casos. Corpo limitado a 16 KiB, com dez segundos para leitura. Limite de dez tentativas por IP e 200 por processo a cada dez minutos, com 429 e `Retry-After`; inclui tentativas inválidas. Usa o IP do socket, sem confiar em `X-Forwarded-For`. Atrás de proxy os visitantes compartilham o limite do proxy; múltiplas instâncias têm limites e tokens independentes. Validar controle distribuído/na borda antes de publicar nessa arquitetura. Não é verificação de identidade nem proteção completa contra ataques distribuídos.

Somente páginas com formulário usam `Referrer-Policy: same-origin`, para preservar `Origin` no POST nativo; referências externas continuam omitidas e fotos usam `no-referrer`. Erros de validação preservam nome, nota e comentário, sem devolver o CPF digitado. Não há registros de corpo/CPF no servidor.

A prévia sintética também aceita avaliações em memória, perdidas ao encerrar; usa foto local inexistente para conferir o avatar sem acessar o servidor de fotos real. `VAULT_PREVIEW_PORT` permite escolher outra porta. Nunca informe dados pessoais reais na prévia.

Para testar a paginação com carga pronta, execute `node tests/fixtures/public-preview.cjs --seed-reviews`. O Portal de atendimento inicia com 12 avaliações fictícias: cinco na primeira página, cinco na segunda e duas na terceira. A carga é somente em memória, sem CPF e sem conexão ao banco; os demais projetos permanecem sem avaliações.

O título Avaliações mostra um badge com o total de avaliações visíveis. A navegação usa “← Voltar”, “Página X de Y” e “Próximo →”, desabilitando as extremidades. A API também retorna `total`, `totalPages` e `page`; contagem e registros usam a mesma consulta SQL e os mesmos filtros públicos. Páginas além do total retornam a última disponível.

## Autenticação, convites e fotos

Conta no provedor não concede acesso interno automaticamente. Cada operação protegida verifica sessão no provedor, e-mail verificado e autorização ativa. Escritas exigem origem permitida e token CSRF; autoria vem da sessão.

Usuários internos ativos geram links para compartilhamento manual, sem vínculo a e-mail, de uso único e validade de 48 horas. Somente o emissor revoga os próprios convites não consumidos. O banco guarda o hash do token. Aceite e concessão de acesso são atômicos, com nome e CPF válido; usuário inativo não é reativado automaticamente. O fragmento é removido da URL após leitura; recarregar antes do aceite exige reabrir o convite original.

O primeiro usuário já foi provisionado conforme o registro operacional. Para outro ambiente vazio, `node server/bootstrap-cli.cjs` exige autorização, identidade esperada, `VAULT_BOOTSTRAP_APPROVED=yes` e entrada JSON privada via stdin com `subject`, `email`, `name`, `cpf` e `sessionCookie`. Não fornecer valores sensíveis em argumentos ou chat. O comando confere identidade/e-mail e recusa provisionamento se já existir usuário interno. Não há endpoint público de bootstrap.

Perfil, responsáveis e avaliações usam `EMPLOYEE_PHOTO_BASE_URL`, padrão `https://intranet-cifra.netlify.app/funcionarios/{cpf}.jpeg`. Exige HTTPS e marcador `{cpf}`. A URL contém CPF por decisão aprovada, sem campo CPF separado; o navegador carrega diretamente da origem. Não há R2, proxy ou cópia local. Perfil e responsáveis mantêm iniciais durante carregamento e falhas; avaliações mantêm avatar padrão.

Login, logout e recuperação estão implementados. Os registros confirmam cadastro, verificação e primeiro acesso à gestão; logout, novo login e recuperação reais ainda precisam de validação completa. O fluxo de convite com segunda conta também precisa de validação de ponta a ponta em desenvolvimento isolado.

## Persistência e importação

As migrations 001 e 002 constam como aplicadas no registro operacional autorizado. A biblioteca de persistência valida avaliações e CPF; o schema garante `UNIQUE(project_id, cpf)`, inclusive após ocultação. A etapa 7 conecta essa persistência à API pública e ao formulário. As etapas 6 e 7 não exigem migration.

A gestão remota não importa automaticamente nem usa localStorage como fallback. A migração do acervo antigo continua pendente.

Para prévia de exportação autorizada em `imports/`, execute `npm run import:preview -- imports/exportacao.json origem-estavel keep`. Não conecta ao banco nem imprime dados pessoais: informa contagens e quantidade de responsáveis sem vínculo. Para excluir exemplos, use `exclude` e repita `--exclude-project=ID`; eventos `demo: true` também são excluídos. Não modifica o arquivo original.

A mesma origem/conteúdo torna a importação idempotente. Conteúdo diferente para origem já importada exige reconciliação; conflitos de IDs interrompem a transação. Nomes legados, snapshots e histórico são preservados sem inferir usuários. A prévia não consulta conflitos de IDs no banco; são verificados na aplicação.

`--apply` exige autorização específica, `VAULT_DB_ENV=development`, `VAULT_IMPORT_APPROVED=yes` e identidade esperada de banco/papel. A CLI atual não aplica importações em produção. Não alterar proteções para contornar o destino. Não há comando automático de migration; sua aplicação exige revisão e autorização próprias.

## Modo legado local

Use explicitamente `VAULT_MODE=local`, fora de produção, e a origem original do acervo, normalmente http://127.0.0.1:4173, no mesmo navegador. Não representa sessão autenticada nem sincroniza com o servidor. O inicializador recusa esse modo com `VAULT_DB_ENV=production`.

`vault-ti.state.v2` contém projetos e auditoria; `vault-ti.projects.v1` é preservada após migração. Falhas de gravação não sobrescrevem estado válido. Web Locks serializa gravações quando suportado; sem ele há limitação para escritas simultâneas. Limpar o navegador remove o acervo. Os seis projetos iniciais, custos, alternativas e eventos demonstrativos são fictícios. O histórico local usa autoria não identificada.

## Estrutura e dependências

- `src/domain/`: validação, busca, economia e auditoria.
- `src/infrastructure/`: armazenamento local e transporte remoto.
- `src/web/`: páginas, scripts e estilos de gestão, conta e perfil.
- `server/server.cjs`: servidor Node e lista explícita de assets.
- `server/auth/`: integração Auth, políticas, API protegida, convites e bootstrap.
- `server/public/`: rotas de leitura e renderização HTML do catálogo/detalhes; `src/web/styles/catalog.css`: estilos públicos.
- `server/public/review-http.cjs`, `review-protection.cjs` e `server/persistence/review-repository.cjs`: envio, limites e listagem de avaliações; `src/web/scripts/reviews.js`: fotos e melhoria progressiva do formulário.
- `server/persistence/`, `server/migrations/` e CLIs: banco e importação.
- `tests/`: suíte local; `tests/integration/`: PostgreSQL descartável.

Versões fixadas: `@neondatabase/serverless` 1.2.0, `@neon/auth` 0.8.2 e `esbuild` 0.28.2. Não há React, Next.js, ORM ou Wrangler. Há build; não há lint nem análise de tipos configurados. Node ainda precisa de adaptação e prova de execução no Workers.

A interface usa Outfit e Source Sans 3 com fallback, abas navegáveis por teclado e movimentos que respeitam `prefers-reduced-motion`. Na gestão, logo à esquerda e conta/foto/nome à direita; a conta mantém layout próprio. Acessibilidade e celular do fluxo completo pertencem à validação da etapa 9.

## Validação e limites

Na inspeção documental de 6 de novembro de 2026, a base de 63 testes passou. Na etapa 6, foram acrescentados testes de leitura pública, campos permitidos, links, métodos, erros, escape e IDs legados. Evidências finais no [plano da etapa 6](docs/implementacao-etapa-6.md). Testes locais usam dados sintéticos e provedores/conexões simulados; não comprovam concorrência real no PostgreSQL.

Na entrega final da etapa 7, a suíte local passou com 87/87 testes, além de build e diff. Fluxo de envio/correção e avatar conferidos no Chrome em desktop e celular; revisão independente final sem bloqueadores de código. Ensaio SQL em PostgreSQL 18 isolado confirmou paginação, contagem, visibilidade e unicidade concorrente. Leitura autorizada em produção confirmou schema, constraints e execução da consulta; não havia projeto público ativo. A suíte completa via driver e escritas de aplicação continuam pendentes. Evidências e limites no [plano da etapa 7](docs/implementacao-etapa-7.md).

Comandos: `npm test`, `npm run build` e `npm run test:integration`. Integração exige desenvolvimento descartável, migrations 001/002, `VAULT_INTEGRATION_APPROVED=yes`, identidade esperada e autorização específica. Não executar contra produção. A suíte pode deixar registros sintéticos para inspeção.

Pendências: integração completa de persistência/importação e consultas públicas com PostgreSQL real, arquivamento concorrente e validação visual completa desse fluxo; logout/novo login/recuperação reais; fluxo completo de convite; Workers, e-mail de produção, limites operacionais e retenção. `tests/integration/public.test.cjs` prepara a validação SQL pública com dados sintéticos e rollback, ainda não executada. Revisões anteriores de autenticação e gestão estão no histórico; a revisão independente da etapa 6 está registrada no seu plano.

O adaptador Auth limita a espera a 15 segundos e a 16 chamadas simultâneas ao provedor. O SDK não encaminha AbortSignal ao fetch upstream: timeout não cancela a conexão, e o slot permanece ocupado até terminar. Compatibilidade com Workers não comprovada.

## Backup, recuperação e roteiro manual

Os registros anteriores documentam backups antes das migrations e restauração em PostgreSQL 18 local isolado, sem rede. Localizações privadas, hashes e evidências estão no [histórico](docs/historico-implementacao.md). Backups contêm dados sensíveis: não versionar ou publicar. Sua disponibilidade atual não foi revalidada.

Restaurar primeiro em destino separado e autorizado com pg_restore 18; conferir integridade, inventário e permissões gerenciadas do Neon. O ensaio da etapa 4 usou `--no-owner --no-acl`. Não substituir produção automaticamente. Retenção e procedimento final de operação/publicação continuam pendentes.

Em desenvolvimento isolado: login → convite → segunda conta/verificação/aceite → criação privada → responsável → visibilidade → auditoria → exclusão sem avaliações e arquivamento com avaliações sintéticas → logout e recusa da sessão anterior → recuperação. Conferir conflitos, fotos/fallback, teclado e celular. Importar duas vezes, conferir contagens/snapshots e rollback, preservando localStorage. O roteiro público depende das etapas 6 a 8.
