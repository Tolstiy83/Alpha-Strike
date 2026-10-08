import type { StageCarry } from './campaign';
import { readSurvivalBest } from './survival';
export type Difficulty = 'easy' | 'normal' | 'hard';
let unlockedThisSession = false;
export function endlessUnlocked() {
  try { return unlockedThisSession || localStorage.getItem('alpha-strike-endless-unlocked') === 'true' || readSurvivalBest().wave > 0; }
  catch { return unlockedThisSession; }
}
export function unlockEndless() {
  unlockedThisSession = true;
  try { localStorage.setItem('alpha-strike-endless-unlocked', 'true'); } catch { /* Session unlock still works. */ }
}
export function freshRun(difficulty: Difficulty, endless = false): StageCarry {
  return endless ? { started: true, difficulty, stage: 1, endlessRound: 1, weapon: 'machine-gun',
    weaponLevels: { pistol: 1, 'machine-gun': 2 }, troops: 4, health: 100, score: 0 }
    : { started: true, difficulty };
}
export const difficultyScale = (difficulty: Difficulty) => difficulty === 'hard'
  ? { health: 1.3, speed: 1.12, recovery: 0.85 } : difficulty === 'easy'
  ? { health: 0.75, speed: 0.85, recovery: 1.25 } : { health: 1, speed: 1, recovery: 1 };
