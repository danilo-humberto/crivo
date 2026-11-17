# Desenvolvimento local com Docker

Solicitado em 17/11/2026; login simulado exclusivo de desenvolvimento autorizado na mesma conversa.

## Escopo e decisão

`npm run dev` inicia PostgreSQL e wsproxy no Docker e a aplicação Node na máquina. Mantém o driver Neon existente e os repositórios reais, sem novas dependências npm. Alternativa: instalar outro driver PostgreSQL; dispensada porque o driver atual aceita proxy WebSocket local. Neon Local não foi escolhido porque encaminha conexões para recursos na nuvem.

O ponto de entrada `server/dev.cjs` não lê `.env`. `server/dev-runtime.cjs` usa destinos fixos locais e não é importado pelo servidor de produção nem pelo Worker. O proxy aceita apenas `db:5432`; todas as portas publicadas ficam em `127.0.0.1`. Contextos Docker remotos são recusados. O Compose recebe arquivo de ambiente vazio explicitamente.

| Serviço | Endereço |
| --- | --- |
| Aplicação | http://127.0.0.1:4173 |
| PostgreSQL | 127.0.0.1:55432, banco `crivo_dev` |
| WebSocket | 127.0.0.1:55433 |

O Compose contém credenciais exclusivamente locais e descartáveis. O usuário da aplicação `crivo_app` possui DML nas tabelas, sem superusuário, criação de schema ou alteração do histórico de migrations. Não reutilizar essas credenciais em serviços remotos.

## Uso e persistência

1. Instale Node.js 22+ e Docker com Compose e containers Linux; abra o Docker Desktop.
2. Execute `npm ci` se as dependências ainda não estiverem presentes.
3. Execute `npm run dev` e abra `/management` ou `/catalogo` na origem acima.
4. Use Ctrl+C para encerrar Node; `npm run dev:stop` para parar os containers preservando o volume.

Na primeira criação do volume `crivo-development_crivo-dev-data`, o PostgreSQL executa as migrations 001/002/003 existentes e `dev/003-local-user.sql`. Só é criado um usuário fictício; o catálogo começa vazio. Reinícios preservam os dados. Alterar scripts de inicialização não migra volumes existentes; futuras migrations exigem atualização explícita desse fluxo. O runtime confere banco, papel e versões esperadas antes de servir HTTP. Não há limpeza ou reset automático.

Se uma porta estiver ocupada, encerre o processo local correspondente antes de repetir. Falha no Docker ou no banco interrompe a inicialização, sem tentar outro destino. O primeiro uso precisa de internet para baixar imagens. Depois, a aplicação local não depende de Neon/Auth/fotos externas. Links de soluções cadastradas pelo desenvolvedor continuam sendo links normais.

## Atualização de volume existente para migration 003

Volumes criados antes dos campos do solicitante precisam da migration aditiva uma única vez. Inicie os containers com `npm run dev`; o runtime recusará o schema antigo. Confirme que o destino é o container local `crivo-development-db-1`, banco `crivo_dev`, papel `crivo_dev`, e que `vault.schema_migrations` contém somente 1 e 2. Com autorização para esse banco local, execute:

```sh
docker exec crivo-development-db-1 psql -v ON_ERROR_STOP=1 -U crivo_dev -d crivo_dev -f /docker-entrypoint-initdb.d/003-project-requester.sql
```

Reinicie `npm run dev`. Não repita a migration se a versão 3 já estiver registrada e não apague o volume. Nenhum desses comandos aplica migrations remotas.

## Limites

- Identidade automática única, sem senha. Destina-se apenas à máquina de desenvolvimento, sem publicar nem expor por túnel. Regras de autorização interna, CSRF, validação, persistência e auditoria continuam nos componentes reais.
- Cadastro, logout, recuperação, e-mail e aceite de convite por outra identidade não são simulados; o provedor de desenvolvimento recusa esses comandos. Convites podem ser gerados, mas validar o fluxo completo requer Neon Auth isolado via `npm start`.
- Fotos externas desativadas: usa avatar padrão, sem enviar CPF sintético ao servidor de fotos.
- Sem hot reload de Node ou do bundle Auth; reinicie `npm run dev` após essas alterações. Não reproduz Durable Objects nem o runtime Workers.
- `npm start` mantém o contrato anterior com `.env`; a proteção por destinos fixos pertence ao `npm run dev`.

## Validação

Critérios: subir sem `.env`, usar somente banco Docker, persistir entre conexões/reinícios, servir catálogo e gestão, preservar autorização/CSRF e manter o perfil simulado fora da produção.

Testes: `npm test`; `npm run test:dev` com containers ligados; `npm run test:worker`; `npm run check:worker`. Teste Docker usa somente o destino fixo e dados sintéticos, removendo apenas registros criados pelo próprio teste.

Roteiro manual: iniciar, abrir gestão, cadastrar projeto, recarregar, publicar e conferir catálogo; encerrar/reiniciar e conferir persistência. Não testar senha/e-mail nesse perfil.

Evidências de 17/11/2026:

- Antes da alteração: `npm test`, 111/111 aprovados.
- RED: teste do novo runtime falhou por módulo ausente. Durante integração real, o teste adicional do proxy falhou porque Neon 1.2.0 substitui a fábrica `Client` fornecida nas opções. Correção localizada no pool de desenvolvimento, sem alterar configuração global; teste passou.
- GREEN: `npm test`, 116/116; `npm run test:dev`, 1/1 com PostgreSQL e HTTP reais; `npm run test:worker`, 4/4; `npm run check:worker`, dry-run aprovado, sem deploy.
- `npm run dev`: PostgreSQL saudável, gestão, catálogo e identidade com HTTP 200. Gravação pela API, leitura por conexão independente, auditoria e recusa de origem inválida verificadas. Papel de runtime sem superusuário nem criação de schema confirmado.
- `npm run dev:stop` e novo `npm run dev`: registro sintético preservado, mesmo com variáveis remotas sintéticas herdadas (`production.invalid`) e marcador `production`. Registro do ensaio removido ao final; nenhum dado real usado.
- `git diff --check` sem erros; inspeção do bundle Worker sem runtime/identidade/credenciais locais. Revisão preliminar dos arquivos alterados concluída; auditoria de histórico não aplicável sem commits. Nenhum commit, push, PR ou deploy executado.

A revisão identificou como limites a identidade única simulada, migrations de inicialização aplicadas apenas a volumes novos e dependência da fábrica `Client` da versão atual do driver (coberta por teste). Não são validação do fluxo real de login ou do comportamento da interface por navegação visual. Roteiro manual acima permanece disponível para essa conferência.

Referências: [configuração do driver](https://github.com/neondatabase/serverless/blob/main/CONFIG.md), [wsproxy oficial](https://github.com/neondatabase/wsproxy).
