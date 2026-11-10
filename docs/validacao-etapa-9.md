# Etapa 9 — Registro de execução

## Base local — 6 de novembro de 2026

Plano aprovado pelo usuário, com início autorizado e autorizações sensíveis separadas. Trabalho na branch `codex/etapa-9-validacao-publicacao`, criada a partir de `0820b84`. As alterações documentais do planejamento em README, plano consolidado e documento da etapa foram preservadas.

| Verificação executada | Resultado |
| --- | --- |
| `npm test` | 97 testes aprovados; zero falhas, cancelamentos ou testes ignorados. |
| `npm run build` | Aprovado. |
| `git diff --check` | Aprovado; aviso de normalização LF/CRLF no README. |

Esses resultados usam as simulações locais existentes. Não comprovam integração PostgreSQL, autenticação real, concorrência HTTP, acessibilidade completa ou execução no Workers. Nenhuma alteração de comportamento foi feita nesta abertura; TDD ainda não se aplica.

## Conferência do ambiente — 9 de novembro de 2026

O usuário autorizou usar o ambiente do env atual para os testes. A inspeção local autorizada da configuração, sem imprimir credenciais, encontrou `VAULT_DB_ENV=production` e `VAULT_INTEGRATION_APPROVED=no`. A identificação do banco/papel na URL coincide com os valores esperados configurados; isso não comprova isolamento nem permissões efetivas.

Nenhuma conexão ao banco, consulta remota, migration ou suíte de integração foi executada. A execução foi interrompida antes da conexão porque o AGENTS.md proíbe testes automatizados em produção e as suítes realizam escritas. Não foram alteradas flags ou credenciais. A autorização para usar o env atual foi recebida, mas permanece necessário identificar um destino de desenvolvimento isolado; se a classificação estiver incorreta, confirmar o destino real antes de qualquer mudança.

## Integração PostgreSQL executada — 9 de novembro de 2026

Após a conferência acima, o usuário esclareceu que o banco ainda não está em uso em produção e autorizou sua utilização para testes sintéticos e a mudança da configuração para desenvolvimento. Essa confirmação substitui o impedimento baseado na classificação anterior; não significa que um novo ambiente isolado tenha sido criado.

- `.env` local: somente `VAULT_DB_ENV` alterado para `development`; credenciais preservadas, sem inclusão no Git. `VAULT_INTEGRATION_APPROVED=yes` aplicado somente ao processo de teste, mantendo a trava persistida como estava.
- Pré-verificação real: banco e papel efetivos coincidiram com a identidade esperada. USAGE no schema e SELECT/INSERT/UPDATE/DELETE nas tabelas `vault` confirmados; não há sequências nesse schema. Migrations 1 e 2 já presentes; nenhuma migration executada.
- Execução equivalente ao script `npm run test:integration`: `node --test` com os quatro arquivos `tests/integration/*.test.cjs`, enumerados explicitamente, e env carregado de forma privada. Saída filtrada para não registrar credenciais ou CPFs sintéticos.
- Resultado: **4/4 testes aprovados**, zero falhas, cancelamentos ou ignorados; saída 0. Tempo reportado pelo runner: aproximadamente 7,56 segundos. Inclui persistência/importação/unicidade, convites, consultas públicas e curadoria/indicadores/rollback/concorrência.
- Registros sintéticos gravados pelas suítes foram preservados, sem limpeza posterior. A suíte pública reverte sua própria transação. Não houve alteração de código da aplicação, dependências, permissões, Auth gerenciado ou infraestrutura.

Essa execução comprova os cenários existentes pelo driver real, mas não encerra a etapa: concorrência de arquivamento e corridas via HTTP, Auth real/navegador, acessibilidade, backup/recuperação e runtime de publicação continuam pendentes. O teste de convites usa o repositório PostgreSQL, sem criar contas no provedor Auth.

## Procedimento de integração PostgreSQL

### Separação posterior dos ambientes — 9 de novembro de 2026

O usuário autorizou criar `development` somente com estrutura e separar produção. Branch criada no projeto `square-unit-99617803`, ID `br-winter-poetry-b6c3g3th`, filha de `production` (`br-quiet-meadow-b677tyju`), sem exclusão automática. O painel confirmou criação por schema-only. A conexão real confirmou identidade esperada e zero registros nas nove tabelas `vault`, incluindo `schema_migrations`.

