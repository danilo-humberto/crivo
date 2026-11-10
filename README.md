# Crivo

Publicado em **https://crivo.cifraengenharia.workers.dev** em 10/11/2026. Catálogo, conexão Neon e proteção das rotas conferidos na borda. Login com senha no novo domínio ainda não repetido. [Publicação e operação](docs/publicacao-cloudflare.md). Registros anteriores abaixo preservam o histórico de preparação.

Aplicativo em HTML, CSS e JavaScript com servidor Node, autenticação Neon Managed Better Auth e persistência PostgreSQL no Neon. A gestão inclui as funcionalidades da etapa 5; a etapa 6 acrescenta catálogo e páginas públicas de projetos, e a etapa 7 implementa avaliações públicas com fotos. A etapa 8 acrescenta indicadores nos cards e curadoria com auditoria, implementados localmente e aprovados para integração à main em 6 de novembro de 2026.

Estado consolidado em 6 de novembro de 2026 por inspeção do código, documentação e Git local. Etapas 6 e 7 integradas à main local nos commits `6136b34` e `628e303`; a etapa 8 consta na main local no commit `0820b84`, conferido no planejamento da etapa 9. A integração com PostgreSQL real continua pendente; o estado remoto não foi revalidado neste planejamento. A próxima etapa do plano é a 9, validação e preparação da publicação. As referências Git remotas foram conferidas para esta finalização; registros de banco/produção são históricos. Deploy não foi comprovado.

## Referências

- [Planejamento da etapa 9](docs/implementacao-etapa-9.md): plano aprovado, com validação local iniciada; [evidências e pendências](docs/validacao-etapa-9.md).

- [Plano aprovado e acompanhamento](docs/plano-avaliacoes.md): requisitos e pendências por etapa.
- [Arquitetura](docs/arquitetura-etapa-2.md): escolhas adotadas e validação pendente no Cloudflare.
- Planos de [persistência](docs/implementacao-etapa-3.md), [autenticação](docs/implementacao-etapa-4.md), [gestão](docs/implementacao-etapa-5.md) e [catálogo público](docs/implementacao-etapa-6.md).
- [Indicadores e curadoria](docs/implementacao-etapa-8.md): escopo, validações locais, prévia sintética e pendências de integração.
- [Avaliações e fotos](docs/implementacao-etapa-7.md): implementação, limites de proteção contra abuso e evidências locais.
- [Histórico](docs/historico-implementacao.md): evidências RED/GREEN, inspeções de navegador, revisões, migrations e recuperação anteriores. Estados intermediários desse histórico não substituem este README.

## Executar

Requer Node 22 ou posterior. Instale as versões do lockfile com `npm ci`. Configure o `.env` de desenvolvimento a partir de `.env.example` por mecanismo seguro e execute `npm start`: gera `dist/auth.js`, carrega o `.env` e inicia o servidor. O perfil local prevalece sobre variáveis herdadas do terminal e exige `VAULT_DB_ENV=development` e `VAULT_EXPECTED_HOST` igual ao hostname de `DATABASE_URL`. As demais CLIs não carregam `.env` automaticamente.

No modo padrão (`VAULT_MODE=managed`), abra http://localhost:4173. `APP_ORIGIN` deve coincidir com a origem usada e autorizada no Auth. O servidor escuta em `127.0.0.1:4173`; acessos às páginas de entrada/gestão por host diferente redirecionam para a origem configurada. Use HTTPS fora do desenvolvimento local. Sem configuração, a API protegida nega acesso.

- `/` e `/index.html` redirecionam para `/catalogo` no modo gerenciado.
- `/catalogo` e `/projetos/~:id` oferecem leitura pública, sem sessão. O prefixo `~` preserva IDs legados como `.` e `..`; o restante do ID é codificado para URL.
- `/auth` reúne entrada, cadastro, verificação, recuperação e convites. Após criar a conta, solicita automaticamente o código de verificação e reaproveita o e-mail; o usuário informa apenas o código. Falhas de envio preservam o cadastro e permitem reenviar. Sessões não verificadas recuperam o e-mail ao recarregar, sem disparar novos códigos automaticamente.
- `/management` exige sessão válida, e-mail verificado e usuário interno ativo.

Reinicie após mudanças no servidor/configuração e recarregue as abas após atualizar a interface. `node server.cjs` e `node server/server.cjs` iniciam sem gerar o bundle; prefira `npm start`.

