import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import GameCanvas from './game/GameCanvas';
import { getHistory, getRanking, historyQueryKey, rankingQueryKey, recordGame, type Page, type RankingEntry } from './api';
import { DEFAULT_OPTIONS, type GameOptions, type GameResult } from './types';
import jungleGamingLogo from '../assets/logo_jungle_gaming.svg';
import menuShip from '../assets/png/retina/ships/ship_1.png';
import redShip from '../assets/png/retina/ships/ship_3.png';
import blueShip from '../assets/png/retina/ships/ship_4.png';
import greenShip from '../assets/png/retina/ships/ship_5.png';
import goldShip from '../assets/png/retina/ships/ship_6.png';
import { uiAssets } from './uiAssets';

type Screen = 'menu' | 'options' | 'game' | 'result' | 'ranking' | 'history';
const OPTIONS_KEY = 'pirate-battle-options';
const PENDING_KEY = 'pirate-battle-pending';

// Mantém as opções do jogador válidas mesmo quando o localStorage contém dados antigos ou inválidos.
const readOptions = (): GameOptions => {
  try {
    const value = JSON.parse(localStorage.getItem(OPTIONS_KEY) || '{}') as Partial<GameOptions>;
    return {
      sessionSeconds: Math.min(180, Math.max(60, Number(value.sessionSeconds) || DEFAULT_OPTIONS.sessionSeconds)),
      spawnSeconds: Math.min(6, Math.max(1, Number(value.spawnSeconds) || DEFAULT_OPTIONS.spawnSeconds)),
      mode: value.mode === 'arcade' ? 'arcade' : DEFAULT_OPTIONS.mode,
    };
  } catch {
    return DEFAULT_OPTIONS;
  }
};