`.env` aponta para development; `.env.production` preserva a conexão anterior com classificação production. Ambos ignorados pelo Git, com conexão direta adicional reservada a migrations/backups autorizados. Nenhuma escrita ou migration em produção nesta alteração. Os testes de integração anteriores ocorreram na branch hoje identificada como `production`, quando o usuário informou que ainda não estava em uso e autorizou os testes; não foram executados na nova development.

Inicialização local alterada em `server/local-env.cjs`, `server/start-local.cjs` e `package.json`: lê `.env`, exige development/endpoint esperado e sobrepõe valores herdados do terminal. O comando direto `node server.cjs` mantém execução por ambiente injetado, sem carregar perfis automaticamente. `.env.example` e README atualizados.

TDD: teste novo falhou por ausência do módulo (RED); implementação passou os dois cenários (GREEN): prevalência do perfil local e recusa de produção/URL inválida/host divergente sem alteração parcial do ambiente. `npm test`: **99/99 aprovados**; build, sintaxe dos dois módulos e diff aprovados. Sem dependências novas.

Smoke real da inicialização: catálogo HTTP 200 com lista vazia. Gestão retornou **503**, contrariando a expectativa inicial de 302 do smoke; a causa identificada é o Auth não habilitado na branch schema-only. O teste completo de gestão não está aprovado. O endpoint Auth local foi deixado vazio, sem reutilizar o de produção; requer autorização para habilitar o serviço e provisionar o primeiro usuário. O servidor temporário foi encerrado.

Como `schema_migrations` ficou vazia, futuras migrations dependem de comparar a estrutura copiada e registrar a versão inicial com autorização. Não reaplicar 001/002 sobre os objetos existentes. Esta entrega prepara perfis separados; não executa nem autoriza migrations futuras automaticamente.

O destino atual foi confirmado pelo usuário como fora de uso em produção e autorizado para testes. O procedimento abaixo orienta novas execuções e outros destinos; não implica criação ou isolamento de infraestrutura nesta execução. PostgreSQL local sozinho não reproduz o transporte WebSocket utilizado.

1. Identificar projeto/branch/endpoint, banco e papel por informações não secretas; confirmar que são recursos separados de produção e que contêm somente dados sintéticos. Conexão fornecida por mecanismo seguro, nunca pelo chat ou argumento de comando.
2. Obter autorização específica para conectar, consultar identidade/privilégios e executar as quatro suítes abaixo, incluindo suas escritas sintéticas. Se o destino não existir, sua criação é uma autorização de infraestrutura separada.
3. Conferir identidade efetiva e permissões de schema/tabelas/sequências antes dos testes. Inspecionar versões em `vault.schema_migrations` se o schema existir. Não basta definir flags de ambiente.
4. Em banco vazio autorizado, aplicar `server/migrations/001-persistence.sql` e depois `002-invitations.sql` somente com autorização específica. A primeira cria o schema `vault`; a segunda cria convites. Não modificar tabelas gerenciadas do Auth. Se houver objetos ou versões inesperadas, interromper e investigar, sem apagar ou reaplicar migrations.
5. Configurar `VAULT_DB_ENV=development`, `VAULT_INTEGRATION_APPROVED=yes`, `VAULT_EXPECTED_DATABASE` e `VAULT_EXPECTED_ROLE`, com `DATABASE_URL` segura. Executar `npm run test:integration` e registrar resultado por arquivo.
6. Preservar registros sintéticos para inspeção; não limpar schema, banco ou branch sem autorização destrutiva própria. Se falhar, registrar a falha e investigar antes de repetir.

| Arquivo existente | Cobertura a confirmar com execução real |
| --- | --- |
| `tests/integration/persistence.test.cjs` | Importação concorrente/idempotente, snapshots, rollback, versão de projeto e unicidade de avaliações. |
| `tests/integration/auth.test.cjs` | Consumo único de convite sob concorrência, expiração, revogação e rollback de usuário. Não testa o provedor Auth real. |
| `tests/integration/public.test.cjs` | Consultas e projeções públicas, visibilidade e indicadores. |
| `tests/integration/curation.test.cjs` | Ocultar/reexibir, indicadores, autoria, rollback, conflito simultâneo e recusa de arquivados. |

As suítes existentes não encerram o bloco: completar a evidência de concorrência de arquivamento e corridas via HTTP, conforme o plano. Não alterar mecanismos de autorização ou proteção de dados sem autorização específica.

## Registro dos blocos restantes

### Exclusão concluída e validação ampliada — 9 de novembro de 2026

