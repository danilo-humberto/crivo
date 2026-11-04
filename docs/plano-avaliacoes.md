# Plano do catálogo público e das avaliações do Vault

## Acompanhamento da etapa 4

Em 4 de novembro de 2026, o usuário autorizou a implementação da etapa 4, as dependências fixas @neon/auth 0.8.2 e esbuild 0.28.2 e, posteriormente, a integração controlada com o Neon. A migration 002 foi aplicada; o primeiro usuário foi provisionado, verificou o e-mail e acessou a gestão. Convites usam link sem vínculo de e-mail, uso único, validade de 48 horas e revogação pelo emissor.

Validação atual: 48 testes locais e build aprovados; revisão independente realizada. Perfil, formulários, cabeçalho e transições foram ajustados e inspecionados no navegador. Logout, novo login e recuperação de senha reais continuam pendentes; a etapa não está integralmente validada. Escopo no [plano da etapa 4](implementacao-etapa-4.md) e evidências no [README](../README.md).

Plano aprovado em 3 de novembro de 2026. A implementação será incremental, começando pela organização das pastas. Este documento registra o escopo aprovado; não indica que as funcionalidades já foram implementadas.

## Contexto atual

O Vault utiliza HTML, CSS e JavaScript puro, um servidor Node para arquivos estáticos e persistência de projetos e auditoria em localStorage. Ainda não possui banco de dados ou autenticação. O responsável é informado em texto livre e os detalhes do projeto são apresentados em modal.

## Área interna

- Decisão aprovada em 4 de novembro de 2026: CPF obrigatório também no cadastro de usuários internos, armazenado como texto normalizado de 11 dígitos. Não expor esse campo nas consultas públicas nem em logs. Esta exigência é distinta do CPF das avaliações.

- Acesso interno por convite, com e-mail e senha via Neon Managed Better Auth (opção A aprovada em 4 de novembro de 2026). O provedor permite criar contas, mas somente usuários convidados e autorizados no Vault podem acessar a gestão.
- Autenticação gerenciada pelo Neon; a API do Vault verifica sessão, e-mail verificado e autorização interna ativa em cada operação protegida.
- Convites por link: o usuário gera, copia e compartilha o endereço manualmente. O Vault não envia e-mail de convite. O destinatário abre o link, cria uma conta ou entra com e-mail e senha e aceita o convite para obter acesso interno. As regras de verificação de e-mail e recuperação de senha são separadas do convite.
- Todos os usuários internos ativos podem gerar links de convite. A validade aprovada é de 48 horas a partir da geração, verificada no servidor no momento do aceite.
- Todos os usuários internos podem gerenciar todos os projetos e realizar curadoria de avaliações.
- O responsável pelo projeto será selecionado entre usuários cadastrados. Responsável e autor de uma alteração são informações distintas.
- A auditoria identificará o usuário que realizou cada nova ação. Não atribuir autoria retroativa aos registros antigos.
- Projetos com avaliações serão arquivados ao serem removidos, preservando avaliações e histórico.

## Catálogo e páginas públicas

Um link compartilhável abre o catálogo público do TI. Cada projeto visível terá uma página própria, substituindo o modal de apresentação, com detalhes e avaliações.

- Visibilidade pública independente do status: Planejado, Em andamento ou Concluído.
- Novos projetos começam privados; um usuário interno escolhe quando torná-los públicos.
- Campos públicos: nome, resumo, solução, área, status, datas e responsável.
- A exibição pública do link de acesso à solução possui controle separado, definido pelo usuário interno.
- Custos, alternativas e auditoria permanecem internos.
- Projetos privados e arquivados não podem ser consultados por endereço direto público.
- Visitantes podem consultar projetos e avaliações e enviar sua avaliação, mas não alterar projetos.
- Cards mostram estrelas, média e quantidade de avaliações, com acesso aos comentários. Sem avaliações, mostrar “Sem avaliações”.

## Avaliações e fotos

- Qualquer pessoa pode avaliar, sem login.
- Nome, CPF, nota inteira de 1 a 5 estrelas e comentário são obrigatórios.
- Uma avaliação por CPF por projeto, garantida no backend e no banco, inclusive em envios simultâneos.
- O avaliador não pode editar a avaliação após o envio.
- Publicação imediata com nome, foto ou avatar padrão, nota, comentário e data.
- Normalizar o CPF para 11 dígitos, preservando zeros à esquerda, e validá-lo no servidor.
- Armazenar o CPF normalizado como texto no Neon, preservando zeros à esquerda. Garantir unicidade por projeto e CPF. Esta decisão substitui o armazenamento por HMAC.
- A base da consulta da foto será configurada em `EMPLOYEE_PHOTO_BASE_URL`, com o padrão `https://intranet-cifra.netlify.app/funcionarios/{cpf}.jpeg`.
- Ao listar avaliações, montar a URL da foto com a base configurada e o CPF salvo. O navegador carrega a imagem diretamente do servidor informado. Não usar R2 nem armazenar cópia da foto.
- Foto inexistente ou servidor indisponível resulta em avatar padrão, sem bloquear o envio.
- Não mostrar CPF como texto na avaliação nem registrá-lo em logs. A resposta pública pode trazer photoUrl já montada, sem um campo cpf separado; essa URL contém o CPF e o expõe ao navegador.
- Ocultar a avaliação remove sua exibição no Vault, mas não revoga acesso à imagem no servidor de origem nem a URLs já conhecidas.

