# Etapa 9 — Validação e preparação da publicação

Plano aprovado pelo usuário em 6 de novembro de 2026; execução local iniciada. Autorizações específicas permanecem separadas. Evidências e próximos passos no [registro de execução](validacao-etapa-9.md). Referências: [requisitos e acompanhamento](plano-avaliacoes.md), [funcionamento atual](../README.md) e [arquitetura e decisões pendentes](arquitetura-etapa-2.md).

## Objetivo e base

Validar o fluxo completo das etapas anteriores e entregar uma versão com evidências e procedimento de publicação prontos para autorização específica. Publicar não é critério de conclusão desta etapa: o plano aprovado exige publicação preparada.

Inspeção local: branch `main`, sem alterações preexistentes, etapa 8 presente no commit `0820b84`. Há quatro arquivos de integração PostgreSQL em `tests/integration/`; os 97 testes aprovados são evidência histórica da etapa 8, não uma execução deste planejamento. Servidor atual usa `node:http` e arquivos locais; não há configuração Wrangler. Tokens e limites de avaliações são mantidos por processo. Não foram consultados credenciais, banco, serviços de produção ou estado remoto.

## Escopo e sequência recomendada

| Ordem | Trabalho | Critério de aceite e evidência |
| --- | --- | --- |
| 1. Base e ambiente | Reexecutar testes locais/build; registrar versão candidata. Identificar e obter autorização para banco descartável e Auth de desenvolvimento com contas sintéticas, isolados de produção. Confirmar identidade e privilégios antes das escritas; preparar migrations 001/002 com autorização própria. | Base registrada; destino e permissões conferidos sem expor segredos. Nenhum teste usa produção ou dados pessoais reais. |
| 2. Persistência e concorrência | Executar os quatro arquivos de integração existentes via driver; complementar lacunas com TDD. Validar também corridas pelo HTTP da aplicação, pois teste do repositório não cobre todo o transporte. | Importação idempotente, rollback, projeto/auditoria atômicos, convite de uso único, duplicidade CPF/projeto, curadoria concorrente e arquivamento concorrente comprovados. Avaliação oculta mantém unicidade; indicadores consideram apenas visíveis. |
| 3. Fluxo completo e permissões | Exercitar convite → segunda conta → verificação → aceite → projeto privado → responsável → publicação → avaliação anônima → ocultar/reexibir → auditoria. Cobrir logout, novo login e recuperação reais no Auth de desenvolvimento. | Fluxo concluído por navegador e API. Conta sem convite, e-mail não verificado, usuário inativo e sessão inválida não acessam gestão. Escritas recusam origem/CSRF inválidos. Revogação e expiração de convite respeitam as regras atuais. |
| 4. Público, falhas e interface | Conferir projeções públicas, fotos, navegação, formulários, teclado, leitor de tela, zoom e celular. Usar fotos/servidor de imagens sintéticos, inclusive resposta lenta, inexistente e indisponível. | Custos, alternativas e auditoria não vazam; privado/arquivado/inexistente recebem 404 equivalente; link oculto não é enviado. CPF não aparece como campo separado, texto ou log; permanece somente na URL de foto conforme decisão aprovada. Fallback não bloqueia envio. Critérios de interface abaixo atendidos. |
| 5. Migração e recuperação | Ensaiar importação e restauração em destino isolado com dados sintéticos; preparar roteiro do acervo real sem importá-lo. Definir tratamento de exemplos e mapeamento explícito de responsáveis com o usuário. | Contagens, alternativas, snapshots e histórico reconciliados; segunda importação não duplica; conflitos não deixam gravações parciais. Backup sintético restaurado e integridade conferida. Acervo local original preservado. |
| 6. Runtime e operação | Após decisões/autorização, provar execução no destino pretendido em homologação isolada. Validar assets, sessão, transações, envio de e-mails, HTTPS/origem, limites de requisição e proteção contra abuso na topologia escolhida. Preparar procedimento de publicação e reversão. | Mesmos contratos e cenários críticos aprovados no runtime de destino; sem arquivos internos publicados. Custos/limites atuais consultados nas fontes oficiais e aceitos; operação definida. Sem essa prova, publicação permanece bloqueada. |
| 7. Fechamento | Corrigir defeitos dentro do escopo autorizado, repetir verificações afetadas e realizar revisão independente do código alterado e das evidências de segurança/concorrência. Consolidar documentação. | Nenhum bloqueador aberto; resultados rastreáveis e limitações aceitas explicitamente. Versão candidata e sequência operacional prontas para decisão de publicação. |

Executar os blocos em sequência, aproveitando as suítes existentes. Falhas preexistentes devem ser identificadas separadamente. Correções em autenticação, autorização, dados sensíveis ou arquitetura exigem autorização específica antes da alteração, mesmo quando encontradas nesta validação.