export default function App() {
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState<Screen>('menu');
  const [options, setOptions] = useState<GameOptions>(readOptions);
  const [result, setResult] = useState<GameResult | null>(null);
  const [playerName, setPlayerName] = useState('Captain');
  const [shipVariant, setShipVariant] = useState('ivory');
  const shipChoices = [
    { id: 'ivory', name: 'Default', image: menuShip },
    { id: 'red', name: 'Red', image: redShip },
    { id: 'blue', name: 'Blue', image: blueShip },
    { id: 'green', name: 'Green', image: greenShip },
    { id: 'gold', name: 'Yellow', image: goldShip },
  ];
  const [rankingPage, setRankingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [recordError, setRecordError] = useState(false);

  // A seleção de modo e os parâmetros da partida permanecem após recarregar a página.
  useEffect(() => localStorage.setItem(OPTIONS_KEY, JSON.stringify(options)), [options]);

  const saveGame = useMutation({
    mutationFn: recordGame,
    onSuccess: (saved) => {
      localStorage.removeItem(`${PENDING_KEY}:${saved.id}`);
      queryClient.invalidateQueries({ queryKey: ['ranking'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      setRecordError(false);
    },
    onError: (_error, failed) => {
      localStorage.setItem(`${PENDING_KEY}:${failed.id}`, JSON.stringify(failed));
      setRecordError(true);
    },
  });

  const finishGame = (nextResult: GameResult) => {
    setResult(nextResult);
    saveGame.mutate(nextResult);
    setScreen('result');
  };

  const startGame = () => {
    setRecordError(false);
    setScreen('game');
  };

  return (
    <main className={`app-shell ${screen}-page`}>
      <header className="topbar">
        <div className="brand-mark"><img src={jungleGamingLogo} alt="Jungle Gaming" /></div>
        <div><p className="eyebrow">ARCADE SURVIVAL</p><h1>Pirate Battle</h1></div>
      </header>

      {screen === 'menu' && <section className="menu-panel">

        <img className="menu-title" src={uiAssets.titlePirateBattle} alt="Pirate Battle" />
        <p className="eyebrow">SET SAIL. TAKE COMMAND.</p>
        <p className="lead">Navigate the archipelago, outmaneuver pirate ships and survive as long as you can.</p>
        <div className="menu-actions menu-form">
          <fieldset className="mode-picker">
            <legend>Game mode</legend>
            <label className={options.mode === 'timed' ? 'mode-option selected' : 'mode-option'}>
              <input type="radio" name="main-game-mode" checked={options.mode === 'timed'} onChange={() => setOptions({ ...options, mode: 'timed' })} />
              <span><strong>Time</strong><small>Standard timed battle</small></span>
            </label>
            <label className={options.mode === 'arcade' ? 'mode-option selected' : 'mode-option'}>
              <input type="radio" name="main-game-mode" checked={options.mode === 'arcade'} onChange={() => setOptions({ ...options, mode: 'arcade' })} />
              <span><strong>Arcade</strong><small>Boss every 5 defeats</small></span>
            </label>
          </fieldset>
          <label>Captain name
            <input aria-label="Captain name" type="text" value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength={20} placeholder="Enter your name" />
          </label>
          <fieldset className="ship-picker">
            <legend>Choose your ship</legend>
            <div className="ship-options">
              {shipChoices.map((choice) => <button
                className={shipVariant === choice.id ? 'ship-option selected' : 'ship-option'}
                type="button"
                key={choice.id}
                aria-label={`Choose ${choice.name} ship`}
                aria-pressed={shipVariant === choice.id}
                onClick={() => setShipVariant(choice.id)}
              ><img src={choice.image} alt="" /><span>{choice.name}</span></button>)}
            </div>
          </fieldset>
          <div className='container'>
            <button className="primary-button" onClick={startGame}>Play game <span>→</span></button>
            <button className="secondary-button" onClick={() => setScreen('options')}>Options</button>
          </div>
        </div>
        <div className="menu-links"><button onClick={() => setScreen('ranking')}>Ranking</button><button onClick={() => setScreen('history')}>Match history</button></div>
        <div className="controls-card"><strong>CONTROLS</strong><span><kbd>W</kbd> Move</span><span><kbd>A</kbd> <kbd>D</kbd> Turn</span><span><kbd>Space</kbd> Front cannon</span><span><kbd>Q</kbd> <kbd>E</kbd> Side cannons</span><span><kbd>Esc</kbd> Pause</span></div>
      </section>}

      {screen === 'options' && <section className="content-panel">
        <button className="back-button" onClick={() => setScreen('menu')}>← Main menu</button>
        <p className="eyebrow">GAME SETUP</p><h2>Options</h2>
        <label className="field-label">Game session time <strong>{options.sessionSeconds}s</strong>
          <input aria-label="Game session time" type="range" min="60" max="180" step="15" value={options.sessionSeconds} onChange={(event) => setOptions({ ...options, sessionSeconds: Number(event.target.value) })} /></label>
        <label className="field-label">Enemy spawn interval <strong>{options.spawnSeconds.toFixed(1)}s</strong>
          <input aria-label="Enemy spawn interval" type="range" min="1" max="6" step="0.5" value={options.spawnSeconds} onChange={(event) => setOptions({ ...options, spawnSeconds: Number(event.target.value) })} /></label>
        <p className="field-note">Session time: 60–180 seconds. Spawn interval: 1–6 seconds.</p>
        <button className="primary-button" onClick={() => setScreen('menu')}>Save options</button>
      </section>}

      {screen === 'game' && <section className="game-section">
        <div className="game-container">
          <div className="game-heading"><div><p className="eyebrow">LIVE COMBAT</p><h2>Survive the fleet</h2></div><button className="secondary-button" onClick={() => setScreen('menu')}>Abandon game</button></div>
          <GameCanvas options={options} playerName={playerName || 'Captain Unnamed'} shipVariant={shipVariant} onFinish={finishGame} onExit={() => setScreen('menu')} />
        </div>
      </section>}

      {screen === 'result' && result && <section className="content-panel result-panel">
        <p className="eyebrow">VOYAGE COMPLETE</p><h2>{result.reason === 'time' ? 'You survived the fleet.' : 'Your ship has fallen.'}</h2>
        <div className="score-display"><span>FINAL SCORE</span><strong>{result.score}</strong></div>
        <p className="lead">{options.mode === 'arcade' ? `Defeated ${result.bossFights || 0} boss fights.` : `Survived for ${result.durationSeconds} seconds.`} {saveGame.isPending ? 'Saving result…' : recordError ? 'Result pending — retry below.' : 'Result recorded.'}</p>
        <div className="menu-actions"><button className="primary-button" onClick={startGame}>Play again</button>{recordError && <button className="secondary-button" onClick={() => saveGame.mutate(result)}>Retry save</button>}<button className="secondary-button" onClick={() => setScreen('menu')}>Main menu</button></div>
      </section>}

      {screen === 'ranking' && <RankingScreen options={options} page={rankingPage} setPage={setRankingPage} onBack={() => setScreen('menu')} />}
      {screen === 'history' && <HistoryScreen playerName={playerName || 'Captain Unnamed'} mode={options.mode} page={historyPage} setPage={setHistoryPage} onBack={() => setScreen('menu')} />}
    </main>
  );
}

function Pager({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (page: number) => void; }) {
  return <div className="pager"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button></div>;
}

function RankingScreen({ options, page, setPage, onBack }: { options: GameOptions; page: number; setPage: (page: number) => void; onBack: () => void; }) {
  const query = useQuery({ queryKey: rankingQueryKey(options), queryFn: () => getRanking(options, page), placeholderData: (previous) => previous });
  return <section className="content-panel"><button className="back-button" onClick={onBack}>← Main menu</button><p className="eyebrow">CAPTAIN'S LOG</p><h2>{options.mode === 'arcade' ? 'Arcade ranking' : 'Time ranking'}</h2>{query.isLoading ? <p className="empty-state">Loading ranking…</p> : query.isError ? <p className="empty-state">Ranking is temporarily unavailable.</p> : query.data ? <RecordTable page={query.data} ranking mode={options.mode} /> : null}{query.data && <Pager page={page} totalPages={query.data.totalPages} setPage={setPage} />}</section>;
}

function HistoryScreen({ playerName, mode, page, setPage, onBack }: { playerName: string; mode: GameOptions['mode']; page: number; setPage: (page: number) => void; onBack: () => void; }) {
  const query = useQuery({ queryKey: historyQueryKey(playerName), queryFn: () => getHistory(playerName, page), placeholderData: (previous) => previous });
  return <section className="content-panel"><button className="back-button" onClick={onBack}>← Main menu</button><p className="eyebrow">CAPTAIN'S LOG</p><h2>Match history</h2>{query.isLoading ? <p className="empty-state">Loading history…</p> : query.isError ? <p className="empty-state">History is temporarily unavailable.</p> : query.data?.total ? <RecordTable page={query.data} mode={mode} /> : <p className="empty-state">No completed voyages yet.</p>}{query.data && <Pager page={page} totalPages={query.data.totalPages} setPage={setPage} />}</section>;
}

function RecordTable({ page, ranking = false, mode = 'timed' }: { page: Page<GameResult> | Page<RankingEntry>; ranking?: boolean; mode?: GameOptions['mode']; }) {
  const metricLabel = mode === 'arcade' ? 'BOSS FIGHTS' : 'POINTS';
  return <div className="records-table">
    <div className="record-heading"><span>{ranking ? 'CAPTAIN' : 'DATE'}</span><span>{metricLabel}</span><span>{mode === 'arcade' ? 'BOSSES' : 'DURATION'}</span><span>RESULT</span></div>
    <div className="records-list">{page.items.map((item) => <div className="record-row" key={item.id}>
      <span>{ranking && 'rank' in item ? `#${item.rank} ${item.playerName}` : <><strong>{new Date(item.finishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</strong> · {new Date(item.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}</span>
      <strong>{mode === 'arcade' ? item.bossFights || 0 : item.score}</strong>
      <span>{mode === 'arcade' ? item.score : `${Math.floor(item.durationSeconds / 60).toString().padStart(2, '0')}:${(item.durationSeconds % 60).toString().padStart(2, '0')}`}</span>
      <span className={`record-result ${item.reason}`}>{item.reason === 'time' ? 'TIME UP' : 'DEFEATED'}</span>
    </div>)}</div>
  </div>;
}
