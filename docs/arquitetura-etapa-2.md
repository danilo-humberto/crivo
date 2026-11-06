# Arquitetura proposta para o Vault

Consolidada em 6 de novembro de 2026. Neon Managed Better Auth, autorização interna por convite e fotos diretas foram adotados; a implementação atual roda em Node. Migrations 001/002, primeiro usuário e testes controlados constam no [histórico](historico-implementacao.md). Workers ainda não foi validado. O [README](../README.md) descreve os comandos atuais e o [plano](plano-avaliacoes.md) concentra o acompanhamento das etapas.

## Composição proposta

| Componente | Proposta | Motivo |
| --- | --- | --- |
| Interface | Manter HTML, CSS e JavaScript atuais | Evitar migração de framework sem necessidade. |
| Hospedagem | Cloudflare Workers com Static Assets | Entregar arquivos e API na mesma origem. |
| API | Worker com rotas explícitas, validação e autorização no servidor | Separar consultas públicas das operações internas. |
| Banco | Postgres no Neon | Persistência transacional, restrições de integridade e auditoria. |
| Acesso ao banco | Driver oficial @neondatabase/serverless, SQL parametrizado e migrations SQL versionadas | Compatibilidade documentada com ambientes serverless; evitar ORM inicialmente. |
| Fotos | URL direta do servidor informado, composta com CPF salvo no Neon | Não usar armazenamento de imagens no Vault nem R2. |
| E-mails | Serviço ainda a definir para verificação de e-mail e recuperação de senha | Convites serão links copiados e compartilhados manualmente, sem envio de e-mail pelo Vault. |
| Autenticação | Neon Managed Better Auth e autorização interna no Vault | Opção A aprovada: somente convidados acessam a gestão, mesmo que existam outras contas no provedor. |