## Ambientes Neon

Em 9 de novembro de 2026, o usuário confirmou que a branch Neon chamada production ainda não está em uso e autorizou usá-la para testes sintéticos. O .env local aponta novamente para essa branch, com VAULT_DB_ENV=development (classificação de uso), endpoint esperado e Auth existente. O nome da branch permanece production; não se trata de uma branch development isolada. Quando o sistema entrar em uso, interromper testes nesse destino e separar novamente os ambientes.

npm start carrega somente o .env local, prevalecendo sobre variáveis herdadas do terminal. .env.production permanece separado, marcado como produção e ignorado pelo Git; não é carregado automaticamente. Ambos os perfis referem-se agora à mesma branch. A conexão direta DATABASE_URL_UNPOOLED fica reservada a operações explicitamente autorizadas. node server.cjs mantém execução por variáveis injetadas.

A branch development criada por schema-only teve a habilitação do Auth bloqueada pelo Neon. Sua exclusão permanente foi confirmada pelo usuário e concluída; o painel passou a listar somente production. O perfil antigo e a definição do schema Auth foram preservados em imports/, fora do Git. Não usar esse perfil antigo para iniciar o aplicativo.

Validação atual: cinco testes de integração PostgreSQL/HTTP aprovados; catálogo e página Auth HTTP 200, gestão sem sessão redirecionando para /auth e consulta de sessão HTTP 200. Logout, recusa de acesso após saída, novo login e fluxo de cadastro/publicação/avaliação/curadoria foram conferidos no Chrome com dados sintéticos. Recuperação concluída pelo usuário e acesso posterior à gestão conferido em 9 de novembro de 2026. Convite com segunda conta continua pendente. O perfil local usa fotos em example.invalid para não consultar o servidor real durante testes. Migrations 001/002 presentes no destino atual; nenhuma migration foi aplicada nesta troca. Aceitar uma feature não aplica migrations automaticamente: SQL, destino, backup/recuperação e autorização específica continuam necessários.

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

A página individual permite avaliar sem login: nome (até 120 caracteres), CPF válido, nota inteira de 1 a 5 e comentário (até 2.000 caracteres). O formulário usa POST nativo, funciona sem JavaScript e redireciona após a gravação. Uma avaliação por CPF/projeto, sem edição; avaliações ocultas continuam ocupando essa combinação. A inserção reutiliza a transação, o bloqueio do projeto e a restrição UNIQUE existentes. Unicidade concorrente foi confirmada em ensaio SQL isolado; integração completa e concorrência via aplicação/driver permanecem pendentes.

`GET/HEAD /api/public/projects/~:id/reviews?page=1` retorna até 5 avaliações visíveis, `nextPage` e `formToken`. O POST nessa rota recebe JSON com nome (`name`), CPF (`cpf`), nota numérica (`rating`), comentário (`comment`) e `formToken`. Exige `Origin` correspondente a `APP_ORIGIN`. A listagem seleciona apenas nome, nota, comentário, data e identificador, além do CPF usado exclusivamente para montar `photoUrl`. Não retorna campo CPF separado. Projeto privado, arquivado ou ausente recebe 404; duplicidade recebe 409. Fotos são carregadas diretamente pelo navegador, sem proxy, e o avatar padrão permanece durante carregamento/falha ou sem JavaScript.

O token é assinado por processo, vinculado ao projeto, expira em uma hora e deixa de valer ao reiniciar o servidor; reabra a página nesses casos. Corpo limitado a 16 KiB, com dez segundos para leitura. Limite de dez tentativas por IP e 200 por processo a cada dez minutos, com 429 e `Retry-After`; inclui tentativas inválidas. Usa o IP do socket, sem confiar em `X-Forwarded-For`. Atrás de proxy os visitantes compartilham o limite do proxy; múltiplas instâncias têm limites e tokens independentes. Validar controle distribuído/na borda antes de publicar nessa arquitetura. Não é verificação de identidade nem proteção completa contra ataques distribuídos.

Somente páginas com formulário usam `Referrer-Policy: same-origin`, para preservar `Origin` no POST nativo; referências externas continuam omitidas e fotos usam `no-referrer`. Erros de validação preservam nome, nota e comentário, sem devolver o CPF digitado. Não há registros de corpo/CPF no servidor.