Após confirmação do usuário no momento da ação, development foi excluída permanentemente. O painel passou a listar somente production. Backup da definição e recibos da branch removida continuam preservados localmente. Testes prosseguiram na branch production, ainda fora de uso e expressamente autorizada para esse fim.

- Novo `tests/integration/http-concurrency.test.cjs`: servidor HTTP local e repositórios PostgreSQL reais, com identidade de sessão simulada. Cobriu envios simultâneos (201/409 e uma única avaliação), rejeição de acesso anônimo/origem inválida, curadoria concorrente (200/409), bloqueio de duplicidade após ocultação, corrida de curadoria com arquivamento, 404 posterior e preservação da avaliação/auditoria com autor. Essa corrida aceita as duas ordens válidas; a execução não força ambas as ordens. Teste de comportamento já implementado passou na primeira execução; não houve alteração de aplicação nem ciclo RED artificial.
- Suíte ampliada: **5/5 testes de integração aprovados**, zero falhas/ignorados, aproximadamente 9,22 segundos. Teste novo também executado isoladamente e aprovado. Sintaxe do teste e diff conferidos. A última suíte local permanece 99/99; não foi repetida nesta entrega exclusivamente de cobertura/documentação.
- Chrome com Auth real: sessão existente abriu gestão; logout seguido de URL direta `/management` voltou ao login. Usuário entrou novamente pela interface; estado conectado e abertura da gestão conferidos. Nenhuma senha/código foi lido pelo agente. Primeiro usuário já existia; não houve bootstrap.
- Navegador e banco reais: criado `Etapa 9 — validação sintética 09-11`, com responsável sintético, inicialmente privado; edição publicou o projeto. Avaliação sintética de cinco estrelas enviada pelo formulário nativo, com confirmação; ocultação na gestão mudou o total público para zero e retirou o comentário; reexibição por Enter restaurou total um/comentário. Foco permaneceu no controle de curadoria. Projeto e avaliação deixados para inspeção.
- `.env` local configurado com `EMPLOYEE_PHOTO_BASE_URL=https://example.invalid/{cpf}.jpeg` para não consultar o servidor real de funcionários. Valor de teste permanece ativo; fotos reais não são esperadas durante esta validação. `.env.production` não alterado. A simulação cobre indisponibilidade; não comprova o servidor de fotos real.
- Recuperação solicitada pela interface para a conta indicada pelo usuário; mensagem genérica de aceite exibida. Recebimento do e-mail, troca da senha e novo login ainda aguardam conclusão pelo usuário. Não registrar como recuperação aprovada apenas pela mensagem.
- Backup/recuperação: PostgreSQL 18 em container `vault-etapa9-recovery`, sem rede. Migrations 001/002 aplicadas somente nesse banco local vazio; inseridos usuário, projeto, alternativa, avaliação e auditoria sintéticos. `pg_dump -Fc` e `pg_restore --no-owner --no-acl --exit-on-error` restauraram em outro banco vazio. Contagens de origem/destino coincidiram: um registro em cada uma das cinco tabelas e duas versões de migration. Artefatos em `imports/recovery-etapa9/`, SHA-256 do dump `efdc89938fd7cb7177ad6da126f142dd24f49acc11b163fde109228bd0cb35c3`. Container parado, preservado. Não houve cópia de dados do Neon nem ensaio de privilégios gerenciados do Auth nesse exercício.

Pendências atuais: conclusão da recuperação e convite com segunda conta real; testes completos de acessibilidade/múltiplos navegadores/celular; medição e prova do runtime de publicação; limites distribuídos, e-mail/domínio, retenção e metas operacionais; revisão independente final. Ensaios e prévias anteriores não equivalem à conclusão desses itens. Nenhum commit, push ou deploy.

### Retorno à branch production autorizada para testes — 9 de novembro de 2026

O usuário solicitou excluir development e usar production para todos os testes, reiterando que o sistema ainda não está em uso. `.env` local restaurado a partir do perfil reservado, com `VAULT_DB_ENV=development` como classificação do uso de teste; `NEON_BRANCH_NAME=production`, endpoint esperado e Auth existente preservados. `.env.production` não foi alterado. Ambos apontam agora para a mesma branch; não há isolamento entre esses dois perfis. Perfil development anterior preservado em `imports/auth-development-2026-11-09/development.env`, ignorado pelo Git.

