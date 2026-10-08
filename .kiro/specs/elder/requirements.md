# Elder — Requirements

> **Mudança de escopo (Wave 1 — Firebase):** o Elder deixou de ser um protótipo e passou a ser um
> produto em fase de finalização, com backend real no Firebase. Cadastro e login usam **Firebase
> Authentication**; perfis de usuário, favoritos, avaliações e tarefas são persistidos no
> **Cloud Firestore**; exames, receitas e demais arquivos ficam no **Firebase Storage**. Os dados
> agora **persistem entre sessões**. O catálogo (`CATEGORY_DATA`) permanece como seed local nesta
> fase. A **Wave 2** reserva notificações push via Firebase Cloud Messaging (FCM) e ainda não faz
> parte desta entrega.

## User Stories

### US-01 — Seleção de conta
WHEN o usuário abre o app
THE SYSTEM SHALL exibir três opções de conta: Idoso, Família e pessoa assistida, Comércio e parceiros
THE SYSTEM SHALL apresentar cada opção como um card com ícone, título e descrição, e alvo de toque mínimo de 56px

### US-02 — Cadastro (Firebase Authentication) [Wave 1]
WHEN o usuário seleciona um tipo de conta
THE SYSTEM SHALL navegar para uma tela de cadastro exibindo o tipo de conta selecionado em formato pill
THE SYSTEM SHALL solicitar nome, e-mail e senha do usuário
THE SYSTEM SHALL manter o botão "Continuar" desabilitado até que o nome tenha pelo menos 2 caracteres
WHEN o usuário confirma o cadastro de Idoso ou Família
THE SYSTEM SHALL criar a conta via Firebase Authentication (createUserWithEmailAndPassword) e gravar o perfil (nome, role, e-mail) em `users/{uid}` no Firestore
WHEN o tipo de conta é "Comércio e parceiros"
THE SYSTEM SHALL bloquear o cadastro antes de qualquer chamada ao Firebase e exibir que o Portal do Parceiro ainda não está disponível (Wave 1)
THE SYSTEM SHALL manter a sessão autenticada entre reinícios do app via persistência do Firebase Auth (AsyncStorage)

### US-02b — Login [Wave 1]
WHEN um usuário já cadastrado informa e-mail e senha
THE SYSTEM SHALL autenticar via Firebase Authentication (signInWithEmailAndPassword) e carregar o perfil de `users/{uid}`
WHEN as credenciais são inválidas
THE SYSTEM SHALL exibir uma mensagem de erro sem travar a tela
WHEN o usuário toca em "Sair" no cabeçalho da tela Explorar
THE SYSTEM SHALL encerrar a sessão (signOut) e retornar à tela inicial

### US-03 — Explorar serviços
WHEN o usuário (Idoso ou Família) conclui o cadastro ou faz login
THE SYSTEM SHALL navegar para a tela Explorar
THE SYSTEM SHALL exibir um card de boas-vindas com o nome do perfil carregado do Firestore
THE SYSTEM SHALL exibir uma barra de busca funcional que filtra os negócios do catálogo (seed local) por nome em tempo real
THE SYSTEM SHALL exibir seis categorias de serviços em grid 2×3
THE SYSTEM SHALL exibir três serviços próximos ilustrativos
THE SYSTEM SHALL exibir no cabeçalho um ícone de pasta ("Meus documentos") e um ícone de sair ("Sair")

### US-04 — Busca por nome
WHEN o usuário digita 2 ou mais caracteres na barra de busca
THE SYSTEM SHALL exibir resultados filtrados dos negócios fictícios dentro do card de boas-vindas
WHEN o usuário toca em um resultado
THE SYSTEM SHALL navegar diretamente para a tela de detalhe do negócio

### US-05 — Descobrir por categoria
WHEN o usuário toca em uma categoria
THE SYSTEM SHALL navegar para a tela de listagem daquela categoria
THE SYSTEM SHALL exibir os negócios em cards com ícone, nome, tag, avaliação e distância
THE SYSTEM SHALL exibir três filtros de ordenação (Mais próximo, Mais avaliados, Recentes) num container com título "FILTROS"
WHEN o usuário seleciona um filtro
THE SYSTEM SHALL reordenar os cards com animação de deslizamento (320ms, ease-out cubic)
THE SYSTEM SHALL exibir um mapa do Google Maps Embed via WebView abaixo da lista

