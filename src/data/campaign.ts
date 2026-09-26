import type { WeaponId, WeaponLevels } from './weapons';

export type StageBonus = 'heal' | 'troop' | 'damage';
export interface StageCarry {
  stage?: number;
  endlessRound?: number;
  weapon?: WeaponId;
  weaponLevels?: WeaponLevels;
  troops?: number;
  health?: number;
  score?: number;
  stats?: { fireRate: number; damage: number };
}

export const STAGES = [
  { name: 'Desert road', boss: 'IRON COMMANDER', style: 'melee' },
  { name: 'Ruined city', boss: 'SIEGE BRUTE', style: 'ranged' },
  { name: 'Industrial zone', boss: 'FOUNDRY TYRANT', style: 'sweep' },
] as const;

export function nextStage(carry: StageCarry, bonus: StageBonus): StageCarry | undefined {
  const stage = carry.stage ?? 1;
  if (stage >= STAGES.length && !carry.endlessRound) return;
  return {
    ...carry, stage: stage + 1,
    health: Math.min(100, (carry.health ?? 100) + (bonus === 'heal' ? 50 : 0)),
    troops: (carry.troops ?? 2) + (bonus === 'troop' ? 1 : 0),
    stats: { fireRate: carry.stats?.fireRate ?? 250,
      damage: (carry.stats?.damage ?? 1) + (bonus === 'damage' ? 1 : 0) },
  };
}

// These same bounds drive the visible warning and the hit check, including road edges.
export function laneForX(x: number, width: number) {
  return Math.max(0, Math.min(2, Math.floor(x / (width / 3))));
}
export function laneBounds(lane: number, width: number) {
  return { left: lane * width / 3, right: (lane + 1) * width / 3, center: (lane + 0.5) * width / 3 };
}
