# Publicação no Cloudflare Workers

## Estado consolidado — 10/11/2026

- Produto publicado em https://crivo.cifraengenharia.workers.dev, versão registrada `a0254513-6187-4f32-a331-6a5ff868491d`.
- Endereço vault-ti redireciona para Crivo com HTTP 308, preservando caminho e parâmetros; versão registrada `1c8464cf-0c76-452a-af8c-17d979ee8984`.
- Novo domínio autorizado no Neon Auth. Login real foi conferido no endereço antigo; no novo domínio foram verificadas as respostas HTTP, a leitura pública e os bloqueios sem sessão, sem repetir login com senha.
- Preparação Workers, identidade/domínios e apresentação/licença estão integrados e publicados na main nos commits `397217a`, `bb6aebc` e `40d7b1a`, respectivamente. Deploys e operações Git são eventos distintos.
- Permanecem as limitações registradas: conexão administrativa e SMTP compartilhado autorizados, necessidade de separar ambientes antes de novos testes com escrita, definições de backup/retenção e pendências de acessibilidade. A etapa 9 não é declarada integralmente concluída.

Os relatos abaixo são cronológicos: “pendente” ou “sem commit” descreve o momento de cada relato. Esta consolidação usa evidências já registradas e Git conferido; não reexecuta testes nem revalida produção.

Preparação local autorizada e executada em 9/11/2026. Destino escolhido: subdomínio `workers.dev`. Nenhum deploy, recurso remoto, segredo remoto ou migration Neon foi aplicado nesta preparação.

## Implementação e testes

Wrangler 4.159.0 está fixado no lockfile. `workers/index.mjs` adapta o servidor com `httpServerHandler`; rotas, autenticação e repositórios continuam compartilhados com Node. Cada requisição tem contexto próprio e pool Neon encerrado ao terminar a resposta, via `waitUntil`. O provider Auth é reutilizado por configuração no isolate para preservar o limite de 16 operações pendentes; esse limite não é global entre isolates.

`server/assets.cjs` é a allowlist única. O build copia somente seus arquivos para `dist/worker-assets`. `run_worker_first` mantém a autorização antes da leitura de `/management`; caminhos internos de assets não são rotas públicas. Não publicar a raiz do repositório.

Avaliações usam `REVIEW_SIGNING_SECRET` estável e um Durable Object SQLite `ReviewLimiter`, instância `global`, com transação por tentativa: 10 por IP e 200 no total em janela de 10 minutos. O IP vem de `CF-Connecting-IP` no Worker de publicação, nunca de `X-Forwarded-For`. Guarda-se HMAC do IP, não o IP bruto. Alarme remove a janela vencida; isso não representa política de expurgo dos backups internos da Cloudflare. Falha do coordenador nega o envio. O segredo precisa ser igual entre versões; sua troca invalida tokens de formulário anteriores e altera as chaves por IP. A configuração `v1` cria somente esse recurso Cloudflare, sem alterar schemas Neon.

Comandos locais:

```powershell
npm test
npm run test:worker
npm run check:worker
```

Resultados: 111/111 testes Node; 4/4 cenários Workers em workerd local; build e dry-run aprovados. Pacote final: aproximadamente 626 KiB, 138 KiB comprimido, 25 assets. Testes de sintaxe e `git diff --check` aprovados. Não há lint nem análise de tipos configurados.

Cobertura Workers: assets/allowlist, redirecionamento canônico, gestão protegida, CSRF, cookies, sessões concorrentes, criar/publicar projeto, avaliar, duplicidade, ocultar/reexibir, arquivar e preservar histórico, limite por IP/global concorrente e persistência após reiniciar. O entry de publicação e SDK Auth também foram executados com I/O externo substituído, comprovando isolamento das identidades e encerramento dos pools. Testes ficam em `tests/workers`, fora do bundle de publicação, e desabilitam carregamento de dotenv. Nenhum teste desta rodada escreveu no banco Neon limpo.