Identidade, privilégios e migrations 1/2 conferidos no destino autorizado. As quatro suítes de integração existentes passaram novamente: 4/4, zero falhas/ignorados, aproximadamente 6,79 segundos. Escritas somente nos registros sintéticos das suítes, sem limpeza geral ou migration. Smoke do inicializador: `/catalogo` 200, `/auth` 200, `/management` 302 para `/auth`, `/api/auth/get-session` 200. Servidor temporário encerrado. Nenhum usuário real criado ou provisionado; autenticação completa ainda não validada.

Exclusão da development preparada no painel, mas não executada: a confirmação informa exclusão permanente e a política da ferramenta exige confirmação no momento da ação. Não confundir solicitação de exclusão com exclusão concluída. O diagnóstico do Auth na development deixa de bloquear os testes no destino atual. Quando houver uso real do sistema, suspender testes nessa branch e estabelecer isolamento novamente.

### Tentativa com CREATE temporário — 9 de novembro de 2026

Com autorização específica do usuário, identidade e endpoint development reconferidos, foi concedido `CREATE ON DATABASE neondb` ao papel `neon_auth`. Uma nova tentativa de Enable Managed Better Auth no painel retornou novamente `permission denied for database neondb`.

O privilégio foi revogado ao final e a consulta efetiva confirmou `create_allowed=false`; `neon_auth` continua sem schema. Recibo sanitizado em `imports/auth-development-2026-11-09/permission-receipt.json`. Nenhuma alteração em produção, nenhum usuário provisionado e nenhum endpoint Auth local configurado.

A concessão temporária não resolveu o erro; não há evidência suficiente para atribuí-lo ao papel `neon_auth` ou justificar permissões mais amplas. Interrompidas tentativas de alteração de privilégios. Próximo passo: diagnóstico do provisionador pelo suporte Neon, sem enviar credenciais ou dumps.

Informações para chamado: projeto `square-unit-99617803`, branch development `br-winter-poetry-b6c3g3th`, banco `neondb`, PostgreSQL 18. Branch criada com schema-only; schema Auth herdado vazio foi preservado em backup e removido com autorização. Proprietário `neondb_owner` possui CREATE/CONNECT; habilitação falha mesmo com CREATE temporário para `neon_auth`, já revogado. Mensagem do painel: `permission denied for database neondb`. Solicitar identificação do papel/etapa do provisionamento que falha e procedimento suportado para habilitar Auth nessa branch. Chamado não enviado.

### Remoção autorizada do schema vazio e novo bloqueio — 9 de novembro de 2026

O usuário autorizou remover exclusivamente `neon_auth` da development, preservando a definição, e repetir a habilitação. Backup schema-only por `pg_dump` 18, conexão direta, salvo em `imports/auth-development-2026-11-09/neon_auth-schema.dump` (ignorado pelo Git), 15.215 bytes, SHA-256 `d61403c91c01a2dcf36a8ce01e4696884ed501e42277217e3a0ec5343add4e12`. Arquivo conferido por `pg_restore --list`; restauração não ensaiada nesta operação. Manifesto e recibo privados no mesmo diretório.

Remoção executada na branch development conferida por endpoint/identidade, em transação com limites de espera. Dependências transitivas de catálogo inspecionadas, nove tabelas vazias reconferidas sob bloqueio; inventário de relações, funções e tipos externos comparado antes/depois, sem mudança. `DROP SCHEMA neon_auth CASCADE` confirmado por COMMIT; nenhuma intervenção em produção.

A nova tentativa no painel falhou com `permission denied for database neondb`. Inspeção read-only: o proprietário/conexão `neondb_owner` possui CREATE e CONNECT; o papel gerenciado `neon_auth` possui CONNECT, mas não CREATE no banco. O schema continua ausente. Isso sugere falta de privilégio do papel gerenciado, mas o painel não identifica qual papel executou a operação, portanto a causa ainda não está comprovada.

Próxima correção proposta, sujeita à autorização específica de permissões: conceder temporariamente `GRANT CREATE ON DATABASE neondb TO neon_auth` somente na development, tentar habilitar o serviço uma vez e revogar com `REVOKE CREATE ON DATABASE neondb FROM neon_auth` ao final, preservando o estado anterior dessa permissão. Se a tentativa falhar, não ampliar acessos; investigar o provisionador com o suporte Neon. Nenhum GRANT/REVOKE executado. Auth local e primeiro usuário continuam pendentes; `.env.production` permanece intacto.

### Tentativa autorizada de habilitar Auth — 9 de novembro de 2026

