import type { EnemyType } from './enemies';

export const STAGE_DIFFICULTY = [
  { health: { grunt: 2, runner: 1, tank: 6 }, speed: 1 },
  { health: { grunt: 3, runner: 2, tank: 10 }, speed: 1.15 },
  { health: { grunt: 5, runner: 3, tank: 16 }, speed: 1.3 },
] as const;

export const BOSS_DIFFICULTY = {
  melee: { health: 420, speed: 60, recovery: [1300, 900] },
  ranged: { health: 650, speed: 70, recovery: [1100, 750] },
  sweep: { health: 900, speed: 80, recovery: [550, 400] },
} as const;

export function stageDifficulty(stage: number, endlessRound = 0) {
  const base = STAGE_DIFFICULTY[endlessRound > 0 ? 2 : Math.max(0, Math.min(2, stage - 1))];
  const healthScale = 1 + endlessRound * 0.12;
  return { health: {
    grunt: Math.ceil(base.health.grunt * healthScale),
    runner: Math.ceil(base.health.runner * healthScale),
    tank: Math.ceil(base.health.tank * healthScale),
  }, speed: base.speed * Math.min(1.6, 1 + endlessRound * 0.035) };
}

export function encounterFormation(stage: number, index: number, endlessRound = 0) {
  if (endlessRound > 0) stage = 3;
  const opening = stage === 1 && index === 0;
  const runnerBurst = stage === 3 && index % 2 === 1;
  const count = stage === 1 ? 12 + index * 4 : stage === 2 ? 18 + index * 4 : 22 + index * 3;
  const columns = opening ? 5 : 7;
  return Array.from({ length: Math.min(60, count + Math.min(24, endlessRound * 2)) }, (_, i) => {
    let type: EnemyType = 'grunt';
    if (stage === 3) type = runnerBurst ? (i % 4 ? 'runner' : 'grunt') : i % 4 === 0 ? 'tank' : 'grunt';
    else if (stage === 2) type = i % 6 === 0 ? 'tank' : i % 3 === 0 ? 'runner' : 'grunt';
    else if (index >= 2 && i % 11 === 0) type = 'tank';
    else if (index >= 1 && i % 4 === 0) type = 'runner';
    return { type,
      x: 400 + ((i % columns) - (columns - 1) / 2) * (opening ? 30 : 34) + (opening ? 0 : index % 2 ? 10 : -10),
      y: -35 - Math.floor(i / columns) * (runnerBurst ? 28 : 38),
    };
  });
}
