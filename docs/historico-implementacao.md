# Histórico de implementação e validação

Registro preservado da documentação acumulada até 4 de novembro de 2026. **Não é um guia do estado atual.** As seções representam momentos sucessivos: situações como ausência de autenticação, migrations não aplicadas e falta de Git foram superadas por registros posteriores. Contagens e comandos de testes são históricos.

Consulte o [README](../README.md) para funcionamento atual e o [plano](plano-avaliacoes.md) para acompanhamento. Autorizações históricas não autorizam novas operações. Backups e recibos privados não foram abertos nesta consolidação.
# Registro anterior do README

Aplicativo em HTML, CSS e JavaScript, com servidor Node. A etapa 4 preparou autenticação Neon e gestão pela API; ativação e validação integrada ainda dependem de desenvolvimento isolado. O modo legado com localStorage continua disponível explicitamente. Os seis exemplos iniciais, concorrentes e custos são fictícios. As seções históricas abaixo descrevem as etapas anteriores; a configuração atual está na seção da etapa 4.

## Executar

Na pasta do projeto: `npm ci` e `npm start` (gera o bundle de autenticação). Abra http://127.0.0.1:4173. O modo padrão exige configuração de Auth e banco; sem ela, a API recusa acesso. Para continuar usando somente o acervo legado no navegador, configure `VAULT_MODE=local` no processo, fora de produção. Preserve o mesmo endereço e navegador. Recarregue abas antigas e encerre com Ctrl+C. Os comandos não carregam `.env` automaticamente.

## Projetos

Cadastro, edição e exclusão com confirmação; propósito, solução, link, responsável, área, status e datas; alternativas com custos mensais e observações. Busca, filtros e ordenação. Economia potencial calculada contra a alternativa de menor custo, somando apenas projetos concluídos e excluindo desenvolvimento e implantação.

## Auditoria

- Header com logo centralizada e tabs Projetos / Auditoria ocupando toda a largura, sem fundo e com underline ativo.
- Navegação das tabs com setas, Home e End; painéis ocultos saem da navegação por teclado.
- Registro automático de criação, edição e exclusão, com data/hora e snapshots completos antes/depois, inclusive alternativas. Salvar sem mudança não gera evento.
- Primeira abertura da nova versão cria registros iniciais para os projetos existentes. Não recupera alterações anteriores nem trata a data de migração como criação dos projetos.
- Busca por nomes atuais/anteriores e responsável; filtro por ação; 30 registros por página com carregar mais.
- Comparação completa com destaque textual dos campos alterados. Downloads JSON da versão anterior, registrada ou histórico completo com projetos atuais. Consulta e download, sem restauração automática nesta versão.
- Autor da ação é Não identificado: responsável pelo projeto não equivale ao usuário que editou. Não há autenticação.

### Persistência e migração

`src/infrastructure/local-storage.js` armazena `{version: 2, projects, audit}` em `vault-ti.state.v2`. As regras de auditoria estão em `src/domain/audit.js`. Uma única chamada de setItem grava projeto e histórico juntos. A chave legada `vault-ti.projects.v1` é lida na migração e preservada, mas deixa de receber atualizações. Estado v2 inválido não é sobrescrito nem substituído pelo v1 silenciosamente.

Falhas de gravação preservam o estado salvo e mantêm o formulário aberto. Uma comparação com a versão lida ao abrir a ficha impede sobrescrever mudanças de outra aba. Web Locks serializa gravações em navegadores compatíveis; sem Web Locks permanece a detecção de versão, com limitação para escritas exatamente simultâneas. Eventos storage atualizam as outras abas; fichas abertas exigem reabertura quando os dados mudam.

O histórico não é criptografado nem inviolável: quem tem acesso ao navegador pode alterá-lo. Limpar o armazenamento remove projetos e histórico. Baixe uma cópia para reserva externa. O crescimento do histórico consome a cota do LocalStorage; ao atingir o limite a gravação falha sem remover registros antigos.

## Design

