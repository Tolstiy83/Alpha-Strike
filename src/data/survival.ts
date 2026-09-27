import type { StageCarry } from './campaign';

export function nextEndlessRound(carry: StageCarry): StageCarry {
  const round = (carry.endlessRound ?? 0) + 1;
  return { ...carry, endlessRound: round, stage: (round - 1) % 3 + 1,
    kills: round === 1 ? 0 : carry.kills, bossesDefeated: round === 1 ? 0 : carry.bossesDefeated,
    score: round === 1 ? 0 : carry.score };
}

export interface SurvivalBest { wave: number; score: number }
const KEY = 'alpha-strike-survival-best-v1';
const zero = (): SurvivalBest => ({ wave: 0, score: 0 });
const valid = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;

export function readSurvivalBest(storage?: StorageAccess, difficulty = 'normal'): SurvivalBest {
  try {
    const data = JSON.parse((storage ?? globalThis.localStorage).getItem(difficulty === 'hard' ? KEY + '-hard' : KEY) ?? 'null');
    return { wave: valid(data?.wave) ? data.wave : 0, score: valid(data?.score) ? data.score : 0 };
  } catch { return zero(); }
}

export function saveSurvivalBest(wave: number, score: number, storage?: StorageAccess, difficulty = 'normal'): SurvivalBest {
  const best = readSurvivalBest(storage, difficulty);
  const result = { wave: Math.max(best.wave, valid(wave) ? wave : 0),
    score: Math.max(best.score, valid(score) ? score : 0) };
  try { if (result.wave !== best.wave || result.score !== best.score)
    (storage ?? globalThis.localStorage).setItem(difficulty === 'hard' ? KEY + '-hard' : KEY, JSON.stringify(result)); } catch { /* Storage is optional. */ }
  return result;
}
