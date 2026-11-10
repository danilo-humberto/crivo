# Publicação no Cloudflare Workers

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