## Escolhas relevantes

- **Hospedagem:** manter Workers como destino pretendido e realizar primeiro uma prova pequena, autorizada, em ambiente isolado. Benefício: verifica a proposta existente antes de investir na adaptação completa; custo: adaptação de transporte, arquivos e estado por processo pode ser necessária. Alternativa: hospedagem compatível com o servidor Node atual reduz adaptação, mas muda a decisão de infraestrutura e exige avaliação de operação/custos e aprovação. Não escolher silenciosamente outro provedor nem presumir gratuidade.
- **Integração:** priorizar um ambiente Neon/Auth separado, com dados sintéticos, por representar o driver e o provedor usados. PostgreSQL local descartável é útil para SQL e restauração, mas não substitui validação do transporte Neon/Auth. Uma branch com cópia de produção não é ambiente sintético por si só; não usar dados clonados sem tratamento/autorização.
- **Automação de navegador:** começar com testes `node:test` existentes e roteiro manual registrado. Uma ferramenta E2E pode reduzir repetição, mas adiciona dependência/manutenção; propor adoção somente se houver benefício demonstrado e autorização. Não instalar ferramentas para este planejamento.
- **Migração real:** a CLI atual permite aplicação apenas em desenvolvimento. Preparar um procedimento específico de produção para revisão e execução pelo responsável humano; não remover a trava para reaproveitar a CLI. Decidir se a publicação inicial depende do acervo migrado ou se um catálogo vazio é aceitável antes de declarar a entrega pronta.

## Validação e registro

- Base e regressão: `npm test`, `npm run build`, `node --check` nos arquivos JS/CJS alterados e `git diff --check`. Não há lint/análise de tipos configurados. TDD RED → GREEN → REFACTOR para novos comportamentos e correções testáveis; documentação/inspeção visual não exigem testes artificiais.
- Integração: `npm run test:integration` somente após autorização e confirmação do destino, com `VAULT_DB_ENV=development`, `VAULT_INTEGRATION_APPROVED=yes`, `VAULT_EXPECTED_DATABASE` e `VAULT_EXPECTED_ROLE`. Fornecer a conexão por mecanismo seguro, sem imprimir valores. Conferir privilégios efetivos; as flags não substituem isolamento ou autorização. A suíte pode deixar registros sintéticos; limpeza destrutiva também precisa de autorização.
- Falhas: banco/Auth indisponíveis, timeout, repetição de envio, token expirado, corpo inválido/excessivo, limite de tentativas e falha de rede após gravação. Conferir mensagens, consistência persistida, ausência de vazamentos e possibilidade de recuperação pelo usuário.
- Interface: catálogo, projeto, formulário, autenticação, gestão, curadoria e auditoria; teclado sem armadilhas, foco visível/restaurado, rótulos/erros anunciados, toasts acessíveis, contraste WCAG AA, zoom de 200% e reflow em 320 CSS px. Conferir desktop e celular, Chrome e Firefox; incluir Safari móvel se disponível, registrando qualquer cobertura pendente. Validar leitura e envio públicos sem JavaScript.
- Runtime: verificar token entre requisições/instâncias, reinícios, IP confiável atrás de proxy e limite agregado. O mecanismo atual em memória não comprova proteção distribuída; definir e aprovar a solução antes de publicar em múltiplas instâncias. Não confiar indiscriminadamente em cabeçalhos de IP.
- Para cada cenário, registrar versão, ambiente sem segredos, comando ou passos, resultado esperado/observado e evidência sanitizada. Não classificar como aprovado um teste não executado; simulações e ensaios SQL não substituem fluxo completo.

## Operação, riscos e decisões pendentes

Antes do fechamento, definir destino de hospedagem, domínio/origem, serviço e remetente de e-mail, orçamento/limites, retenção de CPFs/avaliações/logs/backups e responsável pela revogação de acessos. Não criar uma nova interface de administração por inferência; uma necessidade fora do escopo deve voltar para decisão.

O procedimento operacional deve identificar responsável, versão candidata, configurações por nome, backup recuperável, sequência de publicação, verificações de saúde sem dados reais de teste e gatilhos/passos de reversão. Definir metas de perda aceitável de dados e tempo de recuperação, frequência/retenção dos backups e acesso restrito. Reversão do código deve preservar compatibilidade com o banco; restauração de dados não é reversão automática de deploy. A disponibilidade atual dos backups históricos ainda precisa ser verificada com autorização apropriada.

Bloqueiam a preparação final: falha de permissão/projeção pública, perda ou duplicação de dados, concorrência sem evidência, fluxo Auth incompleto, runtime não validado, proteção contra abuso incompatível com a topologia, ausência de recuperação comprovada ou decisão operacional indispensável pendente. Melhorias não bloqueadoras podem ser propostas como dívida técnica, sem ampliar o escopo automaticamente.