Limite da evidência: PostgreSQL e provedor Auth foram simulados nesta rodada; workerd local não prova rede Neon/WebSocket, entrega de e-mail ou configuração de cookies/origem na borda real. Validações anteriores com Neon no servidor Node são históricas e não substituem essa conferência após configurar a hospedagem. Acessibilidade ainda tem as pendências documentadas na etapa 9.

## Próxima etapa, ainda não executada

1. O responsável entra na conta Cloudflare e informa o subdomínio disponível. A origem final será `https://vault-ti.<subdominio>.workers.dev`, sujeita à disponibilidade do nome. Conferir plano, quotas e orçamento antes de criar recursos; o nome gratuito não garante gratuidade de toda a operação.
2. Configurar em `workers/wrangler.jsonc` as variáveis não secretas: `APP_ORIGIN` (HTTPS, sem barra final), `NEON_AUTH_BASE_URL` e `EMPLOYEE_PHOTO_BASE_URL`. Confirmar a URL de fotos para uso real; a configuração de testes utiliza `example.invalid` e não deve ser copiada por engano.
3. Com autorização específica, incluir a origem HTTPS no Neon Auth. Preservar a origem local somente se continuar necessária. Conferir serviço/remetente e entrega de e-mail de produção.
4. Cadastrar por mecanismo seguro os segredos `DATABASE_URL`, `NEON_AUTH_COOKIE_SECRET` e `REVIEW_SIGNING_SECRET` na Cloudflare. Preferir conexão/papel restrito ao necessário; não copiar automaticamente a conexão administrativa usada nas validações. Não escrever valores no Git, chat ou logs. `.env` e `.env.production` não são carregados pelo Worker. `.dev.vars*` também é ignorado pelo Git.
5. Após aprovação específica do deploy e criação do Durable Object, executar build e publicação. Comando preparado, ainda não executado:

   ```powershell
   npm run build:worker
   npx wrangler deploy --config workers/wrangler.jsonc
   ```

6. Conferir domínio, catálogo vazio, ausência de dados de teste, login da conta preservada, logout, gestão protegida e acesso ao banco. Verificações com escrita ou contas adicionais precisam de escopo autorizado; não executar automaticamente a suíte sintética no banco já limpo.

Não habilitar URLs de prévia com banco real: `preview_urls` está desabilitado. Logs de observabilidade também estão desabilitados na configuração inicial; eventual habilitação precisa evitar cookies, CPF, tokens, corpos e strings de conexão. Definir retenção e responsáveis operacionais antes de abrir o sistema a uso regular.

## Reversão e recuperação

Registrar ID/versão do deploy e configuração aplicada sem valores secretos. Em erro de autenticação, projeção pública, persistência ou indisponibilidade, interromper a liberação. Após existir uma versão estável anterior, reverter para ela pelo histórico de Workers; manter a mesma assinatura de avaliações e bindings compatíveis. Na primeira publicação, ainda não existe versão anterior: retirar o acesso público/Worker mediante autorização do responsável. Não reverter migration de Durable Object por exclusão automática e não restaurar Neon apenas para reverter código.

Backup anterior à limpeza: `imports/cleanup-2026-11-09/full-before-cleanup.dump`, restaurado com sucesso em PostgreSQL isolado. Contém dados anteriores, inclusive contas de teste; restaurá-lo desfaz a limpeza. Antes de entrar em uso, estabelecer backup do estado limpo, retenção, frequência, acesso restrito, perda aceitável e prazo de recuperação. Restaurações destrutivas ficam com o responsável humano conforme AGENTS.md.

