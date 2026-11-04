# Vault TI

Aplicativo local em HTML, CSS e JavaScript puro. A interface atual continua sem dependências de execução; a persistência de servidor preparada na etapa 3 usa o driver Neon. Os seis exemplos iniciais, concorrentes e custos são fictícios.

## Executar

Na pasta do projeto: `node server.cjs`. Abra http://127.0.0.1:4173 e mantenha o mesmo endereço e navegador. Recarregue as abas antigas ao atualizar o aplicativo. Encerre o servidor com Ctrl+C.

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
