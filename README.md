# Pirate Battle

Jogo de batalha naval desenvolvido com React, TypeScript, PixiJS e Vite. O jogador controla um navio, enfrenta piratas, desvia de ilhas e tenta obter a maior pontuação possível.

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior

## Executar localmente

```bash
npm install
npm run dev
```

Para iniciar o Vite diretamente em um endereço específico:

```bash
npx vite --host 127.0.0.1
```

## Scripts

| Comando | Função |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Executa o type-check e gera o build de produção |
| `npm run lint` | Executa o TypeScript em modo de verificação |
| `npm run test:e2e` | Executa os testes Playwright, quando configurados |

## Como jogar

### Controles

- `W` ou `Seta para cima`: movimenta o navio para frente
- `A`/`D` ou setas esquerda/direita: gira o navio
- `Espaço`: dispara o canhão frontal
- `Q`: dispara os canhões laterais esquerdos
- `E`: dispara os canhões laterais direitos
- `Esc`: pausa ou retoma a partida

Controles equivalentes por toque ficam disponíveis dentro do canvas.

### Modos

#### Time

Modo padrão com duração configurável. A partida termina quando o tempo chega a zero ou quando a vida do jogador acaba. Não há bosses neste modo.

#### Arcade

Modo infinito sem contagem regressiva. O objetivo é derrotar o maior número possível de bosses antes de perder a vida. A cada cinco inimigos derrotados surge um boss. Enquanto o boss estiver vivo, novos Chasers e Shooters ficam bloqueados. Depois que o boss é destruído, o preenchimento normal da frota volta a funcionar.

O boss:

- usa o navio pirata em escala maior;
- possui 10 pontos de vida;
- dispara para frente e para os dois lados;
- causa dois pontos de dano por acerto;
- usa projéteis com alcance menor que os tiros comuns.

## Regras de inimigos

- Até 3 `Chasers` podem ficar ativos simultaneamente.
- Até 2 `Shooters` podem ficar ativos simultaneamente.
- Um novo inimigo só ocupa uma vaga do mesmo tipo depois que esse tipo é derrotado.
- Os inimigos usam o navio de vela preta com caveira.
- Navios e projéteis não atravessam as ilhas.
- O movimento tenta deslizar pela tangente da ilha em vez de travar completamente.

## Telas do jogo

- **Menu principal**: nome do capitão, seleção do modo, seleção do navio, início da partida e acesso às telas auxiliares.
- **Options**: duração da sessão e intervalo de surgimento dos inimigos.
- **Gameplay**: arena PixiJS, HUD de vida, pontuação ou quantidade de bosses, inimigos, tiros, colisões, explosões e pausa.
- **Resultado**: pontuação ou bosses derrotados, duração no modo Time, motivo do fim e ações para jogar novamente ou voltar ao menu.
- **Ranking**: consulta paginada separada para Time e Arcade. O Time ordena por pontos; o Arcade ordena por bosses derrotados.
- **Match history**: consulta paginada das partidas do capitão.

## Organização do código

```text
src/
  App.tsx                Fluxo de telas, menu e estado da sessão
  api.ts                 Cliente Axios e consultas de ranking/histórico
  types.ts               Tipos de opções, resultados e modos
  styles.css             Layout e estilos visuais das telas
  game/
    GameCanvas.tsx       Arena PixiJS e regras de gameplay
  assets.d.ts            Tipos para imports de PNG e SVG
assets/
  png/                   Navios, ilhas, efeitos e interface
  sample*.png            Referências visuais do desafio
```

## Assets

O jogo usa as composições prontas de navios em `assets/png/retina/ships`, incluindo as variantes selecionáveis do jogador e o navio pirata inimigo. Também são usados:

- `assets/png/retina/ui/menu`: molduras, título e botões do menu;
- `assets/png/retina/ship_parts/cannon_ball.png`: projéteis;
- `assets/png/default/effects`: frames de explosão;
- `assets/png/default/tiles`: texturas das ilhas;
- `assets/logo_jungle_gaming.svg`: marca da interface.

As imagens `sample.png`, `sample_menu.png` e `sample_history.png` servem como referências para a composição visual.

## Persistência e API

As opções de jogo são salvas no `localStorage` usando a chave `pirate-battle-options`. O modo, a duração e o intervalo de spawn são restaurados ao recarregar a página.

Ao terminar uma partida, o resultado é enviado para:

- `POST /api/games`
- `GET /api/ranking`
- `GET /api/history`

O cliente usa Axios e TanStack Query. Se o envio do resultado falhar, o resultado pendente é guardado localmente para permitir uma nova tentativa na tela de resultado.

## Validação

Antes de considerar uma alteração concluída, execute:

```bash
npm run lint
npm run build
```

O build pode exibir um aviso sobre o tamanho do bundle PixiJS. Esse aviso não impede a geração do build.