Limitação conhecida: CPF digitado e foto encontrada não comprovam a identidade do avaliador. O fluxo aprovado não inclui verificação de identidade; alguém pode informar o CPF de outra pessoa e ocupar sua avaliação naquele projeto.

## Curadoria

- Qualquer usuário interno pode ocultar ou reexibir avaliações.
- Não exigir motivo ou justificativa.
- Registrar automaticamente a ação e seu autor na auditoria.
- Avaliações ocultas ficam fora da listagem pública, da média e da contagem pública.
- Ocultar uma avaliação não libera uma segunda avaliação do mesmo CPF naquele projeto.
- Reexibir a avaliação restaura sua participação nos indicadores públicos.

## Etapas de implementação

| Etapa | Escopo | Critério de conclusão |
| --- | --- | --- |
| 1. Organizar o projeto | Separar regras de negócio, persistência, páginas, scripts e CSS. Atualizar caminhos e documentação. | Funcionalidades e dados atuais preservados; testes existentes passando. |
| 2. Fechar a arquitetura técnica | Validar Cloudflare gratuito, Neon e a integração de autenticação pretendida. Definir integração direta das fotos, segredos, geração de links de convite e recuperação de senha. | Arquitetura, dependências, limites e eventuais custos apresentados para aprovação. |
| 3. Implementar banco e persistência | Modelar usuários, projetos, alternativas, avaliações e auditoria. Preparar importação dos dados atuais. | Persistência no servidor, importação sem duplicações e restrição de uma avaliação por projeto e CPF. |
| 4. Implementar autenticação | Login, logout, convites, recuperação de senha e proteção das operações internas. Definir provisionamento do primeiro usuário. | Contas no provedor não concedem acesso automático; somente convidados acessam a gestão; API verifica sessão e autorização. |
| 5. Atualizar a gestão de projetos | Seleção de responsável, controles de visibilidade do projeto e do link da solução e arquivamento de projetos com avaliações. | Controles funcionando e alterações identificadas na auditoria, com tratamento dos responsáveis antigos. |
| 6. Criar catálogo e páginas públicas | Catálogo compartilhável e página individual com campos públicos, substituindo o modal de apresentação. | Projetos privados e arquivados não aparecem nem podem ser consultados por endereço direto público. |
| 7. Implementar avaliações e fotos | Formulário, validação e armazenamento do CPF, URL direta da foto na listagem, fallback e proteção contra envios abusivos. | Publicação imediata; duplicidade bloqueada inclusive sob concorrência; URL da foto montada com CPF e avatar padrão em caso de falha. |
| 8. Implementar indicadores e curadoria | Estrelas, média e quantidade nos cards; consulta de comentários; ocultação e reexibição na área interna. | Indicadores consideram apenas avaliações visíveis; curadoria atualiza indicadores e mantém bloqueio de duplicidade. |
| 9. Validar e preparar publicação | Testar fluxo completo, permissões, migração, falhas das fotos, acessibilidade e celular. Preparar backup, recuperação e documentação. | Verificações pertinentes aprovadas e publicação preparada para autorização específica. |

### Estrutura inicial proposta para a etapa 1

```text
vault/
├── docs/
├── src/
│   ├── domain/
│   ├── infrastructure/
│   └── web/
│       ├── pages/
│       ├── scripts/
│       └── styles/
├── server/
├── tests/
├── AGENTS.md
└── README.md
```

Usar a menor separação necessária, sem introduzir framework ou dependências apenas para reorganizar arquivos. Preservar a origem de acesso e as chaves de localStorage durante a etapa 1. Não misturar banco ou login nessa entrega.

## Migração e validação

- Preservar projetos, alternativas, snapshots e histórico existentes.
- Identificar dados fictícios e definir seu tratamento antes da importação.
- Mapear responsáveis antigos explicitamente; não associar nomes a contas automaticamente sem confirmação.
- Gravar alterações de projetos e auditoria de forma transacional na nova persistência.
- Usar dados sintéticos nos testes, nunca serviços ou dados reais de produção.
- Aplicar TDD aos novos comportamentos testáveis e registrar resultados reais.
- Validar autorização também na API, não apenas escondendo controles na interface.