A prévia sintética também aceita avaliações em memória, perdidas ao encerrar; usa foto local inexistente para conferir o avatar sem acessar o servidor de fotos real. `VAULT_PREVIEW_PORT` permite escolher outra porta. Nunca informe dados pessoais reais na prévia.

Para testar a paginação com carga pronta, execute `node tests/fixtures/public-preview.cjs --seed-reviews`. O Portal de atendimento inicia com 12 avaliações fictícias: cinco na primeira página, cinco na segunda e duas na terceira. A carga é somente em memória, sem CPF e sem conexão ao banco; os demais projetos permanecem sem avaliações.

O título Avaliações mostra um badge com o total de avaliações visíveis. A navegação usa “← Voltar”, “Página X de Y” e “Próximo →”, desabilitando as extremidades. A API também retorna `total`, `totalPages` e `page`; contagem e registros usam a mesma consulta SQL e os mesmos filtros públicos. Páginas além do total retornam a última disponível. Comentários e estrelas individuais são exibidos na página. Os cards do catálogo mostram estrelas agregadas, média com uma casa decimal e quantidade de avaliações visíveis, com link para os comentários. Sem avaliações visíveis, exibem “Sem avaliações”. A API pública de projetos inclui `reviewCount` e `reviewAverage` (zero e null quando não há avaliações), calculados na mesma consulta SQL, sem persistir totais.

## Curadoria de avaliações

Na ficha interna de cada projeto, a seção Avaliações lista dez registros por página, incluindo ocultos. Qualquer usuário interno ativo pode Ocultar/Reexibir, sem justificativa; a confirmação aparece em toast dentro da ficha. O controle mantém foco e informa conflitos ou falhas, com ação para atualizar a lista. Projetos privados permitem curadoria; arquivados não são acessíveis pela ficha.

`GET /api/projects/~:id/reviews?page=1` retorna `items`, `total`, `totalPages` e `page`, sem CPF nem URL de foto. `POST /api/projects/~:id/reviews/~:reviewId` recebe os booleanos `visible` e `expectedVisible`; exige sessão interna, origem e CSRF existentes. Ambos os IDs são codificados para URL após o prefixo `~`. Estado desatualizado retorna 409; projeto/avaliação indisponível retorna 404. Repetição do estado atual não grava nova auditoria.

Visibilidade e auditoria são gravadas na mesma transação, com bloqueio da avaliação e do projeto contra arquivamento concorrente. Eventos `review_hidden`/`review_shown` registram autor da sessão e snapshots mínimos do projeto/avaliação, sem CPF ou foto; aparecem na aba Auditoria, filtros, detalhes e exportação. Ocultar preserva o registro e sua unicidade por CPF/projeto. Indicadores e comentários públicos refletem a mudança na próxima consulta, sem atualização automática de abas já abertas.

Prévia sem banco/Auth real: `node tests/fixtures/curation-preview.cjs --seed-reviews` e http://127.0.0.1:4188/management. Usa apenas dados sintéticos em memória e usuário interno simulado; `VAULT_PREVIEW_PORT` permite outra porta. Abra a ficha do Portal de atendimento, oculte/reexiba uma avaliação, confira Auditoria e recarregue o catálogo. A prévia cobre apenas leitura e curadoria, não cadastro/edição/exclusão de projetos; os dados desaparecem ao encerrar.

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

Versões fixadas: `@neondatabase/serverless` 1.2.0, `@neon/auth` 0.8.2 e `esbuild` 0.28.2. Wrangler 4.159.0 foi adicionado para Workers. Não há React, Next.js ou ORM. Há build; não há lint nem análise de tipos configurados. A adaptação passou no workerd local, com serviços externos simulados; publicação e conferência na borda ainda pendentes.

A interface usa Outfit e Source Sans 3 com fallback, abas navegáveis por teclado e movimentos que respeitam `prefers-reduced-motion`. Na gestão, logo à esquerda e conta/foto/nome à direita; a conta mantém layout próprio. Acessibilidade e celular do fluxo completo pertencem à validação da etapa 9.

## Validação e limites

[Acessibilidade da etapa 9](docs/acessibilidade-etapa-9.md): verificações parciais de teclado/reflow/contraste executadas no Chrome. Selo Planejado corrigido e revalidado (5,21:1 no projeto público); leitor de tela, zoom real e múltiplos navegadores pendentes.

