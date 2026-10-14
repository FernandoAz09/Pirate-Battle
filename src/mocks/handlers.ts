import { http, HttpResponse } from 'msw';
import type { GameResult } from '../types';
import type { Page, RankingEntry } from '../api';

const HISTORY_KEY = 'pirate-battle-history';
const readResults = (): GameResult[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as GameResult[];
  } catch {
    return [];
  }
};

const writeResults = (results: GameResult[]) => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(results.slice(0, 100)));
};

const paginate = <T,>(items: T[], page: number, pageSize: number): Page<T> => ({
  items: items.slice((page - 1) * pageSize, page * pageSize),
  page,
  pageSize,
  total: items.length,
  totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
});

export const handlers = [
  http.get('/api/ranking', ({ request }) => {
    const url = new URL(request.url);
    const sessionSeconds = Number(url.searchParams.get('sessionSeconds'));
    const spawnSeconds = Number(url.searchParams.get('spawnSeconds'));
    const mode = url.searchParams.get('mode') === 'arcade' ? 'arcade' : 'timed';
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') || 10));
    const fixtures: GameResult[] = [
      { id: 'fixture-1', playerName: 'Blackbeard', score: mode === 'arcade' ? 25 : 18, bossFights: mode === 'arcade' ? 5 : 0, durationSeconds: sessionSeconds, reason: 'time', finishedAt: '2025-01-01T00:00:00.000Z', config: { sessionSeconds, spawnSeconds, mode } },
      { id: 'fixture-2', playerName: 'Anne Bonny', score: mode === 'arcade' ? 15 : 13, bossFights: mode === 'arcade' ? 3 : 0, durationSeconds: sessionSeconds, reason: 'time', finishedAt: '2025-01-02T00:00:00.000Z', config: { sessionSeconds, spawnSeconds, mode } },
      { id: 'fixture-3', playerName: 'Calico Jack', score: mode === 'arcade' ? 10 : 8, bossFights: mode === 'arcade' ? 2 : 0, durationSeconds: 74, reason: 'health', finishedAt: '2025-01-03T00:00:00.000Z', config: { sessionSeconds, spawnSeconds, mode } },
    ];
    const items = [...readResults(), ...fixtures]
      .filter((item) => item.config.sessionSeconds === sessionSeconds && item.config.spawnSeconds === spawnSeconds && (item.config.mode || 'timed') === mode)
      .sort((a, b) => mode === 'arcade'
        ? (b.bossFights || 0) - (a.bossFights || 0) || b.score - a.score
        : b.score - a.score || a.durationSeconds - b.durationSeconds || a.finishedAt.localeCompare(b.finishedAt));
    const pageData = paginate(items, page, pageSize);
    const ranked: Page<RankingEntry> = { ...pageData, items: pageData.items.map((item, index) => ({ ...item, rank: (page - 1) * pageSize + index + 1 })) };
    return HttpResponse.json(ranked);
  }),
  http.get('/api/history', ({ request }) => {
    const url = new URL(request.url);
    const playerName = url.searchParams.get('playerName') || '';
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') || 10));
    return HttpResponse.json(paginate(readResults().filter((item) => item.playerName === playerName), page, pageSize));
  }),
  http.post('/api/games', async ({ request }) => {
    const result = await request.json() as GameResult;
    const existing = readResults().find((item) => item.id === result.id);
    if (!existing) writeResults([result, ...readResults()]);
    return HttpResponse.json(existing || result, { status: existing ? 200 : 201 });
  }),
];
