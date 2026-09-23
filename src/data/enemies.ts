export type EnemyType =
  | 'grunt'
  | 'runner'
  | 'tank';

export type EnemyMovement =
  | { pattern: 'straight' }
  | { pattern: 'zigzag'; amplitude: number; periodMs: number };

export interface EnemyDefinition {
  type: EnemyType;
  health: number;
  speed: number;
  size: number;
  color: number;
  escapeDamage: number;
  scoreValue: number;
  movement: EnemyMovement;
}

export const ENEMIES:
  Record<EnemyType, EnemyDefinition> = {

  grunt: {
    type: 'grunt',
    health: 2,
    speed: 60,
    size: 36,
    color: 0xef5350,
    escapeDamage: 20,
    scoreValue: 100,
    movement: { pattern: 'straight' },
  },

  runner: {
    type: 'runner',
    health: 1,
    speed: 105,
    size: 26,
    color: 0xff9800,
    escapeDamage: 10,
    scoreValue: 125,
    movement: { pattern: 'zigzag', amplitude: 40, periodMs: 2000 },
  },

  tank: {
    type: 'tank',
    health: 6,
    speed: 35,
    size: 52,
    color: 0x8e24aa,
    escapeDamage: 35,
    scoreValue: 250,
    movement: { pattern: 'straight' },
  },
};