Em 9 de novembro de 2026, as quatro suítes PostgreSQL existentes passaram pelo driver real no banco configurado, confirmado pelo usuário como fora de uso em produção e autorizado para testes. O `.env` foi ajustado para desenvolvimento; migrations 001/002 já estavam presentes. Não houve limpeza dos registros sintéticos. Pendências de integração citadas nos registros anteriores são históricas para esses cenários; concorrência HTTP/arquivamento, Auth real e demais validações da etapa 9 continuam abertas. [Evidências e limites](docs/validacao-etapa-9.md).

Na inspeção documental de 6 de novembro de 2026, a base de 63 testes passou. Na etapa 6, foram acrescentados testes de leitura pública, campos permitidos, links, métodos, erros, escape e IDs legados. Evidências finais no [plano da etapa 6](docs/implementacao-etapa-6.md). Testes locais usam dados sintéticos e provedores/conexões simulados; não comprovam concorrência real no PostgreSQL.

Na entrega final da etapa 7, a suíte local passou com 87/87 testes, além de build e diff. Fluxo de envio/correção e avatar conferidos no Chrome em desktop e celular; revisão independente final sem bloqueadores de código. Ensaio SQL em PostgreSQL 18 isolado confirmou paginação, contagem, visibilidade e unicidade concorrente. Leitura autorizada em produção confirmou schema, constraints e execução da consulta; não havia projeto público ativo. A suíte completa via driver e escritas de aplicação continuam pendentes. Evidências e limites no [plano da etapa 7](docs/implementacao-etapa-7.md).

Na etapa 8, `npm test` passou com 97/97 testes; build, sintaxe e diff aprovados. Chrome com dados sintéticos confirmou ocultação/reexibição, indicadores, comentários, paginação e auditoria, em desktop e viewport de 390 px; revisão independente sem bloqueadores. `tests/integration/curation.test.cjs` prepara testes reais de indicadores, auditoria, rollback, duplicidade e concorrência, mas não foi executado. Detalhes no [plano da etapa 8](docs/implementacao-etapa-8.md).

Comandos: `npm test`, `npm run build` e `npm run test:integration`. Integração exige desenvolvimento descartável, migrations 001/002, `VAULT_INTEGRATION_APPROVED=yes`, identidade esperada e autorização específica. Não executar contra produção. A suíte pode deixar registros sintéticos para inspeção.

Pendências: integração completa de persistência/importação e consultas públicas com PostgreSQL real, arquivamento concorrente e validação visual completa desse fluxo; logout/novo login/recuperação reais; fluxo completo de convite; Workers, e-mail de produção, limites operacionais e retenção. `tests/integration/public.test.cjs` prepara a validação SQL pública com dados sintéticos e rollback, ainda não executada. Revisões anteriores de autenticação e gestão estão no histórico; a revisão independente da etapa 6 está registrada no seu plano.

O adaptador Auth limita a espera a 15 segundos e a 16 chamadas simultâneas ao provedor. O SDK não encaminha AbortSignal ao fetch upstream: timeout não cancela a conexão, e o slot permanece ocupado até terminar. Compatibilidade com Workers não comprovada.

## Backup, recuperação e roteiro manual

Os registros anteriores documentam backups antes das migrations e restauração em PostgreSQL 18 local isolado, sem rede. Localizações privadas, hashes e evidências estão no [histórico](docs/historico-implementacao.md). Backups contêm dados sensíveis: não versionar ou publicar. Sua disponibilidade atual não foi revalidada.

Restaurar primeiro em destino separado e autorizado com pg_restore 18; conferir integridade, inventário e permissões gerenciadas do Neon. O ensaio da etapa 4 usou `--no-owner --no-acl`. Não substituir produção automaticamente. Retenção e procedimento final de operação/publicação continuam pendentes.

Em desenvolvimento isolado: login → convite → segunda conta/verificação/aceite → criação privada → responsável → visibilidade → auditoria → exclusão sem avaliações e arquivamento com avaliações sintéticas → logout e recusa da sessão anterior → recuperação. Conferir conflitos, fotos/fallback, teclado e celular. Importar duas vezes, conferir contagens/snapshots e rollback, preservando localStorage. No fluxo público: catálogo → projeto → avaliação sintética → ocultar/reexibir na gestão → recarregar comentários/indicadores e conferir auditoria. As etapas 6 a 8 estão implementadas; a integração completa permanece pendente.