Roteiro principal: gerar e copiar link de convite → compartilhar manualmente → destinatário abrir o link e entrar ou criar conta → aceitar convite → cadastrar projeto → selecionar responsável → publicar → acessar catálogo sem login → abrir projeto → avaliar → conferir nota e comentário → ocultar e reexibir avaliação.

Cobrir também duplicidade simultânea, avaliação sem foto, campos inválidos, projeto privado por URL direta, link da solução oculto, sessão inválida, arquivamento e preservação da auditoria.

## Decisões técnicas pendentes e autorizações

Cloudflare no plano gratuito e Neon são a infraestrutura pretendida, sem garantia de compatibilidade ou gratuidade integral antes da validação da etapa 2. Foram aprovados Neon Managed Better Auth com autorização interna por convite e CPF salvo no Neon para compor URLs diretas das fotos, sem R2 ou HMAC. Permanecem pendentes a validação da integração, serviço de e-mail, limites operacionais, provisionamento inicial e política de retenção.

A aprovação deste plano não autoriza automaticamente operações sensíveis posteriores. Solicitar autorização específica conforme as instruções do usuário para banco, autenticação, dados sensíveis, infraestrutura, dependências, commits, push, PRs, merges e produção. Preparar resultados concretos e revisáveis antes da solicitação.

Na inspeção inicial, a pasta não era um repositório Git. Definir o versionamento antes das alterações de implementação, sem criar commits sem autorização.

## Acompanhamento da etapa 1

Em 4 de novembro de 2026, a organização foi implementada: domínio, infraestrutura, páginas, scripts, estilos, servidor e testes foram separados. O inicializador server.cjs na raiz preserva o comando existente. Porta, origem e chaves de armazenamento permanecem iguais. Não foram adicionados banco, autenticação ou dependências.

Evidências: 15 testes aprovados antes da mudança e 16 depois, incluindo integração HTTP; sintaxe verificada e conferência de navegação no Chrome em origem isolada. Detalhes, limitações e roteiro manual estão no README. Implementação disponível para revisão; revisão independente e versionamento Git permanecem pendentes. A autorização para iniciar a etapa 1 foi executada com cópia local prévia dos arquivos, sem inicializar Git ou criar commit.

## Acompanhamento da etapa 2

Pesquisa e proposta registradas em [Arquitetura da etapa 2](arquitetura-etapa-2.md). Em 4 de novembro de 2026, o usuário aprovou a opção A: conta no provedor não concede acesso interno sem convite. Também determinou salvar CPF no banco e montar a URL direta da foto ao listar avaliações, sem R2. Essas decisões substituem as propostas anteriores de cadastro fechado no provedor, HMAC e cópia das fotos. As demais pendências técnicas continuam indicadas no documento.

## Acompanhamento da etapa 3

Em 4 de novembro de 2026, o usuário autorizou inicializar Git sem commit, implementar o modelo descrito no [plano da etapa 3](implementacao-etapa-3.md), preparar migrations locais e instalar o driver Neon. Git foi inicializado na branch `etapa-3-persistencia`, o driver 1.2.0 foi fixado com lockfile, e foram preparados schema SQL, repositório transacional, importador e testes. Nenhuma migration foi aplicada e nenhum recurso remoto foi criado ou acessado.

Validação local: 31 testes aprovados e sintaxe JS/CJS conferida. Testes do repositório usam conexões simuladas. O teste real de integração foi preparado, mas ainda depende de ambiente de desenvolvimento e autorização para aplicar a migration. A interface continua usando localStorage até a integração protegida pela autenticação. A etapa 3 não está concluída; não houve commit, deploy ou revisão independente. Detalhes no README.

Atualização posterior em 4 de novembro: o usuário autorizou expressamente usar `production` e aplicar a migration pelo agente, mantendo CPF obrigatório nos usuários internos. A migration 001 foi validada em PostgreSQL 18 local isolado, com dados sintéticos; backup anterior à aplicação foi restaurado com sucesso em ambiente local sem rede. A aplicação transacional em `neondb` foi concluída e verificada: oito tabelas no schema `vault`, versão 1 e nove tabelas existentes de autenticação preservadas. Não houve testes funcionais nem importação em produção. A validação completa do repositório em Neon de desenvolvimento continua pendente. Evidências e recuperação estão no README.

Atualização operacional da etapa 4 em 4 de novembro: o usuário autorizou testes controlados no banco de produção, aplicação da migration 002 e configuração do Auth. Backup restaurado e migration validada localmente antes da aplicação; versão 2 confirmada e nove tabelas Auth preservadas. Dez verificações passaram e os registros sintéticos foram removidos. Integração local configurada; cadastro, verificação e primeiro usuário concluídos. Recuperação de senha, logout e novo login reais continuam pendentes. Evidências no README.
