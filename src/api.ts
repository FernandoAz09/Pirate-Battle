import axios from 'axios';
import type { GameResult } from './types';

export interface RankingEntry extends GameResult {
  rank: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const apiClient = axios.create({ baseURL: '/api', timeout: 3000 });

export const rankingQueryKey = (config: GameResult['config']) =>
  ['ranking', config.sessionSeconds, config.spawnSeconds, config.mode] as const;

export const historyQueryKey = (playerName: string) => ['history', playerName] as const;

export async function getRanking(
  config: GameResult['config'],
  page = 1,
  pageSize = 10,
): Promise<Page<RankingEntry>> {
  const response = await apiClient.get<Page<RankingEntry>>('/ranking', {
    params: { ...config, page, pageSize },
  });
  return response.data;
}

export async function getHistory(
  playerName: string,
  page = 1,
  pageSize = 10,
): Promise<Page<GameResult>> {
  const response = await apiClient.get<Page<GameResult>>('/history', {
    params: { playerName, page, pageSize },
  });
  return response.data;
}

export async function recordGame(result: GameResult): Promise<GameResult> {
  const response = await apiClient.post<GameResult>('/games', result);
  return response.data;
}