Outfit e Source Sans 3, com fallback local. Papel frio #F0F2F6, branco #FFFFFF, tinta #243052, azul #3549B8, lavanda #E3E6FA e verde #376B59. Fichas com abas por área e indicadores brancos com ícones SVG. As fontes Google são opcionais. Movimentos de diálogos e notificações respeitam prefers-reduced-motion, com alternativa para fechamento sem suporte à transição de overlay/display.

## Validação da auditoria

- RED: `node --test audit.test.cjs` falhou inicialmente por ausência do módulo audit.js.
- GREEN: `node --test core.test.cjs audit.test.cjs`: 14 testes aprovados. Cobrem migração, snapshots com alternativas, criação/exclusão, edição sem mudança, erro de cota, versão desatualizada e dados inválidos, além das regras existentes.
- Sintaxe: `node --check app.js`, `node --check audit.js`, `node --check server.cjs` aprovados.
- Navegador, em origem isolada http://localhost:4173: alteração de custo de 150 para 175, comparação antes/depois, recarga, filtro por alterações, troca de tabs por seta, Escape e download completo (6 projetos, 7 registros, valores anterior/posterior conferidos).
- Origem principal: migração e layout conferidos, sem editar projetos. Viewport 390 px sem transbordamento horizontal.
- Criação/exclusão e falhas de armazenamento foram testadas no módulo, não repetidas pela interface. Não houve revisão independente nem commit.

Roteiro manual: editar um projeto; consultar Auditoria e abrir o registro; baixar versão anterior; recarregar e conferir persistência. Para conflito entre abas, abrir uma edição em ambas, salvar numa aba e tentar salvar a outra: deve recusar a versão desatualizada. Os testes usam dados sintéticos, sem acesso a serviços externos ou produção.

## Exemplos na auditoria

Dois registros fictícios são acrescentados uma única vez ao histórico local, com IDs fixos e `demo: true`: edição da integração de notas fiscais (solução, status, conclusão e custo de R$ 180 para R$ 90) e exclusão do controle de salas legado (snapshot anterior completo). Não alteram projetos do acervo. São rotulados como exemplos na lista e nos detalhes e acompanham o download do histórico. O teste novo falhou antes de addExamples existir e passou após a implementação. Total: 15 testes aprovados; sintaxe de app.js e presença dos dois registros verificadas no navegador.

## Organização das pastas

- src/domain/core.js: validações de projetos, busca e cálculo de economia.
- src/domain/audit.js: validações do histórico, comparação e geração do próximo estado, sem acesso ao armazenamento ou DOM.
- src/infrastructure/local-storage.js: leitura, migração, gravação e detecção de conflitos no armazenamento local.
- src/web/pages/index.html: página atual.
- src/web/scripts/app.js: apresentação, formulários, eventos e coordenação da interface.
- src/web/styles/: estilos e movimentos existentes.
- server/server.cjs: servidor e lista explícita de recursos disponíveis por HTTP.
- tests/: testes de regras, persistência e integração HTTP.
- docs/plano-avaliacoes.md: escopo aprovado das próximas etapas.

O comando de inicialização continua sendo `node server.cjs`; o arquivo na raiz apenas inicia o servidor. Também é possível usar `node server/server.cjs`. Reinicie o servidor após atualizar os arquivos e recarregue as abas. O endereço principal continua http://127.0.0.1:4173; os endereços dos recursos existentes e as chaves de armazenamento foram preservados.

Execute a suíte atual com `node --test tests/*.test.cjs`. Os comandos citados nas seções históricas acima correspondem à estrutura anterior. Não há lint, build ou análise de tipos configurados, nem dependências adicionadas nesta etapa.

### Validação da etapa 1 em 4 de novembro de 2026

Antes da reorganização, os 15 testes existentes passaram. Depois, os mesmos 15 testes passaram, com apenas os imports adaptados. O teste adicional de integração verifica página, recursos, tipos de conteúdo, ordem dos módulos no contexto de navegador e recusa de arquivos internos: total de 16 testes aprovados. A sintaxe de todos os arquivos JavaScript e CommonJS de src, server e tests, além do inicializador na raiz, foi verificada com node --check.