O usuário autorizou habilitar Neon Auth na development e configurar o acesso local, mantendo o primeiro provisionamento de usuário pendente. No painel da branch `br-winter-poetry-b6c3g3th`, a ação Enable Managed Better Auth foi recusada: o schema `neon_auth` já existe e o serviço exige removê-lo antes do provisionamento. É estrutura herdada pela cópia schema-only, não um serviço Auth habilitado.

Inspeção somente de leitura na conexão development, com identidade conferida: nove tabelas em `neon_auth`, todas vazias; nenhuma FK externa apontando para elas nem dependência externa de relação identificada nas consultas de catálogo realizadas. Isso não equivale a uma análise exaustiva de todos os tipos de dependência PostgreSQL.

Nenhum schema removido, nenhum usuário criado, nenhum endpoint Auth local configurado e nenhuma alteração em produção. A próxima operação proposta é remover exclusivamente o schema Auth vazio da development e então repetir a habilitação já autorizada. Por ser destrutiva, a remoção depende de autorização específica. Antes de executá-la, revisar as dependências completas e preservar uma definição recuperável da estrutura. Gestão local continua indisponível até configurar o serviço.

| Bloco | Estado / condição de avanço |
| --- | --- |
| Integração PostgreSQL | Quatro suítes existentes aprovadas em 9/11; pendentes complementos de arquivamento concorrente e HTTP. |
| Auth real e fluxo completo | Pendente de ambiente Auth isolado, contas de teste, recebimento de verificação/recuperação e autorização específica. |
| Interface e acessibilidade | Pendente de execução; prévias sintéticas disponíveis no README, sem banco/Auth. |
| Migração e restauração | Pendente de ambiente/autorização; acervo real não acessado. Definir exemplos e responsáveis antes da migração real. |
| Runtime e operação | Pendente de decisão/prova autorizada de hospedagem, e-mail, limites, retenção e recuperação. |
| Revisão independente | Pendente ao fechamento, após alterações e evidências pertinentes. |
| Commit, integração Git, push e deploy | Não executados; exigem autorizações específicas. |

## Estrutura do procedimento de publicação e recuperação

Preparação inicial; não é um roteiro autorizado para executar em produção. Antes de torná-lo executável, preencher destino, responsável, versão candidata, origem/domínio, política de dados, metas de recuperação e comandos compatíveis com a hospedagem aprovada.

1. Reunir evidências dos blocos acima, identificar bloqueadores e obter aceite das limitações. Registrar a versão candidata imutável após commit autorizado.
2. Validar a configuração por nomes, sem valores secretos: banco/papel, origem, Auth, segredo de cookie e base de fotos. Empacotar somente assets permitidos. Confirmar acesso operacional e revogação de usuários.
3. Definir janela, responsável e gatilhos de reversão. Verificar backup recuperável atual por procedimento autorizado, destino separado de restauração e compatibilidade da versão anterior do código com o schema.
4. Se houver migração de acervo, revisar exportação autorizada, reconciliar inventário e preservar a cópia original. A CLI atual recusa aplicação em produção; preparar procedimento específico para execução humana, sem retirar a trava. Não publicar enquanto essa dependência estiver indefinida.
5. Solicitar autorização específica para publicação somente com destino, versão, custo/limites e roteiro concretos. Operações críticas ou irreversíveis de produção serão executadas pelo responsável humano.
6. Após publicação autorizada, conferir leitura pública e disponibilidade sem gerar avaliações ou contas de teste em produção. Registrar resultado real; push não comprova deploy.
7. Em falha crítica, executar somente o procedimento de reversão previamente autorizado. Não restaurar dados automaticamente para reverter código. Preservar evidências sem CPF, cookies, tokens, URLs de fotos ou corpos de requisição.

## Recuperação concluída — 9 de novembro de 2026

O usuário confirmou recebimento/conclusão da recuperação e novo login, realizados por ele sem compartilhar senha, código ou link. Em seguida, o agente navegou diretamente para `/management` no navegador e confirmou a abertura da gestão com a sessão renovada, sem redirecionamento ao login. Recuperação e novo acesso validados com participação humana; o conteúdo do e-mail e a troca da senha não foram inspecionados pelo agente. Esta evidência encerra a pendência de recuperação registrada anteriormente, sem encerrar convite com segunda conta, acessibilidade completa e preparação da publicação.

## Acessibilidade — rodada de 9 de novembro de 2026