Workers pode servir assets e executar APIs; o servidor Node local atual não será publicado sem adaptação. Empacotar apenas os arquivos web necessários, nunca a raiz do projeto. Arquivos internos e segredos não entram no diretório de assets. O driver Neon oferece HTTP para consultas/transações não interativas e WebSockets para sessões interativas; escolher o modo conforme a transação. [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [driver Neon](https://neon.com/docs/serverless/serverless-driver).

## Autenticação aprovada

Em 4 de novembro de 2026, o usuário escolheu a opção A: Neon Managed Better Auth, com e-mail e senha, e lista de usuários autorizados no Vault. Cadastro no provedor não concede acesso ao sistema interno. Essa decisão substitui a exigência anterior de impedir qualquer cadastro no provedor.

Todas as rotas internas verificam identidade autenticada, e-mail verificado e autorização ativa no Vault. A lista de responsáveis também deve considerar somente usuários internos autorizados, não todas as contas do provedor. Ocultar botões ou a tela de cadastro não substitui a autorização no servidor.

O Neon gerencia senhas e sessões; o Worker não executará hash de senhas por conta própria. A integração e a validação de sessão no runtime ainda precisam ser testadas. A documentação do provedor distingue sua API gerenciada de uma instância livremente configurável da biblioteca Better Auth. [Fluxo do Neon Auth](https://neon.com/docs/auth/authentication-flow).

## Convites e recuperação

- Primeiro usuário já provisionado conforme registro operacional. Em novos ambientes: provisionamento controlado por comando administrativo, após definição explícita do e-mail e do ambiente. Sem endpoint público de bootstrap nem senha padrão.
- Convite por link aprovado: o usuário gera um link na área interna, copia e compartilha pelo canal de sua escolha. O Vault não envia e-mail de convite. Quem recebe abre o link, cria uma conta ou entra com e-mail e senha e aceita o convite para obter acesso interno.
- Validade aprovada: 48 horas a partir da geração, verificada no servidor no aceite. Implementado na etapa 4: token aleatório, de uso único, revogável e somente seu hash no banco. Consumir o convite e conceder acesso na mesma transação, após autenticação; abrir o link por GET não deve consumi-lo. Decisão adotada: sem vínculo a e-mail; somente o emissor revoga seus convites não consumidos.
- Todos os usuários internos ativos podem gerar convites, conforme decisão aprovada. A API deve verificar sessão e autorização interna antes da geração. A permissão para revogar acessos de usuários permanece a definir; não inferi-la da permissão de convidar.
- Recuperação de senha pelas APIs do provedor/biblioteca, com respostas que não revelem a existência de contas e URLs de retorno previamente permitidas.
- O Neon recomenda SMTP próprio para produção. Resend é candidato, não serviço já contratado. É necessário confirmar domínio de envio e acesso ao DNS ou SMTP corporativo disponível. [Checklist Neon](https://neon.com/docs/auth/production-checklist), [e-mail Better Auth](https://better-auth.com/docs/concepts/email).

## Banco e contratos aprovados

Consultas públicas de projetos foram implementadas na etapa 6 em Node, com validação local. Avaliações públicas e curadoria continuam como requisitos das etapas 7/8, ainda não implementados. O schema e a gestão interna já existem.

Modelo adotado: usuários internos vinculados à identidade de autenticação, projetos, alternativas, avaliações, auditoria e convites, com Neon Managed Better Auth. Não definir chaves estrangeiras para tabelas gerenciadas de autenticação antes de confirmar seus contratos.

- Projetos: responsável por identificador, status, is_public, show_solution_url, archived_at e versão para controle de concorrência.
- Avaliações: projeto, nome, nota, comentário, CPF normalizado como texto, visibilidade e datas; UNIQUE(project_id, cpf), nota de 1 a 5 e campos obrigatórios no banco e no servidor.
- Auditoria: ator, ação, data e snapshots; alteração de projeto e registro gravados na mesma transação.
- Consultas públicas selecionam campos explicitamente. Não devolver objetos internos completos. Retornar photoUrl montada no servidor, sem campo cpf separado; o CPF continua acessível dentro dessa URL por decisão aprovada.
- Remoção de projeto com avaliação significa arquivamento; não usar cascata destrutiva para apagar avaliações e histórico.
- Migração: exportação local, validação em ambiente de desenvolvimento, mapeamento de responsáveis, tratamento explícito dos exemplos, importação idempotente e reconciliação das contagens.

## Fotos e CPF: contrato aprovado

Decisão aprovada em 4 de novembro de 2026: salvar CPF no banco e montar a URL da foto ao listar avaliações. Não usar R2, proxy de imagens, HMAC ou cópia local da foto.

- Receber CPF por HTTPS, normalizar e validar os 11 dígitos, preservando zeros à esquerda. Armazenar como texto, nunca número.
- Impedir avaliações duplicadas com UNIQUE(project_id, cpf), inclusive para avaliações ocultas e envios simultâneos.
- Configurar EMPLOYEE_PHOTO_BASE_URL como https://intranet-cifra.netlify.app/funcionarios/{cpf}.jpeg e substituir o marcador pelo CPF normalizado. Não aceitar URL arbitrária do visitante.
- A API pública retorna a URL apenas para avaliações visíveis de projetos públicos e não arquivados. O navegador busca a imagem diretamente no servidor de origem.
- Se a imagem falhar, usar avatar local padrão, sem repetir indefinidamente o carregamento e sem impedir a avaliação.
- Não exibir CPF como texto no card nem incluir campo cpf separado na resposta pública. Não registrar CPF, corpo da avaliação ou URL da foto nos logs.

Consequência deste desenho: CPF integra a URL entregue ao navegador e pode ser visto pelo público no HTML, na resposta da API ou na aba de rede. Não há promessa de sigilo do CPF nessa URL. O servidor de fotos recebe a requisição diretamente do visitante. CPF informado e foto encontrada continuam sem comprovar identidade.

Ocultar a avaliação remove sua apresentação no Vault; não revoga a URL de origem nem elimina cópias já obtidas. Alterações da foto na origem podem aparecer posteriormente conforme o cache do navegador/servidor. A política de retenção de CPFs, avaliações, backups e logs ainda requer decisão do responsável.

## Limites e custos consultados

Referência histórica consultada em 4 de novembro de 2026, não revalidada nesta consolidação. Valores em dólares sujeitos a mudança; confirmar nas fontes antes de decidir publicação ou contratação. Franquia não garante custo zero ou disponibilidade.

| Serviço | Limite publicado | Implicação |
| --- | --- | --- |
| Workers Free | 100 mil requisições/dia; 10 ms de CPU/requisição | Medir CPU da API e validação de sessão; fotos são carregadas diretamente da origem. |
| Workers pago | Assinatura base de US$ 5/mês, com franquias e excedentes | Alternativa sujeita a aprovação; não foi contratada. |
| Neon Free | 100 CU-h/mês/projeto; 1 GB de banco/projeto | Monitorar consumo e crescimento da auditoria; não guardar imagens no Postgres. |
| Resend Free | 3 mil e-mails/mês, no máximo 100/dia | Candidato somente para verificação e recuperação de senha; convites não consomem envio de e-mail. |

Fontes: [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [Neon](https://neon.com/pricing), [Resend](https://resend.com/pricing).


## Dependências e configurações propostas

Dependências: @neondatabase/serverless 1.2.0 autorizado e instalado na etapa 3, com lockfile. @neon/auth 0.8.2 e esbuild 0.28.2 foram autorizados e instalados na etapa 4. Wrangler permanece não instalado; adoção depende de autorização. Manter node:test. Não introduzir React, Next.js ou ORM por padrão.

Configurações atuais, sem valores reais, estão em .env.example: DATABASE_URL, APP_ORIGIN, EMPLOYEE_PHOTO_BASE_URL e variáveis do Neon Auth. E-mail requer API key ou SMTP apropriado. O ambiente de desenvolvimento isolado permanece pendente e deverá usar credenciais e recursos distintos de produção; testes usam dados sintéticos, não cópias não anonimizadas de produção.

## Verificações antes de considerar a arquitetura validada

1. Confirmar limites de custo e domínio/remetente para verificação e recuperação de senha. Autenticação definida como opção A; todos os usuários internos ativos podem gerar convites válidos por 48 horas.
2. Aprovar dependências e uma prova isolada no runtime Workers, sem produção.
3. Verificar login, logout, convite, recuperação e negativa de acesso sem convite, inclusive por chamada direta.
4. Medir CPU e memória da API e da validação de sessão no Worker.
5. Confirmar transação projeto/auditoria e corrida de duas avaliações idênticas.
6. Testar composição da URL, preservação de zeros à esquerda, fallback e ausência de avaliações ocultas nas listagens.
7. Definir retenção e procedimento operacional de recuperação. Ensaios anteriores de restauração já foram registrados; o banco contém CPFs.

A opção A e a integração direta de fotos estão aprovadas. A etapa 2 ainda tem pendências de e-mail de produção, revogação de acesso de usuários, retenção e validação técnica. As etapas de implementação e as operações sensíveis mantêm suas autorizações específicas.