Esta etapa é uma refatoração com preservação de comportamento: foi utilizada a suíte de regressão antes/depois, sem fabricar um ciclo RED para funcionalidades que não mudaram. O teste de integração foi acrescentado após a reorganização. CSS e core.js foram comparados byte a byte com a cópia anterior e permaneceram idênticos.

No Chrome, em origem isolada http://127.0.0.1:4187, foram conferidos os seis projetos fictícios, abertura e fechamento da ficha e a aba Auditoria com oito registros. Criação, edição, exclusão e conflito entre abas são cobertos pelos testes de módulos, mas não foram repetidos pela interface nesta etapa. Não foi feita nova verificação mobile ou revisão independente. Não houve commit; a pasta ainda não possui repositório Git.

Roteiro manual complementar: iniciar o servidor, conferir projetos existentes no endereço habitual, criar um projeto sintético, editar, consultar auditoria, recarregar e conferir persistência; abrir a mesma ficha em duas abas e verificar a recusa da segunda gravação desatualizada. Excluir somente o projeto sintético ao terminar.

## Etapa 3: implementação local preparada

Git inicializado na branch `etapa-3-persistencia`, sem commit. A autorização de 4 de novembro de 2026 incluiu o modelo, migrations locais e instalação de `@neondatabase/serverless`, fixado em 1.2.0 no package.json e lockfile. Node 22 ou posterior é necessário para os comandos novos; o ambiente utilizado foi Node 24.22.0.

A interface continua usando localStorage e o servidor HTTP não ganhou endpoints de dados. A integração da interface depende da autenticação da etapa 4. Após autorização explícita, a migration 001 foi aplicada à branch `production` do projeto `vault`, banco `neondb`. Nenhuma importação de dados do navegador foi executada.

- `server/migrations/001-persistence.sql`: usuários internos, projetos, alternativas, avaliações, auditoria, registro de importações e versão da migration. Inclui unicidade por projeto/CPF e referências sem cascata de exclusão.
- `server/persistence/`: conexão Neon, transações, leitura/gravação de projetos com versão esperada, importação e inserção de avaliações. É uma biblioteca interna; não oferece autenticação e não deve ser exposta diretamente por HTTP.
- `server/import-cli.cjs`: prévia sem conexão por padrão; aplicação depende de opção explícita, variáveis de ambiente e autorização operacional.
- `tests/integration/persistence.test.cjs`: teste preparado para banco descartável, ainda não executado.

