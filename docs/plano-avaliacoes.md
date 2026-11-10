# Plano do catálogo público e das avaliações do Vault

## Acompanhamento consolidado em 6 de novembro de 2026

O plano foi aprovado em 3 de novembro de 2026. Os requisitos abaixo descrevem o destino aprovado; o quadro distingue implementação de validação. Funcionamento e comandos atuais estão no [README](../README.md); evidências anteriores, no [histórico](historico-implementacao.md). Esta consolidação não revalidou produção.

| Etapa | Estado atual | Pendências |
| --- | --- | --- |
| 1. Organização | Implementada; estrutura separada e versionada. | Nenhuma implementação restante identificada nesse escopo. |
| 2. Arquitetura | Neon Auth com autorização interna e fotos diretas aprovados; implementação atual em Node. | Prova no Workers, e-mail de produção, limites operacionais/custos e retenção. |
| 3. Persistência | Schema, repositório e importador implementados; migration 001 aplicada conforme registro. | Integração completa em desenvolvimento isolado e migração do acervo com tratamento de exemplos e responsáveis. |
| 4. Autenticação | Implementada; migration 002 e primeiro usuário concluídos conforme registro. | Logout, novo login, recuperação reais e convite com segunda conta de ponta a ponta. |
| 5. Gestão | Responsável, visibilidade independente, criação privada e arquivamento com auditoria implementados. | Integração real de arquivamento/concorrência e validação visual completa desse fluxo. |
| 6. Catálogo público | Implementado e validado localmente; commit `6136b34` presente na main local. Integração autorizada junto à etapa 7. | Suíte de integração das consultas em PostgreSQL isolado; publicação pendente. Evidências no [plano da etapa 6](implementacao-etapa-6.md). |
| 7. Avaliações e fotos | Implementada; commit `628e303` presente na main local. Registro de 87 testes locais e ensaio SQL isolado aprovados; leitura autorizada em produção e revisão independente sem bloqueadores de código. | Fluxo completo via driver/aplicação e proteção no runtime de publicação. Produção sem projetos públicos ativos na conferência registrada. Evidências no [plano da etapa 7](implementacao-etapa-7.md). |
| 8. Indicadores e curadoria | Implementada e aprovada pelo usuário: indicadores de avaliações visíveis nos cards, link para comentários, ocultação/reexibição e auditoria. 97 testes locais aprovados e prévia sintética conferida. | Integração PostgreSQL real de curadoria/indicadores/concorrência; publicação pendente. Evidências no [plano da etapa 8](implementacao-etapa-8.md). |
| 9. Validação e preparação da publicação | [Plano aprovado](implementacao-etapa-9.md); execução iniciada com 97/97 testes locais e build aprovados. [Registro](validacao-etapa-9.md). | Fluxo completo, permissões, migração, acessibilidade, celular, runtime e operação; preparar publicação para autorização específica. |

A última suíte local é de 97/97 testes aprovados na etapa 8; evidências e limites estão no seu plano. As etapas 6 e 7 estão integradas à main local; a etapa 8 consta na main local no commit `0820b84`, conferido no planejamento da etapa 9. A integração com PostgreSQL real continua pendente; o estado remoto não foi revalidado neste planejamento. A próxima etapa do plano é a 9; as pendências anteriores permanecem abertas. Na finalização, foram conferidas as referências remotas e a ausência de workflows GitHub Actions; não houve acesso a produção. Push foi autorizado no registro da etapa 7; a etapa 8 recebeu autorização própria de commit, integração à main e push após validação da prévia pelo usuário. Isso não comprova deploy.

## Atualização da etapa 9 — 9 de novembro de 2026

As quatro suítes PostgreSQL existentes passaram no banco configurado, confirmado pelo usuário como ainda fora de uso em produção e autorizado para testes sintéticos. Configuração local ajustada para desenvolvimento; identidade, privilégios e migrations 001/002 conferidos. Esta evidência atualiza as pendências históricas de execução dessas suítes no quadro de 6 de novembro; não encerra concorrência via HTTP/arquivamento, Auth real ou publicação. [Registro completo](validacao-etapa-9.md).

Atualização posterior: development excluída após confirmação; usuário autorizou continuar na branch production ainda fora de uso. Cinco testes de integração passaram, incluindo HTTP/concorrência. Logout/novo login e cadastro → publicação → avaliação → curadoria conferidos no navegador; restauração sintética local ensaiada. Recuperação concluída pelo usuário e acesso posterior à gestão conferido; segunda conta, acessibilidade completa e publicação continuam pendentes. Consulte o registro da etapa 9. Contraste do selo Planejado corrigido (5,21:1), verificações adicionais de acessibilidade registradas e 99/99 testes locais e build aprovados.

## Contexto atual

O Vault mantém HTML, CSS e JavaScript puro, servidor Node, Neon Auth e PostgreSQL. A gestão usa API protegida; localStorage permanece como modo legado explícito, sem sincronização automática. Responsáveis são selecionados entre usuários internos, preservando nomes legados sem vínculo automático. Visitantes usam catálogo e páginas individuais renderizados no servidor; o modal da gestão permanece para dados internos e edição.
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

