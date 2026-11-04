# Etapa 4 — autenticação e acesso interno

Preparação iniciada em 4 de novembro de 2026, a pedido do usuário. Este documento é uma proposta revisável; não registra autenticação implementada nem autorização para alterar produção.

## Contexto verificado

- O plano aprovou Neon Managed Better Auth, e-mail e senha, acesso interno por convite, e-mail verificado e CPF obrigatório para usuários internos.
- Qualquer usuário interno ativo pode gerar convites válidos por 48 horas, compartilhados manualmente.
- `server/server.cjs` serve somente arquivos estáticos. A interface ainda usa localStorage. Não existe API interna autenticada.
- `vault.internal_users` já possui identidade externa única, nome, CPF e estado ativo. A migration 001 não contém convites e não deve ser modificada depois de aplicada.
- A branch Git atual é `etapa-3-persistencia`, sem commit e com os arquivos não rastreados. Preservar esse estado; não incluir arquivos preexistentes em commits sem autorização.
- Base de regressão executada nesta preparação: `npm test`, 31 aprovados, zero falhas. A integração completa da persistência com Neon de desenvolvimento continua pendente.

## Implementação local proposta

1. Separar o adaptador de identidade do provedor, as regras de autorização e o repositório de convites. Manter HTML/JavaScript e o servidor Node existentes, sem migração de framework.
2. Implementar login, cadastro para aceitar convite, verificação de e-mail, logout e recuperação de senha via SDK oficial. Confirmar versão, contratos e modo de empacotamento antes de solicitar instalação das dependências concretas. Não implementar armazenamento de senhas no Vault.
3. Verificar no servidor a sessão do provedor, o e-mail verificado e o usuário interno ativo em cada operação interna. Identidade e autor vêm da sessão validada, nunca do corpo da requisição. Negar acesso em caso de falha do provedor ou configuração ausente.
4. Validar a integração de sessão no Node antes de adaptar ao Workers. Não assumir que validar somente um JWT comprova sessão ainda ativa após logout; verificar expiração, revogação e origem com o contrato efetivamente escolhido.
5. Preparar migration 002 aditiva para convites: identificador, hash único do token, emissor, criação, expiração, consumo/aceitante e revogação. Proposta: token criptograficamente aleatório, de uso único; armazenar apenas hash. Consumo e concessão de acesso na mesma transação, com proteção contra dois aceites simultâneos. GET nunca consome convite.
6. Proposta de experiência: link sem e-mail de destinatário, utilizável pela primeira conta com e-mail verificado que o aceitar. Solicitar nome e CPF válido no aceite; não registrar CPF ou token em logs. Não reativar usuário desabilitado silenciosamente. O vínculo do convite a um e-mail ainda depende da decisão do usuário.
7. Preparar comando administrativo para o primeiro usuário, sem rota pública de bootstrap. Receber identidade confirmada, nome e CPF por entrada segura; conferir e-mail verificado, ambiente e ausência de provisionamento anterior. Executar somente após autorização específica do destino e da pessoa.
8. Integrar a gestão existente à API protegida: projetos, alternativas, auditoria e lista mínima de responsáveis. Preservar controle de versão, transações e nomes legados. Não importar localStorage automaticamente nem usar dados locais como fallback silencioso de uma sessão autenticada. Controles novos de visibilidade e arquivamento permanecem na etapa 5.

As rotas de login, cadastro, verificação, recuperação e aceite devem funcionar sem autorização interna prévia, conforme cada fluxo; aceite exige sessão válida e e-mail verificado. Consultas e alterações de gestão exigem os três controles. Respostas internas não devem devolver CPF ou dados completos do provedor. Alterações autenticadas por cookie exigem proteção contra CSRF e verificação de origem; retornos de autenticação devem usar destinos permitidos.

## Decisões e autorizações antes de implementar

- Autorizar explicitamente alterações locais de autenticação/autorização, tratamento do CPF interno no aceite e preparação da migration 002, conforme o desenho acima. O pedido de início permite esta preparação; as instruções do projeto exigem aprovação específica para essas alterações sensíveis.
- Decidir se o convite é transferível, sem vínculo de e-mail (recomendação para manter o fluxo simples aprovado), ou exclusivo para um e-mail informado na geração.
- Definir quem pode revogar convites. Sugestão: o emissor revoga apenas os próprios convites ainda não consumidos. Revogação de acesso de usuários não será inferida dessa permissão.
- Aprovar separadamente dependências concretas após análise de compatibilidade. Não instalar React, Next.js, Wrangler ou serviços adicionais por padrão.
- Para integração real, autorizar ambiente de desenvolvimento vazio, com dados sintéticos e Auth próprio. Não clonar dados ou sessões reais de produção para testes. A configuração existente documentada é de produção e não serve de destino de testes.
- Identidade do primeiro usuário, configuração de SMTP e domínio de produção podem ser definidos depois da implementação local, antes da ativação. Não solicitar CPF real no chat.

## Critérios de aceite e validação

- TDD para ausência/invalidade/expiração de sessão, e-mail não verificado, conta sem convite, usuário inativo e falsificação de autor. API deve recusar chamada direta, independentemente da interface.
- TDD para convite válido, expirado exatamente em 48 horas, revogado, já utilizado e token inválido; CPF inválido não consome convite. Falha na concessão deve reverter o consumo.
- Integração em Postgres descartável para aceite concorrente, rollback, identidade externa única e persistência após nova conexão. Mocks não comprovam esses critérios.
- Verificação real do provedor em desenvolvimento: cadastro, verificação de e-mail, login, recarga, logout, acesso após logout, recuperação válida/expirada e resposta sem enumeração de contas.
- Testes HTTP para autorização de todas as rotas internas, ausência de campos sensíveis, origem/CSRF conforme transporte escolhido e preservação da lista explícita de arquivos públicos.
- Regressão com `npm test` e `node --check` nos arquivos alterados. Conferência manual de teclado, mensagens de erro e celular nos novos fluxos.
- Solicitar revisão independente de autenticação/autorização antes de considerar a etapa validada. Registrar achados e correções; nenhuma revisão foi feita nesta preparação.

## E-mail e limites

A documentação oficial consultada em 4 de novembro informa que SMTP compartilhado permite códigos de verificação e recuperação para desenvolvimento; links de verificação exigem SMTP próprio. Produção requer a configuração apropriada de remetente e domínios. Não é necessário contratar um serviço de e-mail apenas para iniciar testes isolados, mas nenhum envio foi feito nesta preparação.

Referências: [fluxo de autenticação](https://neon.com/docs/auth/authentication-flow), [checklist de produção](https://neon.com/docs/auth/production-checklist), [arquitetura aprovada e pendências](arquitetura-etapa-2.md), [plano geral](plano-avaliacoes.md).

## Entrega desta preparação

Somente este documento foi criado. Nenhuma alteração de código, dependência, banco, credencial, recurso remoto, branch, commit ou deploy. Não há ciclo RED/GREEN novo porque ainda não houve implementação. A etapa 4 permanece em preparação, aguardando as decisões específicas acima.
