# Etapa 4 — autenticação e acesso interno

Status: implementação local preparada em 4 de novembro de 2026; integração real pendente. O usuário autorizou implementar e instalar `@neon/auth` 0.8.2 e `esbuild` 0.28.2. Posteriormente, o usuário autorizou aplicar a migration 002 e realizar testes controlados no banco de produção: aplicação concluída após backup restaurado e validação local; dez verificações passaram com limpeza dos registros sintéticos. O fluxo real de cadastro e recuperação aguarda a senha definida pelo usuário. Requisitos no [plano geral](plano-avaliacoes.md), decisões na [arquitetura](arquitetura-etapa-2.md) e execução no [README](../README.md#etapa-4-autenticação-local-preparada).

## Escopo e abordagem

Implementar login, logout, cadastro para aceite de convite, verificação de e-mail, recuperação de senha e proteção da gestão com Neon Managed Better Auth. Manter HTML/JavaScript e Node existentes.

1. Integrar o SDK oficial e validar sessão, e-mail verificado e autorização interna ativa no servidor. Cadastro no provedor não concede acesso; autoria vem da sessão. Confirmar contratos, versão e empacotamento antes de propor dependências.
2. Preparar migration 002 aditiva para convites, preservando a 001 aplicada: token aleatório com apenas hash no banco, emissor, validade de 48 horas, consumo e revogação. Aceite com nome e CPF válido; consumo e concessão de acesso na mesma transação. GET não consome convite, e usuário inativo não é reativado automaticamente.
3. Preparar comando administrativo para provisionar o primeiro usuário, com identidade e e-mail verificado conferidos, entrada segura do CPF e execução autorizada no destino escolhido. Sem endpoint público de provisionamento.
4. Integrar projetos, alternativas, auditoria e lista mínima de responsáveis à API protegida, preservando transações, versões e nomes legados. Não importar localStorage automaticamente nem usá-lo como fallback silencioso. Novos controles de visibilidade e arquivamento ficam na etapa 5.

## Escolhas e trade-offs

| Escolha | Recomendação e benefício | Custo ou alternativa |
| --- | --- | --- |
| Destinatário do convite | Link sem vínculo de e-mail, adotado na implementação autorizada: mantém a geração e o compartilhamento simples. | Quem receber o link pode aceitá-lo primeiro com e-mail verificado. Vincular a um e-mail reduz esse risco, mas exige informar o destinatário. |
| Revogação do convite | Emissor revoga seus convites não consumidos, adotado na implementação autorizada: permissão restrita e fácil de entender. | Outros usuários não conseguem intervir. Revogação por qualquer usuário facilita suporte, mas amplia permissões. Não define revogação de acesso de usuários. |
| Runtime inicial | Validar no Node existente: menor mudança e diagnóstico local mais simples. | Compatibilidade e limites do Workers continuam pendentes. Começar no Workers antecipa essa validação, mas acrescenta configuração e ferramentas. |
| Validação de sessão | Confirmar sessão ativa no provedor: permite verificar o efeito do logout. | Acrescenta latência e dependência de disponibilidade. Validar apenas JWT reduz consultas, mas pode aceitar tokens até expirarem; contrato final depende da integração. |

## Critérios de aceite e testes

- **Acesso:** TDD e testes HTTP recusam sessão ausente/inválida/expirada, e-mail não verificado, conta sem convite, usuário inativo e autor forjado. Falhas do provedor negam acesso. CPF não aparece como campo separado nem em logs; a URL da foto do próprio usuário contém o CPF por solicitação explícita. Tokens de sessão não aparecem em respostas internas ou logs; cookies exigem proteção CSRF/origem e redirecionamentos usam destinos permitidos.
- **Convites:** testar validade, expiração em 48 horas, revogação, reutilização, token e CPF inválidos. Postgres descartável deve comprovar aceite único sob concorrência, rollback, identidade externa única e persistência após reconexão.
- **Fluxo completo:** em desenvolvimento, verificar cadastro, e-mail, login, recarga, logout e acesso após logout; recuperação válida/expirada sem revelar existência de contas. Conferir teclado, erros e celular.
- **Regressão e revisão:** executar `npm test`, `node --check` nos arquivos alterados e revisão independente de autenticação/autorização. Mocks não substituem integração real.

## Aprovações e pendências

**Implementação local autorizada:** autenticação/autorização, CPF no aceite e migration 002 preparada. SDK e empacotador instalados nas versões aprovadas. Convites adotam as recomendações acima.

**Antes da integração real:** autorizar ambiente de desenvolvimento vazio, com Auth próprio e dados sintéticos. A configuração documentada é de produção; a integração completa da etapa 3 continua pendente. Não clonar dados ou sessões reais para testes.

**Antes da ativação:** definir primeiro usuário, domínio e SMTP; autorizar separadamente provisionamento, aplicação de migrations e operações de produção. Não fornecer CPF real pelo chat. Requisitos de e-mail: [checklist oficial do Neon](https://neon.com/docs/auth/production-checklist).

## Evidências atuais

Base anterior: 31 testes aprovados. Novos testes, revisão independente, correções e limitações estão registrados no README. A migration 002 foi aplicada ao destino de produção expressamente autorizado, com dez verificações controladas aprovadas. O primeiro usuário foi provisionado e o acesso à gestão foi confirmado. A etapa não está integralmente validada até concluir logout, novo login e recuperação de senha reais.

## Ajuste de interface aprovado

Foto circular e nome abaixo da logo na conta e na gestão. O servidor monta a URL com o CPF salvo e o padrão de EMPLOYEE_PHOTO_BASE_URL; o navegador mantém as iniciais enquanto carrega e quando a foto falta ou falha. O CPF não é retornado como campo separado. Formulários, mensagens, convites e layout móvel foram reorganizados sem novas dependências.
