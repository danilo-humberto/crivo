# Etapa 3 — banco, persistência e importação

Preparação iniciada em 4 de novembro de 2026. Esta proposta não é uma migration aplicada nem uma implementação concluída. Complementa o plano aprovado e depende das autorizações específicas descritas abaixo.

Atualização: o usuário autorizou inicializar Git sem commit, implementar o modelo, preparar migrations locais e instalar o driver Neon. Posteriormente autorizou a aplicação em `production` e confirmou CPF obrigatório também para usuários internos. A migration foi aplicada após validação isolada e recuperação verificada do backup; importação e teste completo do repositório continuam pendentes. Evidências e comandos estão na seção da etapa 3 do README.

### Destino confirmado posteriormente

O usuário autorizou usar a branch `production` do projeto `vault` e salvar suas conexões no `.env`. Configuração realizada com conexões agrupada e direta, ambiente marcado como `production`, importação e testes de integração desabilitados. O `.env` está ignorado pelo Git.

Inspeção prévia somente leitura confirmou banco `neondb`, papel `neondb_owner` com permissão para criar schema, ausência inicial do schema `vault` e nove tabelas de `neon_auth`. O destino não foi tratado como banco vazio ou descartável.

Após nova autorização explícita do usuário para o agente aplicar a migration em produção, foram atendidos os pré-requisitos: SQL validado em Postgres 18 isolado com dados sintéticos e backup prévio restaurado em ambiente local sem rede. Aplicação concluída em uma transação; leitura pós-commit confirmou versão 1 e oito tabelas em `vault`, incluindo CPF obrigatório em usuários internos. As nove tabelas de autenticação permanecem existentes. Não executar `npm run test:integration` nessa branch. Backup, hash, roteiro de recuperação e limitações estão no README.

## Evidências e limites

- A aplicação usa localStorage v2, com projetos e auditoria gravados juntos. O servidor atual apenas entrega arquivos estáticos.
- A exportação existente contém `version`, `exportedAt`, `projects` e `audit`. Snapshots incluem alternativas e registros de projetos já excluídos.
- Existem seis projetos iniciais fictícios e dois eventos demonstrativos com `demo: true`. Os projetos iniciais não possuem marcação suficiente para excluir automaticamente todos os exemplos com segurança.
- A pasta não possui repositório Git. O plano exige definir versionamento antes de alterar a implementação.
- Base de regressão: `node --test tests/*.test.cjs`, 16 aprovados, zero falhas em 4 de novembro de 2026.
- Driver Neon, runtime Workers e instalação de dependências continuam propostos na etapa 2. Não houve acesso a banco ou leitura de credenciais nesta preparação.

## Entrega proposta

Preparar migrations SQL revisáveis, repositório de persistência no servidor e importador administrativo. Manter a interface atual no armazenamento local até que a etapa 4 permita proteger as operações internas. Não expor uma API de escrita sem autenticação para antecipar a troca de persistência da interface.

Essa separação permite validar persistência no servidor na etapa 3; o fluxo completo da interface com banco fica dependente da autenticação. A conclusão da etapa 3 exige testes reais em Postgres isolado, não apenas mocks ou inspeção de SQL.

## Modelo proposto para revisão

| Entidade | Dados e integridade |
| --- | --- |
| Usuários internos | Identificador local, identidade externa única, nome, CPF obrigatório textual normalizado e estado de acesso; sem senhas, sessões ou FK para tabelas gerenciadas do provedor. Concessão de acesso fica na etapa 4. |
| Projetos | Campos atuais, responsável opcional por ID e nome legado preservado, versão para concorrência, visibilidade inicialmente privada, link público inicialmente desabilitado e data de arquivamento. Preservar IDs legados textuais. |
| Alternativas | Projeto, posição, nome, custo e observações; preservar ordem e valores existentes. Custos não negativos com representação decimal. |
| Avaliações | Projeto, nome, CPF textual normalizado, nota inteira de 1 a 5, comentário, visibilidade e data. Obrigatoriedade e `UNIQUE(project_id, cpf)` também no banco, inclusive para avaliações ocultas. |
| Auditoria | ID, referência histórica do projeto, ação, data, ator opcional por ID, texto legado e snapshots JSON completos. Não exigir existência do projeto atual para preservar exclusões antigas. |
| Importações | Identificador da origem, digest do conteúdo normalizado e resultado para reconhecer repetição; preservar vínculo entre IDs de origem e registros importados. |

Nenhuma cascata deve apagar avaliações ou histórico. Novas alterações de projeto, alternativas e auditoria devem participar da mesma transação. Atualizações exigem a versão esperada; conflito ou falha reverte toda a operação. Não inferir autoria antiga pelo responsável do projeto. Convites, sessões e provisionamento ficam para a etapa 4.

## Importação proposta

1. Ler arquivo exportado explicitamente fornecido; validar formato, projetos, eventos e snapshots antes de escrever. Não acessar automaticamente dados do navegador.
2. Produzir prévia com contagens, IDs conflitantes, responsáveis sem mapeamento e exemplos conhecidos. Não imprimir conteúdo pessoal ou snapshots nos logs.
3. Exigir seleção explícita dos exemplos a manter ou excluir. Não identificar exemplos apenas pelo título, nem descartar histórico silenciosamente.
4. Preservar o nome legado e deixar a referência ao usuário vazia até existir mapeamento confirmado. Não criar contas a partir de nomes.
5. Importar atomicamente; repetição do mesmo conteúdo e origem não cria novas linhas. Reuso de IDs com conteúdo diferente deve gerar conflito, não sobrescrever registros. Repetições simultâneas precisam ser serializadas por restrições/transações no banco.
6. Reconciliar projetos, alternativas, eventos e snapshots com a prévia. Preservar o arquivo original e o localStorage; não limpar a origem após importar.

## Sequência e critérios de aceite

1. Definir Git, aprovar o desenho e a dependência de acesso ao banco; preparar migrations e código local com TDD.
2. Testar validação de importação, dados inválidos, repetição, conflito de IDs, preservação de snapshots e responsáveis antigos com dados sintéticos.
3. Após autorização do ambiente de desenvolvimento, aplicar migrations e testar persistência após nova conexão, rollback projeto/auditoria, conflito de versão e duas inserções concorrentes da mesma avaliação.
4. Testar também que ocultar avaliação não libera o CPF, zeros iniciais são preservados e nenhum histórico é perdido por exclusão de projeto.
5. Executar regressão existente e verificação de sintaxe. Registrar separadamente testes unitários e testes reais de integração; não declarar concorrência validada por mock.
6. Documentar comandos de importação, prévia, reconciliação e recuperação no ambiente de desenvolvimento. Submeter diff para revisão e pedir autorização separada para commit.

Validação manual futura: em banco isolado vazio, importar um arquivo sintético, conferir contagens e snapshots, repetir a importação, confirmar ausência de duplicações e provocar uma falha para verificar rollback. Não usar produção.

## Autorizações e decisões necessárias

Solicitar autorização para inicializar Git sem commit, adotar o modelo acima, preparar migrations e instalar `@neondatabase/serverless` com versão fixa e lockfile. A implementação local não inclui aplicação de migrations remotas, criação de recursos, autenticação, deploy, commit ou push.

Antes de aplicar qualquer migration, identificar o ambiente de desenvolvimento e confirmar permissões efetivas e autorização específica. Antes de importar dados reais, confirmar origem, mapeamento e tratamento dos exemplos. Retenção e recuperação de dados pessoais continuam pendentes para publicação; os testes iniciais usam somente dados sintéticos.