Verificados no Chrome reflow em 320 px, salto ao conteúdo, formulário obrigatório, rótulos, estrelas por setas, Escape/retorno de foco do diálogo e navegação das abas. Medição exploratória encontrou contraste 4,42:1 no selo público Planejado, abaixo de 4,5:1; correção pendente. Sem mudanças de código ou repetição de suítes nesta rodada. [Matriz, limites e requisitos para a segunda conta](acessibilidade-etapa-9.md). Acessibilidade completa continua pendente.


### Continuação — contraste corrigido

Correção autorizada em src/web/styles/styles.css: selo Planejado passou de 4,42:1 para 5,21:1. Textos do catálogo/projeto/gestão revalidados; bordas do formulário público acima de 3:1; semântica básica e abertura/Escape/retorno de foco de Novo projeto conferidos. npm test: 99/99; npm run build: aprovado. Zoom por atalho sem efeito, ainda pendente. [Evidências e limites](acessibilidade-etapa-9.md). Convite aguarda segundo e-mail; sem commit, push ou deploy.

### Cadastro e verificação simplificados — 9/11/2026

Alteração autorizada pelo usuário em auth.js/auth.html: cadastro bem-sucedido solicita OTP pelo SDK existente, mostra destino como texto e foca Código. Falha de envio diferencia conta criada de código não enviado e oferece reenvio. Sessão não verificada restaura destino sem enviar novamente ao carregar. Sem migrations, configuração do provedor ou dependências novas.

TDD em tests/auth-ui.test.cjs: três falhas esperadas antes da implementação (envio, falha parcial e restauração do e-mail), mais cenário de cadastro recusado já aprovado. Após implementação: 4/4; npm test: 103/103; npm run build e git diff --check aprovados. SDK simulado nos testes; não equivalem a novo cadastro real automático. No Chrome, segunda conta criada antes da alteração restaurou e-mail e ocultou campo; reenvio aceito sem erro e foco em Código. Recebimento e código dependem do usuário. Convite gerado e ainda não aceito. Não houve revisão independente, commit, push ou deploy.


### Convite real — segunda conta, 9/11/2026

Usuário concluiu verificação do e-mail. Antes do aceite, /management redirecionou para /auth e a sessão verificada exibiu acesso interno não autorizado. Convite aceito com nome e CPF sintéticos, conforme autorização específica; interface confirmou Convite aceito e acesso ativo. Gestão abriu e carregou quatro projetos sob o perfil da segunda conta. Nova tentativa com o mesmo convite e a mesma conta foi recusada como Conta já cadastrada; isso comprova bloqueio da repetição pela mesma identidade, não isola a validação de token consumido por outra identidade (coberta pelos testes de repositório). Não houve escrita de projeto para validar autoria nesta rodada. Conta de teste permanece com acesso interno ativo. Sem commit, push ou deploy.

## Estado consolidado — continuação de 9/11/2026

- Autoria real validada: segunda conta alterou somente Solução do projeto sintético Etapa 9 — validação sintética 09-11. Auditoria de 10:10:37 mostrou Pessoa sintética convite etapa 9 como autora, mantendo HTTP sintético como responsável. Comparação antes/depois conferida; alteração permaneceu no projeto para inspeção.
- Leitura HTTP pública sem executar JavaScript retornou 200 com projeto, solução atualizada, comentário e formulário POST nativo. Não continha o rótulo interno Autor da ação. Essa amostra não substitui auditoria exaustiva de projeção nem envio manual sem JavaScript.
- Diálogo de auditoria em viewport 320 × 800: após estabilização, página client/scroll 305/305, diálogo 250/250 e região comparativa 204/204. Região nomeada e com tabindex 0; Escape devolveu foco ao registro de origem. Leituras imediatamente após redimensionar apresentaram dimensões transitórias e não foram usadas como resultado final. Viewport restaurado.
- Revisão independente somente leitura encontrou P2: falha na consulta de sessão após cadastro/envio apagava a confirmação de sucesso. Reproduzido em teste (RED), corrigido com tratamento separado de refresh e dois cenários de falha parcial. Revisor reavaliou: 6/6 testes de Auth UI aprovados, sem novo bloqueador nesse recorte.
- Validação final: npm test 105/105; npm run build, node --check nos JS/CJS alterados nesta etapa e git diff --check aprovados. Integração PostgreSQL não repetida para esta correção de interface; mantém-se a evidência anterior de 5/5.
- Limite do perfil local: somente variáveis declaradas no .env sobrescrevem as herdadas; isso não representa isolamento completo do ambiente.
- Usuário decidiu manter a prova Cloudflare Workers pendente. Wrangler não instalado, adaptador não preparado e nenhum recurso externo/deploy criado.