Atualização de 9/11/2026: segunda conta verificou o e-mail, recebeu acesso pelo convite autorizado e abriu a gestão. Bloqueio anterior ao aceite e recusa de novo aceite pela mesma conta conferidos. Validação de autoria por escrita nessa conta não executada. Ver [registro da etapa 9](docs/validacao-etapa-9.md).


Atualização de 9/11/2026: autoria pela segunda conta comprovada na auditoria, com responsável preservado. Revisão independente identificou falha parcial de cadastro, corrigida e reavaliada; 105/105 testes locais e build aprovados. Prova Workers mantida pendente por decisão do usuário, sem instalar Wrangler. Publicação ainda não preparada; detalhes e limites no registro de validação da etapa 9.


Repetição do fluxo básico em 9/11/2026: projeto fictício novo criado privado, editado/publicado, avaliado, ocultado e reexibido; busca, indicador público, bloqueio de duplicidade mesmo oculta e autoria na auditoria conferidos no navegador. Sem defeito funcional observado nesse recorte; detalhes no registro de validação da etapa 9.


Atualização de 9/11/2026: confirmação de remoção agora usa modal personalizado do Vault (Cancelar como foco inicial). Arquivamento preservou avaliação e cinco eventos; exclusão de projeto sintético sem avaliações preservou snapshot completo na auditoria. 107/107 testes locais, build e revisão independente aprovados no recorte. Workers permanece pendente. Consulte o registro de validação da etapa 9.


## Cloudflare Workers — preparação local em 9/11/2026

Adaptação autorizada implementada em `workers/`, compartilhando handlers Node e allowlist de assets. `npm run test:worker` executa quatro cenários locais com dados e serviços simulados; `npm run check:worker` empacota sem publicar. Limites de avaliações coordenados por Durable Object; assinatura estável e pool por requisição. 111/111 testes Node e 4/4 Workers aprovados. [Configuração, publicação e recuperação](docs/publicacao-cloudflare.md). Nenhum deploy ou alteração remota de infraestrutura nesta rodada.

A limpeza foi executada pelo responsável e conferida em 9/11/2026: zero projetos, avaliações, auditoria, alternativas, convites e importações; somente a conta principal no Auth e seu usuário interno ativo permanecem, além das duas migrations. Os relatos anteriores de registros sintéticos são históricos. Banco limpo não foi usado nos novos testes Workers.


## Nome Crivo e favicon — 10/11/2026

Renomeação solicitada pelo usuário implementada localmente: Crivo nos títulos, cabeçalhos, rodapés, mensagens, nomes dos downloads e metadados npm. Favicon SVG com C branco sobre azul incluído nas páginas de gestão, conta, catálogo e projeto e na allowlist compartilhada com Workers. Identificadores técnicos legados (schema, variáveis, cookies, armazenamento e módulos) e endereço publicado permanecem para preservar compatibilidade.

Validação: `npm test` (111/111), `npm run build:worker` e verificação HTTP local com dados sintéticos das quatro páginas, GET/HEAD do favicon e presença no pacote Worker aprovados. `git diff --check` sem erros. Alteração de identidade visual e texto, sem ciclo TDD; asserção existente do título atualizada. Sem revisão independente ou inspeção visual no navegador nesta rodada. Para conferir manualmente, executar `npm start` no ambiente de desenvolvimento autorizado e verificar nome e ícone da aba no catálogo, projeto, conta e gestão. Nenhum commit, push ou deploy desta alteração executado.


Atualização de 10/11/2026: Crivo e favicon publicados no novo endereço, domínio incluído no Neon Auth e versão a0254513-6187-4f32-a331-6a5ff868491d ativa. Quatro testes Workers e verificações HTTP reais aprovados. Login com senha no novo domínio ainda não repetido. Endereço vault-ti preservado, sem redirecionamento. Sem commit ou push adicional. [Registro da mudança](docs/publicacao-cloudflare.md#publicação-do-crivo--10112026).


Atualização — 10/11/2026: endereço vault-ti agora redireciona automaticamente para crivo.cifraengenharia.workers.dev com HTTP 308, preservando caminho e parâmetros. Deploy 1c8464cf-0c76-452a-af8c-17d979ee8984 confirmado; 12 verificações locais, seis URLs remotas e chegada ao catálogo com 200 aprovadas. Substitui os registros anteriores de ausência de redirecionamento. Detalhes em [publicação](docs/publicacao-cloudflare.md). Nenhum commit ou push.
