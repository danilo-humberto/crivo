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