Cloudflare Workers continua como hospedagem pretendida, sem prova de execução ou garantia de gratuidade integral. A integração Node/Neon já foi implementada; a arquitetura ainda depende de validação no runtime de destino, e-mail de produção, limites operacionais e política de retenção. A permissão para revogar acessos de usuários permanece sem definição; não se confunde com revogar os próprios convites.

Convites sem vínculo de e-mail, uso único, validade de 48 horas e revogação pelo emissor foram adotados na etapa 4. O primeiro usuário foi provisionado. Dependências instaladas e configuração operacional estão no README; não tratar esses itens como propostas ainda não executadas.

A aprovação deste plano não autoriza operações sensíveis posteriores. Solicitar autorização específica para banco, autenticação, dados sensíveis, infraestrutura, dependências, commits, push, PRs, merges e produção. Autorizações e testes controlados anteriores não permitem novas operações em produção.

## Evidências e histórico

Os registros cronológicos das etapas 1 a 5, ciclos RED/GREEN, revisões e aplicações autorizadas das migrations estão preservados no [histórico](historico-implementacao.md). O repositório atual está versionado; os commits locais incluem autenticação e gestão da etapa 5. A indicação histórica de ausência de Git não descreve o estado atual.

### Ajuste aprovado durante a etapa 9 — verificação após cadastro

Em 9/11/2026, o usuário solicitou envio automático do código após criar conta, sem repetir o e-mail. Implementado na interface, preservando verificação e convite como requisitos de acesso interno. 103/103 testes locais e build aprovados; reenvio real aceito pelo provedor, recebimento/entrada do código e aceite do convite aguardando participação humana.


Atualização de 9/11/2026: segunda conta verificou o e-mail, recebeu acesso pelo convite autorizado e abriu a gestão. Bloqueio anterior ao aceite e recusa de novo aceite pela mesma conta conferidos. Validação de autoria por escrita nessa conta não executada. Ver [registro da etapa 9](validacao-etapa-9.md).


Atualização de 9/11/2026: autoria pela segunda conta comprovada na auditoria, com responsável preservado. Revisão independente identificou falha parcial de cadastro, corrigida e reavaliada; 105/105 testes locais e build aprovados. Prova Workers mantida pendente por decisão do usuário, sem instalar Wrangler. Publicação ainda não preparada; detalhes e limites no registro de validação da etapa 9.


Repetição do fluxo básico em 9/11/2026: projeto fictício novo criado privado, editado/publicado, avaliado, ocultado e reexibido; busca, indicador público, bloqueio de duplicidade mesmo oculta e autoria na auditoria conferidos no navegador. Sem defeito funcional observado nesse recorte; detalhes no registro de validação da etapa 9.


Atualização de 9/11/2026: confirmação de remoção agora usa modal personalizado do Vault (Cancelar como foco inicial). Arquivamento preservou avaliação e cinco eventos; exclusão de projeto sintético sem avaliações preservou snapshot completo na auditoria. 107/107 testes locais, build e revisão independente aprovados no recorte. Workers permanece pendente. Consulte o registro de validação da etapa 9.


Atualização de 9/11/2026 — Workers retomado por autorização específica do usuário: Wrangler 4.159.0 instalado; adaptação Node/Workers e proteção de avaliações por Durable Object implementadas e testadas localmente. 111/111 testes Node e 4/4 cenários workerd aprovados, com I/O externo simulado; dry-run de publicação aprovado. Destino escolhido: workers.dev. Publicação, configuração de segredos/origem e validação na borda permanecem pendentes. Detalhes no [roteiro Cloudflare](publicacao-cloudflare.md). Esta atualização substitui a suspensão anterior, preservada acima como histórico.


## Identidade aprovada — 10/11/2026

Nome do produto alterado para **Crivo**, por solicitação do usuário, com favicon próprio. Implementação e validação locais concluídas; publicação dessa mudança pendente. Identificadores técnicos e endereço existente preservados por compatibilidade. Evidências e validação manual no [README](../README.md#nome-crivo-e-favicon--10112026). Menções anteriores a Vault constituem registros históricos.


Atualização — 10/11/2026: alteração de endereço autorizada e publicada em https://crivo.cifraengenharia.workers.dev, com identidade Crivo e favicon. Neon Auth atualizado; versão a0254513-6187-4f32-a331-6a5ff868491d ativa. Testes Workers 4/4 e verificações HTTP aprovados; login real no novo domínio não repetido. Endereço anterior preservado. Nenhum commit/push adicional. [Evidências e limites](publicacao-cloudflare.md#publicação-do-crivo--10112026).


Atualização — 10/11/2026: endereço vault-ti agora redireciona automaticamente para crivo.cifraengenharia.workers.dev com HTTP 308, preservando caminho e parâmetros. Deploy 1c8464cf-0c76-452a-af8c-17d979ee8984 confirmado; 12 verificações locais, seis URLs remotas e chegada ao catálogo com 200 aprovadas. Substitui os registros anteriores de ausência de redirecionamento. Detalhes em [publicação](publicacao-cloudflare.md). Nenhum commit ou push.