### US-06 — Favoritar [Wave 1: persistido no Firestore]
WHEN o usuário toca no botão de coração em um card de negócio
THE SYSTEM SHALL alternar o estado de favorito de forma otimista e persistir em `users/{uid}/favorites` no Firestore
THE SYSTEM SHALL refletir o mesmo estado na tela de detalhe do mesmo negócio
THE SYSTEM SHALL reverter apenas o id afetado caso a gravação falhe

### US-07 — Detalhe do negócio
WHEN o usuário toca em um card de negócio
THE SYSTEM SHALL exibir um bloco de cor sólida reservado para imagem futura
THE SYSTEM SHALL exibir nome, média de avaliações, tag da categoria e distância
THE SYSTEM SHALL exibir uma descrição curta do negócio
THE SYSTEM SHALL exibir as avaliações existentes carregadas de `businesses/{businessId}/reviews` no Firestore
THE SYSTEM SHALL exibir um formulário de nova avaliação com seletor de estrelas e campo de texto
WHEN o usuário preenche estrelas e comentário e toca em "Enviar avaliação"
THE SYSTEM SHALL gravar a avaliação no Firestore e adicioná-la ao topo da lista de forma otimista, mantendo o texto caso a gravação falhe

### US-08 — Rotina de cuidado
WHEN o usuário navega para a tela Cuidados
THE SYSTEM SHALL exibir um toggle "Hoje / Semana", com "Hoje" selecionado por padrão
WHEN "Hoje" está selecionado
THE SYSTEM SHALL exibir as tarefas do dia atual (quarta-feira fictícia) em cards generosos
WHEN "Semana" está selecionado
THE SYSTEM SHALL exibir todos os dias da semana em fila vertical, do mais próximo ao mais distante
WHEN o usuário toca em "Concluir" num card de tarefa
THE SYSTEM SHALL marcar o card com check verde e texto riscado, sem remover o card, persistindo o estado em `users/{uid}/tasks` no Firestore (otimista, revertendo em caso de falha)

### US-10 — Meus documentos (Firebase Storage) [Wave 1]
WHEN o usuário toca no ícone de pasta no cabeçalho da tela Explorar
THE SYSTEM SHALL navegar para a tela "Meus documentos"
THE SYSTEM SHALL listar os arquivos do usuário armazenados em `users/{uid}/documents/` no Storage
WHEN o usuário escolhe um arquivo (document picker) ou uma foto (image picker)
THE SYSTEM SHALL enviar o arquivo para o Storage e exibir indicação de progresso; um cancelamento é um no-op
WHEN o usuário toca em excluir num documento
THE SYSTEM SHALL remover o arquivo do Storage e refletir a remoção na lista
WHEN um envio, listagem ou exclusão falha
THE SYSTEM SHALL exibir uma mensagem de erro sem travar o app

### US-09 — Navegação flutuante
WHEN o usuário está na tela Explorar ou Cuidados
THE SYSTEM SHALL exibir um pill flutuante centralizado no rodapé com as abas "Explorar" e "Cuidados"
THE SYSTEM SHALL destacar a aba correspondente à tela atual em terracotta
WHEN o usuário toca na outra aba
THE SYSTEM SHALL navegar para a tela correspondente

## Acceptance Criteria Gerais

- Todas as telas após o login devem exibir a logo horizontal azul no topo via componente `<Logo size="sm" />`
- **Os dados persistem entre sessões** (perfil, favoritos, avaliações, tarefas e documentos ficam no Firebase); a sessão de autenticação é restaurada no reinício
- O app deve funcionar no Expo Go sem build nativo adicional (SDK JS do Firebase + AsyncStorage + expo-document-picker + expo-image-picker; sem `@react-native-firebase`, sem `getAnalytics`)
- Tipografia exclusivamente Hanken Grotesk em quatro pesos
- Paleta restrita a navy (`#11375C`), offwhite (`#FDF9F6`) e terracotta (`#DD7C54`) e seus derivados
- `npx tsc --noEmit` e `npx expo lint` devem passar sem erros

## Escopo por Wave

- **Wave 1 (esta entrega):** backend Firebase — Authentication (cadastro/login/logout), Firestore
  (perfis, favoritos, avaliações, tarefas) e Storage (documentos). Catálogo permanece seed local.
- **Wave 2 (reservada):** notificações push via Firebase Cloud Messaging (FCM); Portal do Parceiro.
