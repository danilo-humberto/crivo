# Etapa 3 — banco, persistência e importação

Implementação preparada em 4 de novembro de 2026. Schema, repositório e importador implementados; migration 001 aplicada conforme registro operacional. Integração completa e migração do acervo pendentes. O desenho abaixo registra o escopo da etapa, não autoriza novas operações.

Atualização: o usuário autorizou inicializar Git sem commit, implementar o modelo, preparar migrations locais e instalar o driver Neon. Posteriormente autorizou a aplicação em `production` e confirmou CPF obrigatório também para usuários internos. A migration foi aplicada após validação isolada e recuperação verificada do backup; importação e teste completo do repositório continuam pendentes. Comandos atuais estão no [README](../README.md); evidências anteriores no [histórico](historico-implementacao.md).

### Destino confirmado posteriormente

O usuário autorizou usar a branch `production` do projeto `vault` e salvar suas conexões no `.env`. Configuração realizada com conexões agrupada e direta, ambiente marcado como `production`, importação e testes de integração desabilitados. O `.env` está ignorado pelo Git.

Inspeção prévia somente leitura confirmou banco `neondb`, papel `neondb_owner` com permissão para criar schema, ausência inicial do schema `vault` e nove tabelas de `neon_auth`. O destino não foi tratado como banco vazio ou descartável.

Após nova autorização explícita do usuário para o agente aplicar a migration em produção, foram atendidos os pré-requisitos: SQL validado em Postgres 18 isolado com dados sintéticos e backup prévio restaurado em ambiente local sem rede. Aplicação concluída em uma transação; leitura pós-commit confirmou versão 1 e oito tabelas em `vault`, incluindo CPF obrigatório em usuários internos. As nove tabelas de autenticação permanecem existentes. Não executar `npm run test:integration` nessa branch. Backup, hash e evidências estão no histórico; o roteiro atual de recuperação e limites estão no README.

## Evidências históricas

A base anterior tinha 16 testes e usava localStorage. A evolução do versionamento, instalação e aplicação do banco está no [histórico](historico-implementacao.md). O estado atual é descrito no README; o acervo legado contém exemplos fictícios que exigem seleção explícita antes da importação.

## Escopo implementado

Preparar migrations SQL revisáveis, repositório de persistência no servidor e importador administrativo. Na etapa 3, a interface foi mantida no armazenamento local; a etapa 4 posteriormente integrou a API protegida. Não expor uma API de escrita sem autenticação para antecipar a troca de persistência da interface.

Essa separação permitiu preparar a persistência antes da API autenticada, integrada na etapa 4. A conclusão da etapa 3 exige testes reais em Postgres isolado, não apenas mocks ou inspeção de SQL.

## Modelo adotado

| Entidade | Dados e integridade |
| --- | --- |
| Usuários internos | Identificador local, identidade externa única, nome, CPF obrigatório textual normalizado e estado de acesso; sem senhas, sessões ou FK para tabelas gerenciadas do provedor. Concessão de acesso fica na etapa 4. |
| Projetos | Campos atuais, responsável opcional por ID no schema para preservar importações legadas; novos projetos da gestão exigem usuário ativo desde a etapa 5, com nome legado preservado, versão para concorrência, visibilidade inicialmente privada, link público inicialmente desabilitado e data de arquivamento. Preservar IDs legados textuais. |
| Alternativas | Projeto, posição, nome, custo e observações; preservar ordem e valores existentes. Custos não negativos com representação decimal. |
| Avaliações | Projeto, nome, CPF textual normalizado, nota inteira de 1 a 5, comentário, visibilidade e data. Obrigatoriedade e `UNIQUE(project_id, cpf)` também no banco, inclusive para avaliações ocultas. |
| Auditoria | ID, referência histórica do projeto, ação, data, ator opcional por ID, texto legado e snapshots JSON completos. Não exigir existência do projeto atual para preservar exclusões antigas. |
| Importações | Identificador da origem, digest do conteúdo normalizado e resultado para reconhecer repetição; preservar vínculo entre IDs de origem e registros importados. |

Nenhuma cascata deve apagar avaliações ou histórico. Novas alterações de projeto, alternativas e auditoria devem participar da mesma transação. Atualizações exigem a versão esperada; conflito ou falha reverte toda a operação. Não inferir autoria antiga pelo responsável do projeto. Convites, sessões e provisionamento foram implementados na etapa 4.

## Contrato de importação

1. Ler arquivo exportado explicitamente fornecido; validar formato, projetos, eventos e snapshots antes de escrever. Não acessar automaticamente dados do navegador.
2. Produzir prévia com contagens, exclusões e quantidade de responsáveis sem vínculo. A CLI não lista dados pessoais nem consulta conflitos de IDs no banco durante a prévia; conflitos são detectados na aplicação. Não imprimir conteúdo pessoal ou snapshots nos logs.
3. Exigir seleção explícita dos exemplos a manter ou excluir. Não identificar exemplos apenas pelo título, nem descartar histórico silenciosamente.
4. Preservar o nome legado e deixar a referência ao usuário vazia até existir mapeamento confirmado. Não criar contas a partir de nomes.
5. Importar atomicamente; repetição do mesmo conteúdo e origem não cria novas linhas. Reuso de IDs com conteúdo diferente deve gerar conflito, não sobrescrever registros. Repetições simultâneas precisam ser serializadas por restrições/transações no banco.
6. Reconciliar projetos, alternativas, eventos e snapshots com a prévia. Preservar o arquivo original e o localStorage; não limpar a origem após importar.

## Sequência original e critérios de aceite

1. Definir Git, aprovar o desenho e a dependência de acesso ao banco; preparar migrations e código local com TDD.
2. Testar validação de importação, dados inválidos, repetição, conflito de IDs, preservação de snapshots e responsáveis antigos com dados sintéticos.
3. Após autorização do ambiente de desenvolvimento, aplicar migrations e testar persistência após nova conexão, rollback projeto/auditoria, conflito de versão e duas inserções concorrentes da mesma avaliação.
4. Testar também que ocultar avaliação não libera o CPF, zeros iniciais são preservados e nenhum histórico é perdido por exclusão de projeto.
5. Executar regressão existente e verificação de sintaxe. Registrar separadamente testes unitários e testes reais de integração; não declarar concorrência validada por mock.
6. Documentar comandos de importação, prévia, reconciliação e recuperação no ambiente de desenvolvimento. Submeter diff para revisão e pedir autorização separada para commit.

Validação manual futura: em banco isolado vazio, importar um arquivo sintético, conferir contagens e snapshots, repetir a importação, confirmar ausência de duplicações e provocar uma falha para verificar rollback. Não usar produção.

## Autorizações e decisões necessárias

Git, modelo, migrations locais e driver foram autorizados e implementados. A aplicação remota da migration 001 recebeu autorização própria e foi concluída. A API autenticada foi integrada na etapa 4 e a gestão evoluiu na etapa 5. Novas operações sensíveis continuam exigindo autorização específica.

Antes de aplicar qualquer migration, identificar o ambiente de desenvolvimento e confirmar permissões efetivas e autorização específica. Antes de importar dados reais, confirmar origem, mapeamento e tratamento dos exemplos. Retenção e recuperação de dados pessoais continuam pendentes para publicação; os testes iniciais usam somente dados sintéticos.