Pendências de validação: zoom real 200%, leitor de tela, Firefox/Safari/celular real, contraste completo de estados, envio público manual sem JavaScript e cenários de fotos lentas. Novo cadastro com disparo automático real ainda não repetido (testes do fluxo usam SDK simulado; reenvio real foi aceito).

Pendências operacionais: runtime/topologia e proteção distribuída; domínio/SMTP, migração do acervo e mapeamento dos responsáveis, retenção e metas de recuperação. Publicação não está pronta. Sem commit, push ou deploy.

## Repetição do fluxo básico — 9/11/2026, 10:26–10:28

Executada no Chrome, localhost:4173, com segunda conta e dados sintéticos no destino já autorizado. Novo projeto: Projeto fictício — fluxo completo 09-11, ID 35e052a3-e7f7-4bd0-b5c6-bf79eaae9d4e.

| Cenário | Evidência observada |
| --- | --- |
| Cadastro | Criado privado, responsável segunda conta, data 09/11/2026 e custo zero; mensagem de gravação no servidor. |
| Busca interna | Busca por fluxo completo encontrou o novo projeto e o anterior que contém o termo na descrição. |
| Edição/publicação | Status alterado para Em andamento e visibilidade para Público; página pública exibiu os dados. |
| Avaliação | Nome/CPF sintéticos, quatro estrelas e comentário; confirmação de envio, campos limpos e uma avaliação pública. |
| Ocultação | Gestão marcou Oculta; após recarregar a página pública, comentário desapareceu e contador passou para zero. |
| Duplicidade mesmo oculta | Nova tentativa com mesmo CPF/projeto recusada: já existe avaliação e não é possível editar/enviar outra. |
| Reexibição | Gestão marcou Visível; nova leitura pública mostrou comentário original e uma avaliação de quatro estrelas. |
| Catálogo | Indicador 4,0 de 5 · 1 avaliação; busca Projeto fictício retornou 1 projeto de 5. |
| Auditoria | Criação, edição (somente Status/Projeto público), ocultação e reexibição registrados com autoria da segunda conta. |

Sem defeito funcional observado nesse recorte. Falhas de seletor/elemento destacado da automação foram resolvidas com nova inspeção, sem alteração do produto. Sem alteração de código ou repetição de suítes nesta rodada. Projeto ficou público com avaliação reexibida para inspeção. Não foram repetidos login/recuperação, exclusão/arquivamento, cadastro Auth, nem testes de infraestrutura. Esta rodada não encerra as demais pendências da etapa 9.

## Modal personalizado e remoção — 9/11/2026

Pedido específico do usuário: substituir confirm nativo por modal do Vault antes de prosseguir. Alterados src/web/pages/index.html, src/web/scripts/app.js e src/web/styles/styles.css. Dialog nomeado/descrito, nome do projeto como texto, foco inicial em Cancelar, retorno de foco nativo e returnValue limpo em cada uso. Política de arquivamento/exclusão do servidor permanece intacta.

TDD: dois testes novos em tests/removal-dialog.test.cjs falharam antes da implementação e passaram depois. npm test: 107/107; npm run build, node --check app.js e git diff --check aprovados. Revisão independente sem bloqueadores; revisor executou 2/2 testes do modal. No Chrome: Cancelar e Escape fecharam somente confirmação, retornando foco a Remover projeto e preservando o projeto.

Arquivamento pelo modal: Projeto fictício — fluxo completo 09-11, ID 35e052a3-e7f7-4bd0-b5c6-bf79eaae9d4e. Banco confirmado por host configurado/identidade/permissão SELECT. archived=true; uma avaliação preservada, nota 4, visible=true e comentário original idêntico; cinco eventos (criação, edição, ocultação, reexibição, arquivamento), com snapshots pertinentes. Página pública retornou HTTP 404. Arquivamento exibido na auditoria com autora da segunda conta.

Exclusão pelo modal: Projeto descartável — exclusão 09-11, criado nesta rodada sem avaliações, removido após confirmação específica do usuário. Zero linhas de projeto e alternativas; dois registros de auditoria (criação/exclusão). Snapshot antes da exclusão idêntico ao snapshot da criação; after_snapshot nulo. Versão anterior completa disponível visualmente na auditoria. Projeto não tinha alternativas, portanto esta rodada não prova preservação de alternativas não vazias.

Tentativas anteriores com confirm nativo não efetuaram remoção; eram bloqueios da automação e motivaram a troca solicitada. Nenhuma alteração de infraestrutura, migration, commit, push ou deploy. Workers continua pendente por decisão do usuário.