O driver usa Pool/WebSocket porque as operações precisam ler resultados intermediários dentro da transação, conforme a [documentação oficial](https://neon.com/docs/serverless/serverless-driver). A compatibilidade no runtime Workers continua pendente. Não foram adicionados Wrangler, ORM ou SDK de autenticação.

### Prévia e importação

Após `npm ci`, coloque uma exportação autorizada na pasta ignorada `imports/`. Não versionar dados reais. Execute `npm run import:preview -- imports/exportacao.json origem-estavel keep`. O comando apresenta apenas contagens e não conecta ao banco. `keep` mantém todos os exemplos; para removê-los, use `exclude` e repita `--exclude-project=ID` para cada projeto explicitamente escolhido. `exclude` também remove eventos com `demo: true`. Excluir um projeto da importação exclui também seus eventos, sem alterar o arquivo original.

A origem deve permanecer igual para a mesma coleção exportada. Repetição idêntica retorna o resultado anterior; conteúdo diferente para a mesma origem exige reconciliação, sem sobrescrita. IDs em conflito com outras origens interrompem toda a transação. A data externa `exportedAt` não altera o digest. Nomes antigos permanecem em `owner_legacy`, sem associação automática a contas. Snapshots e evento legado completo são preservados.

A aplicação usa o mesmo comando com `--apply` após autorização específica. Configure por mecanismo seguro as variáveis listadas em `.env.example`; o comando não carrega arquivos `.env` automaticamente. `VAULT_DB_ENV=development`, `VAULT_IMPORT_APPROVED=yes` e os nomes esperados de banco e papel são verificações adicionais, não uma prova de isolamento nem substituto da autorização. Nunca colocar a conexão em argumentos ou logs. Não há comando automático de migration: o SQL deve ser revisado e aplicado uma única vez ao ambiente autorizado, usando conexão direta e permissões apropriadas.

### Evidências e pendências

RED: `node --test tests/import.test.cjs tests/persistence.test.cjs` falhou por ausência dos módulos novos. GREEN: `npm test` passou com 31 testes (16 anteriores e 15 novos). `node --check` passou nos arquivos JS/CJS de src, server, tests e no inicializador. A instalação reportou zero vulnerabilidades na auditoria npm naquele momento. Não há lint nem análise de tipos configurados.

Os testes unitários verificam CPF sintético, validação de avaliações, prévia, digest, exemplos, preservação de eventos e comandos de commit/rollback. Os testes do repositório usam conexões simuladas: não comprovam execução do SQL, isolamento transacional ou concorrência no Postgres. O teste HTTP também confirma que arquivos de persistência, migrations, configuração e lockfile não são servidos.

Pendente: executar `npm run test:integration` em Neon de desenvolvimento isolado, com a migration aplicada, `VAULT_INTEGRATION_APPROVED=yes`, identidade esperada e permissões confirmadas. Esse teste grava apenas dados sintéticos com IDs únicos e os mantém para inspeção; exige banco descartável e não limpa recursos automaticamente. Verifica importação simultânea, leitura em nova conexão, rollback, conflitos de versão, snapshots, unicidade concorrente, avaliação oculta e impedimento de exclusão com dependências. Não executar contra produção. Revisão independente permanece pendente.

Roteiro manual pendente, exclusivamente em desenvolvimento: conferir a prévia de um arquivo sintético, importar duas vezes e comparar contagens, consultar snapshots e provocar erro de importação para verificar rollback. Não limpar localStorage. Os critérios completos de persistência e importação da etapa 3 ainda dependem do teste de integração.

### Aplicação autorizada em produção em 4 de novembro de 2026

O usuário confirmou `production`, autorizou explicitamente a aplicação pelo agente e decidiu manter CPF obrigatório também em `vault.internal_users`. O teste de integração foi ajustado para fornecer CPF sintético ao criar seu usuário.

Antes da aplicação, a migration foi executada em PostgreSQL 18 local isolado, sem rede e com dados sintéticos. Foram conferidos rejeição de usuário sem CPF, preservação de zero inicial e bloqueio de avaliação duplicada mesmo após ocultação. Um backup prévio em formato custom do pg_dump 18 foi salvo em `imports/backup-1793800540047/before-migration.dump` (pasta ignorada pelo Git) e restaurado com sucesso em um banco local isolado, recuperando as nove tabelas existentes. O ensaio de recuperação não executou testes funcionais sobre dados de produção; o ambiente temporário foi encerrado e removido.

A migration foi aplicada por conexão direta, em uma transação com limites de espera e execução. Conferência pós-commit: oito tabelas em `vault`, versão 1 registrada, CPF obrigatório em `internal_users` e nove tabelas de autenticação preservadas. Nenhum teste funcional, cadastro sintético ou importação foi executado em produção. O `.env` continua identificado como `production`, com importação e integração desabilitadas.

Hash SHA-256 da migration aplicada: `ed919a4860dfb870780f6042b462ebea2ee796997ed37af2a58e933840326179`. Manifesto do backup e recibo da aplicação ficam no mesmo diretório privado do backup. O backup contém dados sensíveis de autenticação; não versionar, compartilhar ou imprimir seu conteúdo. Recuperação: restaurar primeiro em destino separado e autorizado com pg_restore 18, conferir integridade e tratar propriedade/permissões gerenciadas do Neon antes de qualquer recuperação de produção. Não apagar schema nem substituir dados de produção automaticamente.

## Etapa 4: autenticação local preparada

**Atualização operacional de 4 de novembro de 2026:** posteriormente, o usuário autorizou especificamente testar no banco de produção e aplicar a migration 002/configurar a integração Auth. Essa exceção vale para os testes controlados desta etapa, não para executar indiscriminadamente a suíte de desenvolvimento em produção. A migration foi aplicada; detalhes abaixo. O fluxo completo de conta ainda depende da criação da senha e verificação pelo usuário.

Implementação autorizada em 4 de novembro de 2026. Inclui login, cadastro, verificação por código, logout, recuperação de senha, convites de 48 horas e gestão pela API. Convites não têm destinatário fixo e só o emissor pode revogar os próprios convites não consumidos. Cadastro no provedor não concede acesso à gestão. O ambiente isolado será preparado em uma próxima etapa, por decisão do usuário; esta entrega ainda não valida a integração real.

### Arquivos e funcionamento

- `server/auth/`: adaptador do SDK, validação de sessão/e-mail/acesso ativo, repositório transacional de convites e provisionamento inicial. A sessão é consultada no provedor sem cache a cada operação protegida. API usa origem explícita e token CSRF; autoria vem da sessão validada.
- `server/migrations/002-invitations.sql`: migration aditiva preparada, **não aplicada**. Token aleatório só aparece no link recém-gerado; o banco guarda seu hash. Aceite e criação do usuário são atômicos, com verificação de expiração após adquirir os bloqueios.
- `src/web/pages/auth.html`, `src/web/scripts/auth.js` e `src/web/styles/auth.css`: formulários e gerenciamento dos próprios convites. O link usa fragmento, removido da barra após leitura; recarregar antes de aceitar exige reabrir o convite original.
- `src/infrastructure/remote-storage.js`, `src/web/scripts/app.js` e `server/persistence/repository.cjs`: gestão remota com versão esperada, auditoria e exclusão transacional. Não há importação automática ou fallback para dados locais. Projetos com avaliações recusam exclusão até o arquivamento da etapa 5. A seleção de responsável permanece na etapa 5; a API já oferece a lista mínima de usuários ativos.
- Dependências aprovadas: `@neon/auth` 0.8.2 e `esbuild` 0.28.2, com lockfile. `npm run build` gera `dist/auth.js`, ignorado no Git. Não foram instalados React ou Next.js.

### Configuração e primeiro usuário

Configure as variáveis de `.env.example` por mecanismo seguro. `npm start` gera o bundle e inicia o servidor, sem carregar `.env` automaticamente. `APP_ORIGIN` deve corresponder à origem usada no navegador; use HTTPS fora do desenvolvimento local e cadastre a origem permitida no Auth. `NEON_AUTH_BASE_URL` deve pertencer ao mesmo ambiente isolado do banco. O segredo de cookies precisa ter pelo menos 32 caracteres aleatórios. Sem configuração, a API nega acesso; `/auth` continua disponível.

Após autorização do destino, aplicar as migrations necessárias e conferir banco, papel e permissões. Para o primeiro usuário: criar a conta no Auth, verificar o e-mail e executar `node server/bootstrap-cli.cjs` com `VAULT_BOOTSTRAP_APPROVED=yes`, identidade esperada de banco/papel e entrada JSON privada via stdin. Campos da entrada: `subject`, `email`, `name`, `cpf` e `sessionCookie` (cabeçalho Cookie da sessão verificada). Não passar esses valores em argumentos, logs ou chat. O comando confirma a identidade no provedor, verifica permissões e recusa provisionamento se já existir usuário interno. O comando foi preparado, mas não executado. Não há endpoint público de bootstrap.

O modo legado exige `VAULT_MODE=local` e é recusado pelo inicializador quando `VAULT_DB_ENV=production`. Ele preserva o acervo no navegador e não representa uma sessão autenticada nem sincroniza com o banco. A migration 001 e o localStorage não foram alterados.

### Validação e limites

- Base anterior: `npm test`, 31 testes aprovados. RED: os testes de política falharam por módulo ausente e o teste HTTP encontrou 404 em vez de 401. GREEN: `npm test`, 43 testes aprovados, com políticas, HTTP, adaptador real do SDK com fetch simulado, transações simuladas e transporte remoto.
- `npm run build`, `node --check` em JS/CJS de src/server/tests e `git diff --check` aprovados. Não há lint ou análise de tipos configurados. A instalação reportou zero vulnerabilidades naquele momento.
- Revisão independente encontrou timeout ineficaz, recuperação mascarando 429/5xx e rotação CSRF causando conflito entre abas. Correções reavaliadas: espera limitada incluindo corpo da resposta, teto de 16 chamadas ao provedor, falhas operacionais explícitas e reutilização do cookie CSRF. A revisão também corrigiu a conferência de permissões SQL para exigir cada privilégio com AND.
- Limite do SDK: não encaminha AbortSignal ao fetch upstream. O adaptador devolve erro após 15 segundos e conserva o slot até a chamada terminar; não promete cancelamento da conexão. O toolkit de servidor é beta, com versão fixada. Compatibilidade Workers permanece pendente.
- Chrome em origem isolada: formulário, mensagem de Auth indisponível, mostrar/ocultar senha e Tab até Entrar conferidos. Viewport configurada em 390 px, área útil de 375 px, sem transbordamento horizontal. Nenhuma credencial real foi digitada e nenhum e-mail foi enviado.
- `npm run test:integration` **não executado**. O novo `tests/integration/auth.test.cjs` exige desenvolvimento descartável, migrations 001/002 e autorização operacional. Prepara verificações de concorrência, rollback, expiração, revogação e nova conexão; os testes locais não comprovam comportamento real do Postgres.

Roteiro pendente em desenvolvimento: provisionar primeiro usuário → login → gerar/copiar convite → segunda conta verificar e-mail e aceitar → cadastrar/editar/excluir projeto sintético → conferir autoria e versão → logout → confirmar API recusando a sessão anterior → recuperar senha → testar convite expirado/revogado e aceite simultâneo. Conferir também login, recarga e callbacks com cookies reais. Nenhum acesso a produção, importação, migration remota, commit ou deploy foi feito nesta etapa.

### Etapa 4: aplicação autorizada e testes controlados em produção

Destino conferido: projeto `vault`, branch `production`, banco `neondb`, papel `neondb_owner`. Antes da alteração, um novo backup pg_dump 18 foi restaurado com sucesso em PostgreSQL 18 local com rede desabilitada, recuperando 17 tabelas. A migration 002 foi validada em outro banco local vazio com dados sintéticos. O container temporário foi encerrado e removido; o backup foi preservado em `imports/step4-1793810770410/before-migration.dump`, junto de manifesto, recibo e relatório dos testes. Esses arquivos e `.env` estão ignorados no Git. O backup contém dados de autenticação e não deve ser publicado.

Aplicação por conexão direta, em transação com lock_timeout de 5 segundos e statement_timeout de 30 segundos: tabela `vault.invitations` criada e versão 2 registrada. As nove tabelas de `neon_auth` foram preservadas. SHA-256 da migration: `848a520ea8f59433cff5d87538bcaab7b7edc87cf85627936ebacee2d66c0b11`. Recuperação: restaurar primeiro em destino separado e autorizado, usando pg_restore 18 com --no-owner --no-acl; conferir inventário antes de qualquer intervenção em produção. Não aplicar automaticamente um backup sobre o banco atual.

Neon Auth já estava habilitado. Sua URL foi conferida no console da branch e gravada no `.env`, junto de segredo de cookies aleatório, origem local e modo managed; nenhuma credencial foi impressa. Não foram alterados SMTP, domínios ou permissões remotas do provedor.

Dez verificações passaram no banco autorizado: aceite único sob concorrência; rollback do aceite perdedor; recusa de reutilização; expiração sem criação de usuário; revogação; revogação restrita ao emissor; conflito de versão de projeto; autoria transacional na auditoria; exclusão com histórico; recusa de emissor inativo. Foram usados IDs exclusivos por execução e identidades externas sintéticas sem vínculo com contas reais. Ao final, somente os registros criados por essa execução foram removidos; a ausência dos usuários sintéticos foi conferida. A suíte `test:integration` permaneceu bloqueada para produção; não se falsificou o ambiente como development.

Com o servidor configurado, `/api/auth/get-session` respondeu 200, `/api/projects` sem sessão respondeu 401 e `/auth` respondeu 200. O usuário autorizou enviar verificação e recuperação para um endereço sob seu controle. O formulário de cadastro foi aberto e preenchido com nome/e-mail; a senha deve ser definida e enviada pelo próprio usuário. Cadastro, verificação, login, logout, recuperação e provisionamento do primeiro usuário ainda não foram concluídos. Nenhum e-mail foi enviado pelo agente até este registro. Não houve commit ou deploy.

### Correção do cadastro local

A tentativa inicial falhou porque o Neon recusou o callback com 127.0.0.1 (`INVALID_CALLBACK_URL`). Uma solicitação sintética com senha deliberadamente curta confirmou que localhost passa pela validação de origem (`PASSWORD_TOO_SHORT`), sem criar conta. A origem configurada passou a http://localhost:4173; acessos HTML pelo endereço antigo redirecionam para a origem configurada. O localStorage legado não foi movido e continua no endereço original em modo local.

A API passou a devolver erro de configuração legível, sem detalhes privados do provedor; a mensagem do formulário recebe foco para ficar visível. RED: o novo teste esperava 503 e recebeu 400. GREEN: 44 testes aprovados, build e sintaxe conferidos. Servidor reiniciado; redirecionamento 302 e consulta de sessão 200 verificados. Cadastro real ainda aguarda nova tentativa do usuário no endereço correto. Nenhuma senha foi lida pelo agente.

Verificação por código: a conta foi criada e a sessão persistiu após recarga. Após uma tentativa recusada, uma consulta somente de metadados confirmou e-mail ainda não verificado e ausência de registro OTP ativo; o motivo exato da tentativa anterior não foi registrado. Nova solicitação autorizada retornou sucesso e um registro não expirado foi confirmado, sem ler seu valor. A API agora traduz apenas os códigos públicos OTP_EXPIRED, INVALID_OTP e TOO_MANY_ATTEMPTS em mensagens específicas e remove espaços externos do código. RED/GREEN do tratamento de erros executado; 45 testes aprovados e sintaxe conferida. A confirmação final segue dependendo do código inserido pelo usuário.

Confirmação posterior: a interface exibiu E-mail verificado e a consulta de metadados confirmou emailVerified=true para a conta autorizada, sem ler senha ou código. Ainda existem zero usuários internos; a API recusou acesso à gestão como esperado. O primeiro provisionamento depende de autorização específica da conta e fornecimento seguro do CPF obrigatório.

Primeiro usuário provisionado após autorização específica: o usuário informou o CPF diretamente no formulário local. O processo administrativo conferiu a identidade verificada no Neon Auth, bloqueou a tabela contra provisionamento concorrente e gravou uma conta interna ativa. Recibo privado sem CPF confirmado; consulta posterior encontrou um usuário interno ativo. A interface reconheceu o acesso e carregou /management com zero projetos, sem importar o acervo local. Foi corrigido o rótulo residual Salvo neste navegador para Salvo no servidor na gestão autenticada. Recuperação completa de senha, logout e novo login ainda precisam da validação final com participação do usuário.

### Interface de conta e perfil

Acesso, cadastro, verificação, recuperação e convites compartilham layout responsivo. Conta e gestão exibem nome e foto circular abaixo da logo. A URL usa o CPF salvo e EMPLOYEE_PHOTO_BASE_URL (padrão HTTPS https://intranet-cifra.netlify.app/funcionarios/{cpf}.jpeg). CPF não sai como campo separado; a URL contém o identificador conforme solicitado. Não há cópia local da foto. Iniciais permanecem durante carregamento, ausência ou falha.

Validação deste incremento: dois testes de composição/fallback falharam antes da implementação (RED); após a implementação, testes do perfil e fallback DOM passaram. Revisão independente corrigiu especificidade CSS do link de gestão oculto. Inspeção no Chrome confirmou foto real em conta e gestão e layout de conta a 390px. Cadastro inspecionado em servidor isolado com provedor simulado; nenhuma conta criada nesse teste. Logout, novo login e recuperação reais continuam pendentes da etapa 4.

Roteiro manual: abrir /auth autenticado; conferir nome/foto e abrir gestão; em conta sem foto, conferir iniciais; verificar cadastro, código e recuperação em celular e por teclado. O padrão de foto exige HTTPS e marcador {cpf}; configuração inválida mantém o fallback.
`npm test`: 48/48 aprovados; `npm run build`, `node --check` nos scripts alterados e `git diff --check` aprovados. Prévia isolada de redefinição também conferida a 390px, sem envio de senha.

Ajuste de navegação do acesso: quatro abas (Entrar, Criar Conta, Esqueci minha senha e Verificar e-mail), com setas, Home/End e um painel visível por vez. Painel com largura máxima de 1080px, centralizado verticalmente quando cabe na tela. Validado por clique/teclado com provedor simulado, em 1575×900 e 390×844; 48 testes e build aprovados. Mudança visual sem alteração dos contratos de autenticação.
A verificação agora usa um único campo de e-mail no mesmo formulário do código; enviar código valida apenas o e-mail, e confirmar valida ambos. Fundo das abas desliza no hover/foco/seleção, com fallback de posição por JavaScript e movimento desativado quando solicitado pelo sistema. Validação em provedor simulado confirmou os dois envios com o mesmo endereço sintético, sem e-mails reais; 48 testes e build aprovados.
O sublinhado das abas agora é um indicador único que desliza até a seleção em 300ms, independente do fundo de hover. Respeita movimento reduzido. Build e sintaxe aprovados; movimento e destino conferidos no Chrome com provedor simulado.
Header da gestão atualizado: logo à esquerda; à direita, link de conta antes da foto e nome em linha. Em telas pequenas, o grupo pode quebrar abaixo da logo. A faixa de contexto e status acima do título foi removida da gestão. Conferido no Chrome em desktop e 390px; 48 testes aprovados.
Abas Projetos/Auditoria: sublinhado único com deslocamento de 300ms e movimento reduzido respeitado. Ajustada referência à faixa topbar removida para não interromper a renderização da auditoria. Conferidos clique, abertura da auditoria e transição no Chrome; 48 testes aprovados.
Entrada dos painéis sincronizada com o sublinhado em 300ms: Projetos parte de +28px (direita), Auditoria de -28px (esquerda), ambos com fade suave. Implementado em motion.css com @starting-style e preferência de movimento reduzido respeitada; browsers sem suporte exibem o conteúdo imediatamente. Conferidas as duas direções, duração e troca de painéis no Chrome.

### Ajustes do formulário da etapa 5

O seletor de responsável mostra nome e foto usando o seletor nativo personalizável. A API interna reutiliza a composição de URL do perfil, devolvendo `id`, `name` e `photoUrl`, sem campo CPF. Foto ausente ou com falha mantém iniciais; browsers sem suporte a `appearance: base-select` mantêm a lista textual. Solicitação, conclusão e custo ficam em três colunas, empilhadas até 600px.

Validação: teste novo da lista de responsáveis falhou antes da alteração e passou depois; `npm test` 63/63, `npm run build`, sintaxe de app.js e `git diff --check` aprovados. Esta alteração não recebeu nova inspeção visual no navegador. Reinicie o servidor Node para carregar a mudança da API e recarregue a página; confira seleção, foto/fallback e disposição dos três campos. Sem commit ou alteração no banco.

Atualização da validação: foto e nome do responsável conferidos no navegador após reiniciar o servidor local, que ainda executava a versão anterior da API. Ajustados alinhamento, padding lateral e destaque somente no hover/foco; interface aprovada pelo usuário. A etapa 5 inclui seleção explícita de responsável, preservação do legado, controles independentes de visibilidade e arquivamento com auditoria. Revisão independente do núcleo sem apontamentos bloqueadores; 63 testes locais, build e sintaxe aprovados novamente antes do commit. Integração real do arquivamento/concorrência com PostgreSQL e sua validação visual completa permanecem pendentes. Commit e push autorizados pelo usuário em 4 de novembro de 2026.
