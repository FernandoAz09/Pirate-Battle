# Pirate Battle — arquitetura

## Objetivos e limites

O jogo é uma aplicação React + TypeScript que combina uma interface de navegação
com um arena PixiJS. A arquitetura mantém o estado de tela e os fluxos de
persistência fora do renderer para que a experiência possa evoluir sem acoplar
regras de negócio ao canvas.

## Camadas

- `src/main.tsx` inicializa o React, o `QueryClient` e o worker do MSW antes de
  renderizar o App. O Query Client usa cache curto, uma tentativa de retry e
  não refaz consultas apenas por foco da janela.
- `src/App.tsx` é o orquestrador de telas (`menu`, `options`, `game`, `result`,
  `ranking` e `history`). Também valida os limites das opções, coordena o
  resultado da partida e compõe os estados de carregamento, erro e paginação.
- `src/game/GameCanvas.tsx` é o adaptador visual e de entrada do PixiJS. Ele
  recebe opções e callbacks, controla o ciclo visual da arena e devolve um
  `GameResult` ao terminar. A UI não acessa objetos PixiJS diretamente.
- `src/types.ts` define os contratos compartilhados (`GameOptions`,
  `GameResult` e `EndReason`) usados pela UI, API e mocks.
- `src/api.ts` concentra o cliente Axios e os casos de uso remotos:
  `getRanking`, `getHistory` e `recordGame`. As chaves do TanStack Query
  incluem a configuração da partida ou o nome do jogador para evitar cache
  incorreto entre consultas.

## Simulação e renderização

As regras de jogo devem permanecer determinísticas e independentes de PixiJS:

1. A simulação recebe uma configuração, um relógio e, quando necessário, uma
   seed de aleatoriedade.
2. Em cada tick ela atualiza movimento, inimigos, projéteis, colisões, vida,
   pontuação e motivo de término.
3. O resultado de cada tick é um snapshot serializável; o renderer transforma
   esse snapshot em sprites e efeitos, sem decidir regras.
4. O input (teclado hoje e controles de toque futuramente) é convertido em
   comandos da simulação. Pausa, perda de foco e desmontagem interrompem o
   relógio e liberam listeners, timers e recursos PixiJS.

No starter atual, parte desse loop ainda vive no `GameCanvas`. A separação
acima é a direção de evolução porque permite testes com relógio/seed
controlados, replay e testes de colisão sem depender de tempo real ou DOM.

## APIs e mocks

O contrato HTTP usa `/api` como base:

- `GET /api/ranking?page=&pageSize=&sessionSeconds=&spawnSeconds=` retorna
  `Page<RankingEntry>`.
- `GET /api/history?playerName=&page=&pageSize=` retorna
  `Page<GameResult>`.
- `POST /api/games` recebe um `GameResult` e retorna o resultado persistido.

`Page<T>` contém `items`, `page`, `pageSize`, `total` e `totalPages`, permitindo
que a UI renderize a paginação sem conhecer a implementação do servidor.
Axios fornece o mesmo contrato para produção e desenvolvimento. O MSW em
`src/mocks` intercepta essas rotas localmente, mantendo a aplicação executável
sem backend e permitindo simular respostas, dados vazios e falhas. O worker é
iniciado com `onUnhandledRequest: 'bypass'`, portanto chamadas não mockadas
continuam disponíveis para um backend real.

## Persistência e consistência

- Preferências (`sessionSeconds` e `spawnSeconds`) ficam no local storage sob
  `pirate-battle-options`. A leitura tem defaults e limites defensivos para
  preservar uma configuração válida mesmo com dados corrompidos.
- A partida concluída é enviada pelo mutation do TanStack Query. Em erro, o
  payload é salvo sob `pirate-battle-pending:<id>` e a tela oferece retry;
  sucesso remove o pending e invalida ranking/histórico para refletir o novo
  resultado.
- O identificador do resultado é a chave de idempotência esperada no backend:
  reenvios do mesmo pending não devem criar duplicatas.
- Ranking e histórico são dados remotos/cacheados, não uma segunda fonte de
  verdade local. A persistência local serve apenas para preferências e
  recuperação de submissões que falharam.

## Decisões de evolução

1. Extrair `GameSimulation` e snapshots tipados antes de ampliar a física.
2. Adicionar controles de toque e pausa automática por visibilidade com a mesma
   interface de comandos do teclado.
3. Cobrir API, persistência pending, cleanup e simulação com testes
   determinísticos; usar Playwright somente para fluxos de tela e integração.
4. Manter o renderer descartável: ao desmontar ou reiniciar uma partida, todos
   os recursos PixiJS e listeners devem ser destruídos.
