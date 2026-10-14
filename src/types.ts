export type EndReason = 'time' | 'health';
// O modo fica no estado da sessão para que a arena saiba se deve criar bosses.
export type GameMode = 'timed' | 'arcade';

export interface GameResult {
  id: string;
  playerName: string;
  score: number;
  bossFights?: number;
  durationSeconds: number;
  reason: EndReason;
  finishedAt: string;
  config: {
    sessionSeconds: number;
    spawnSeconds: number;
    mode?: GameMode;
  };
}

export interface GameOptions {
  sessionSeconds: number;
  spawnSeconds: number;
  mode: GameMode;
}

export const DEFAULT_OPTIONS: GameOptions = {
  sessionSeconds: 90,
  spawnSeconds: 2.5,
  mode: 'timed',
};