Referências oficiais consultadas: [ponte Node HTTP](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/), [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [storage transacional de Durable Objects](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/) e [driver Neon](https://neon.com/docs/serverless/serverless-driver).


## Configuração de produção — 10/11/2026

Wrangler autenticado pelo responsável na conta Danilo Humberto. Origem escolhida: https://vault-ti.cifraengenharia.workers.dev. Inclusão no Neon Auth do projeto vault, branch production, confirmada no console em Your trusted domains, após autorização específica e confirmação no momento da alteração. Demais opções preservadas, inclusive Allow Localhost; desligá-lo exige coordenar o fim do uso local dessa branch.

workers/wrangler.jsonc preparado com APP_ORIGIN, NEON_AUTH_BASE_URL conferida no console e EMPLOYEE_PHOTO_BASE_URL confirmada pelo usuário (https://intranet-cifra.netlify.app/funcionarios/{cpf}.jpeg). Perfil .env.production atualizado localmente, ignorado pelo Git; assinatura de avaliações gerada se ausente, segredo de cookies existente preservado. Nenhum valor secreto exibido ou cadastrado na Cloudflare.

Pendências reais: DATABASE_URL local usa neondb_owner; preparar credencial restrita de runtime antes de enviá-la à hospedagem, com autorização específica para papel/permissões. Neon Auth usa SMTP compartilhado auth@mail.myneon.app; serviço/remetente de produção precisam ser definidos. Não houve criação de Worker/Durable Object, alteração SQL, deploy, novo commit ou push nesta configuração. Login na borda só poderá ser conferido após publicação autorizada.


Decisão do responsável em 10/11/2026: manter na publicação inicial o Neon Auth e o serviço compartilhado de e-mail já usados e validados no desenvolvimento, sem configurar novo SMTP. Essa decisão substitui a pendência de escolha de SMTP para esta publicação; permanecem os limites de envio do provedor compartilhado. A mesma branch Neon já limpa será utilizada. Nenhuma mudança adicional no provedor de e-mail foi executada. A credencial existente usa neondb_owner; seu envio à Cloudflare e o deploy ainda exigem autorização específica.


## Publicação executada — 10/11/2026

Autorização explícita do responsável: cadastrar os três segredos na Cloudflare usando a conexão Neon atual com neondb_owner, publicar vault-ti com Durable Object e validar acesso em produção. Publicado em https://vault-ti.cifraengenharia.workers.dev na conta Danilo Humberto. Versão ativa conferida em deployments list: 7c90ceae-68b0-4363-942e-e0de7a2ab3d6 (100% do tráfego). Base de código: commit 397217af5b1562aab3f47830c6460ddb89199862, acrescida da configuração de variáveis ainda não commitada.

Operações executadas: secret bulk por stdin, somente DATABASE_URL, NEON_AUTH_COOKIE_SECRET e REVIEW_SIGNING_SECRET, sem imprimir valores; criação inicial do Worker pelo Wrangler; npm run build:worker; wrangler deploy --config workers/wrangler.jsonc. Criado binding REVIEW_LIMITER para ReviewLimiter com migration Cloudflare v1. Nenhuma migration ou alteração de permissões no Neon. Segredo de cookies preservado e assinatura de avaliações preparada anteriormente.

Validação real por HTTP: / redireciona ao catálogo; /catalogo, /auth e /auth.js retornam 200; /api/public/projects retorna lista vazia via Neon; /api/projects sem sessão retorna 401; /management sem sessão redireciona a /auth; /.env e /src/web/pages/index.html retornam 404; /api/csrf emite cookie Secure. Um POST vazio sem token em projeto inexistente retornou 403 após passar pelo coordenador de tentativas, sem inserir avaliação nem consultar projeto; esta chamada consome uma tentativa na janela do Durable Object.

Validação no Chrome: responsável digitou credenciais na página de produção; Conta conectada e acesso ativo confirmados. Gestão identificou Danilo Humberto, exibiu zero projetos e valores zerados; auditoria exibiu zero registros. Evidência visual local: vault-producao-validado.png na pasta de visualizações da sessão. Nenhum projeto, avaliação ou convite foi criado na validação. Login real comprova sessão/provedor, autorização interna e leitura do banco na borda; envio de e-mail, logout e gravações não foram repetidos em produção.

Limitações e decisões preservadas: conexão administrativa neondb_owner e SMTP compartilhado usados por autorização explícita. Allow Localhost permanece habilitado para o fluxo local existente; separar ambientes antes de retomar testes com escrita. Permissões restritas, SMTP próprio, política operacional de backups/retenção e pendências de acessibilidade permanecem melhorias/decisões abertas. O deploy não conclui automaticamente toda a etapa 9. Esta publicação não criou commit nem push adicionais.


## Publicação do Crivo — 10/11/2026

Usuário autorizou expressamente a mudança para https://crivo.cifraengenharia.workers.dev, ajuste do Neon Auth e deploy. Origem adicionada aos trusted domains do projeto square-unit-99617803, branch production (br-quiet-meadow-b677tyju), confirmada no console. Domínio antigo e demais opções de Auth preservados.

workers/wrangler.jsonc agora usa name=crivo e APP_ORIGIN com o novo endereço. Perfil local .env.production atualizado sem expor segredos. Novo Worker crivo criado, três segredos existentes transferidos por stdin (DATABASE_URL, NEON_AUTH_COOKIE_SECRET, REVIEW_SIGNING_SECRET), com o mesmo banco e credenciais previamente autorizados. Durable Object ReviewLimiter criado para o novo Worker com migration Cloudflare v1; nenhuma migration SQL, mudança de permissões ou gravação de dados de negócio. O Worker vault-ti permanece ativo e independente, sem redirecionamento automático; seus contadores de limite não são compartilhados com crivo.

Deploy realizado com `wrangler deploy --config workers/wrangler.jsonc`; versão a0254513-6187-4f32-a331-6a5ff868491d confirmada com 100% do tráfego de crivo em `wrangler deployments list`. Marca Crivo e favicon incluídos. Repositório não renomeado; nenhum commit ou push realizado.

Validações: `npm run test:worker` com 4/4 cenários locais simulados aprovados, incluindo build; suíte Node 111/111 aprovada na alteração de identidade imediatamente anterior. HTTP real: raiz redireciona a /catalogo; catálogo, Auth, bundle, SVG e API pública retornam 200; leitura pública Neon bem-sucedida; get-session sem sessão retorna 200; API interna retorna 401; gestão redireciona a /auth; arquivos privados retornam 404; cookie CSRF Secure confirmado. Nenhum dado de produção exibido nos registros. Login com senha, logout e e-mails no novo domínio não foram repetidos. Para validar manualmente, entrar em /auth no endereço novo e conferir acesso à gestão; cookies do domínio antigo não migram automaticamente.

Reversão disponível por uso do endereço vault-ti anterior, preservado; não excluir recursos antigos sem autorização. Os registros anteriores de publicação e de pendências locais são históricos e não representam o estado desta versão.


## Redirecionamento do endereço antigo — 10/11/2026

Autorizado pelo usuário e publicado no Worker vault-ti: todas as rotas retornam HTTP 308 para https://crivo.cifraengenharia.workers.dev, preservando caminho e parâmetros. Cache-Control: no-store evita cache persistente durante a transição. Configuração dedicada em workers/wrangler-legacy.jsonc e handler workers/redirect-legacy.mjs; o Worker crivo não foi alterado. O handler não consulta banco nem Auth. Classe/binding/migration existente do Durable Object preservados; deploy com --keep-vars preserva variáveis remotas e segredos, sem exclusão de dados.

Comandos: wrangler deploy --config workers/wrangler-legacy.jsonc --dry-run; wrangler deploy --config workers/wrangler-legacy.jsonc --keep-vars. Versão publicada: 1c8464cf-0c76-452a-af8c-17d979ee8984. Doze verificações locais do handler aprovadas (GET/HEAD/POST, caminhos, parâmetros, destino fixo e resposta vazia); seis URLs reais retornaram 308 para o destino esperado; navegação HTTP seguindo o redirecionamento chegou ao catálogo Crivo com 200. Sem TDD por ser alteração pequena de roteamento, validada diretamente antes/depois da publicação. Sem testes com escrita em produção, commit ou push.

Para validação manual, abrir o endereço antigo em /catalogo ou /auth e observar a troca de domínio. Sessões antigas não são migradas entre domínios. A configuração anterior de vault-ti independente e sua disponibilidade como alternativa direta são agora históricas; para reversão, usar o histórico de versões do Worker mediante autorização, preservando seus bindings. Referência: https://developers.cloudflare.com/workers/examples/redirect/.