## Autorizações e entrega

O usuário aprovou o escopo e autorizou o início da execução; banco/migrations, Auth/contas, dados sensíveis, infraestrutura, dependências e mudanças arquiteturais precisam de autorização específica. Commit, push, PR, merge e deploy também têm autorizações próprias; permissões de etapas anteriores não são reaproveitadas.

Entregar relatório de validação, roteiro de migração/publicação/recuperação e README/plano/arquitetura atualizados conforme decisões efetivas. Distinguir preparação concluída, commit, integração Git, publicação do código e deploy. Operações críticas ou potencialmente irreversíveis em produção ficam para o responsável humano, após revisão, backup verificado e autorização específica.

Estado atual: base local executada com 97/97 testes e build aprovados; branch de trabalho criada. As quatro suítes PostgreSQL existentes passaram em 9 de novembro de 2026 no banco autorizado pelo usuário, após ajuste para desenvolvimento. Complementos de concorrência HTTP/arquivamento, Auth real, restauração, infraestrutura e publicação permanecem pendentes. Consulte o registro de execução para evidências e pendências.


Atualização de 9/11/2026: autoria pela segunda conta comprovada na auditoria, com responsável preservado. Revisão independente identificou falha parcial de cadastro, corrigida e reavaliada; 105/105 testes locais e build aprovados. Prova Workers mantida pendente por decisão do usuário, sem instalar Wrangler. Publicação ainda não preparada; detalhes e limites no registro de validação da etapa 9.


Repetição do fluxo básico em 9/11/2026: projeto fictício novo criado privado, editado/publicado, avaliado, ocultado e reexibido; busca, indicador público, bloqueio de duplicidade mesmo oculta e autoria na auditoria conferidos no navegador. Sem defeito funcional observado nesse recorte; detalhes no registro de validação da etapa 9.


Atualização de 9/11/2026: confirmação de remoção agora usa modal personalizado do Vault (Cancelar como foco inicial). Arquivamento preservou avaliação e cinco eventos; exclusão de projeto sintético sem avaliações preservou snapshot completo na auditoria. 107/107 testes locais, build e revisão independente aprovados no recorte. Workers permanece pendente. Consulte o registro de validação da etapa 9.


Atualização de 9/11/2026 — Workers retomado por autorização específica do usuário: Wrangler 4.159.0 instalado; adaptação Node/Workers e proteção de avaliações por Durable Object implementadas e testadas localmente. 111/111 testes Node e 4/4 cenários workerd aprovados, com I/O externo simulado; dry-run de publicação aprovado. Destino escolhido: workers.dev. Publicação, configuração de segredos/origem e validação na borda permanecem pendentes. Detalhes no [roteiro Cloudflare](publicacao-cloudflare.md). Esta atualização substitui a suspensão anterior, preservada acima como histórico.


### Identidade Crivo — 10/11/2026

Nome e favicon atualizados localmente após solicitação do usuário. 111/111 testes, build Worker e verificação HTTP sintética aprovados. Commit e publicação desta alteração não executados. [Escopo e validação manual](../README.md#nome-crivo-e-favicon--10112026).


Atualização — 10/11/2026: alteração de endereço autorizada e publicada em https://crivo.cifraengenharia.workers.dev, com identidade Crivo e favicon. Neon Auth atualizado; versão a0254513-6187-4f32-a331-6a5ff868491d ativa. Testes Workers 4/4 e verificações HTTP aprovados; login real no novo domínio não repetido. Endereço anterior preservado. Nenhum commit/push adicional. [Evidências e limites](publicacao-cloudflare.md#publicação-do-crivo--10112026).


Atualização — 10/11/2026: endereço vault-ti agora redireciona automaticamente para crivo.cifraengenharia.workers.dev com HTTP 308, preservando caminho e parâmetros. Deploy 1c8464cf-0c76-452a-af8c-17d979ee8984 confirmado; 12 verificações locais, seis URLs remotas e chegada ao catálogo com 200 aprovadas. Substitui os registros anteriores de ausência de redirecionamento. Detalhes em [publicação](publicacao-cloudflare.md). Nenhum commit ou push.


## Apresentação do produto e licença — 10/11/2026

README reformulado por solicitação do usuário para apresentar o Crivo como produto em nuvem, sem associação institucional na apresentação. Três capturas reais de prévia local com dados fictícios adicionadas em docs/images; histórico anterior preservado em historico-readme-2026-11-10.md. Titular confirmado pelo usuário: Danilo Humberto. LICENSE proprietária e selo de licença incluídos, sem declarar certificado ou registro no INPI. Funcionalidades comerciais ainda ausentes explicitadas. Alteração documental: 12 referências locais verificadas, imagens inspecionadas e diff sem erros; suíte de código não repetida, sem mudança funcional. Sem commit, push ou deploy desta rodada.