## Preparação de limpeza — 9/11/2026

Usuário solicitou zerar dados e manter somente sua conta principal. Nenhuma limpeza remota executada. Backup completo dos schemas vault/neon_auth em imports/cleanup-2026-11-09/full-before-cleanup.dump, restaurado com pg_restore --exit-on-error em PostgreSQL 18 local sem rede. Script cleanup-vault.sql ensaiado nessa cópia: removeu 13 convites, 16 avaliações, 3 alternativas, 34 eventos, 10 projetos, 6 vínculos de importação, 3 importações e 15 usuários internos sintéticos; preservou um usuário interno e duas migrations. Primeiro ensaio recusou comparação uuid/text e foi revertido; conversão explícita corrigida e segundo ensaio concluído. Auth/configuração preservados; remoção da segunda conta deve ocorrer no gerenciamento do Neon Auth. Execução final remota fica com responsável humano conforme AGENTS; recibo e backup ignorados pelo Git. Workers ainda não configurado.


## Limpeza confirmada — 9/11/2026

Após execução pelo responsável, conferência somente leitura confirmou zero projetos, avaliações, auditoria, alternativas, convites, importações e vínculos de importação; um usuário interno ativo vinculado à única conta Auth, danilohumberto@cifraengenharia.com.br; duas migrations preservadas. Identidade de conexão conferida: neondb / neondb_owner. Nenhuma exclusão remota foi executada pelo agente nessa limpeza. Backup anterior restaurado em ensaio isolado e recibo permanecem em imports/cleanup-2026-11-09, fora do Git.

## Adaptação Workers — 9/11/2026

Autorizações específicas: instalar Wrangler, adaptar servidor para testes locais e implementar segredo estável/coordenador Durable Object para avaliações. Sem autorização de deploy nesta rodada. Implementação e roteiro em [publicacao-cloudflare.md](publicacao-cloudflare.md).

Testes: npm test 111/111; npm run test:worker 4/4 em workerd local; npm run check:worker (build + wrangler deploy --dry-run) aprovado; sintaxe dos módulos alterados e git diff --check aprovados. Nenhuma conexão de teste ao Neon limpo. RED/GREEN: teste de leitura injetada de assets falhou lendo CSS do disco antes da mudança e passou após; teste do cache do provider falhou por módulo ausente e passou após implementação. Testes adicionais de proteção são regressões, sem ciclo RED prévio documentado.

Falhas intermediárias de ensaio: teste do entry de publicação seguiu redirecionamento para domínio sintético inexistente; ajustado para conferir Location sem seguir. Cookie sintético inicialmente não usava o prefixo oficial do SDK, corrigido para NEON_AUTH_SESSION_COOKIE_NAME. Datas ausentes na sessão simulada geraram avisos do SDK, corrigidas na fixture. Esses problemas eram das fixtures, não falhas ocultadas do produto.

Revisão independente encontrou P2: provider criado por requisição perdia o limite agregado de 16 chamadas pendentes por isolate. Corrigido com cache por configuração; teste com 17 chamadas inicia somente 16 upstream. Reavaliação final registrada abaixo quando concluída.

Reavaliação independente final: P2 corrigido, nenhum bloqueador novo no recorte. Revisor executou 4/4 testes de provider, assets e proteção e diff sem erros; não reexecutou cenários runtime. Adaptação local concluída, configuração/publicação externa pendentes.


Atualização — 10/11/2026: alteração de endereço autorizada e publicada em https://crivo.cifraengenharia.workers.dev, com identidade Crivo e favicon. Neon Auth atualizado; versão a0254513-6187-4f32-a331-6a5ff868491d ativa. Testes Workers 4/4 e verificações HTTP aprovados; login real no novo domínio não repetido. Endereço anterior preservado. Nenhum commit/push adicional. [Evidências e limites](publicacao-cloudflare.md#publicação-do-crivo--10112026).


Atualização — 10/11/2026: endereço vault-ti agora redireciona automaticamente para crivo.cifraengenharia.workers.dev com HTTP 308, preservando caminho e parâmetros. Deploy 1c8464cf-0c76-452a-af8c-17d979ee8984 confirmado; 12 verificações locais, seis URLs remotas e chegada ao catálogo com 200 aprovadas. Substitui os registros anteriores de ausência de redirecionamento. Detalhes em [publicação](publicacao-cloudflare.md). Nenhum commit ou push.
