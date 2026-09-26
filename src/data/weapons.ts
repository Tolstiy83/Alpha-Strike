export type WeaponId = 'pistol' | 'machine-gun' | 'shotgun' | 'rocket-launcher';
export const WEAPONS = {
  pistol: { name: 'Pistol', interval: 450, damage: 1, speed: 650, range: 1000, angles: [0], splash: 0, color: 0xfff3cf },
  'machine-gun': { name: 'Machine Gun', interval: 210, damage: 1, speed: 700, range: 1000, angles: [0], splash: 0, color: 0xffe195 },
  shotgun: { name: 'Shotgun', interval: 650, damage: 2, speed: 620, range: 430, angles: [-0.14, 0, 0.14], splash: 0, color: 0x8cecff },
  'rocket-launcher': { name: 'Rocket Launcher', interval: 1100, damage: 8, speed: 460, range: 1000, angles: [0], splash: 95, color: 0xff8752 },
} satisfies Record<WeaponId, {name: string; interval: number; damage: number; speed: number; range: number; angles: number[]; splash: number; color: number}>;

export type WeaponLevels = Partial<Record<WeaponId, number>>;
export const DROPPED_WEAPONS = ['machine-gun', 'shotgun', 'rocket-launcher'] as const;

export function weaponLevel(levels: WeaponLevels, id: WeaponId) {
  return Math.max(0, Math.min(3, Math.floor(levels[id] ?? 0)));
}

export function weaponProfile(id: WeaponId, levels: WeaponLevels) {
  const base = WEAPONS[id];
  const level = Math.max(1, weaponLevel(levels, id));
  return { ...base,
    interval: id === 'machine-gun' ? [210, 175, 145][level - 1] : base.interval,
    angles: id === 'shotgun' ? [-1, 0, 1].map(angle => angle * [0.14, 0.105, 0.07][level - 1]) : [...base.angles],
    splash: id === 'rocket-launcher' ? [95, 115, 135][level - 1] : base.splash,
  };
}

export function collectWeapon(levels: WeaponLevels, equipped: WeaponId, reward: WeaponId): WeaponLevels {
  const previous = weaponLevel(levels, reward);
  return { ...levels, [reward]: previous === 0 ? 1 : equipped === reward ? Math.min(3, previous + 1) : previous };
}

export function weaponRewardLabel(levels: WeaponLevels, equipped: WeaponId, reward: WeaponId) {
  const level = weaponLevel(levels, reward);
  if (!level) return 'NEW WEAPON • LV 1';
  if (reward !== equipped) return 'SWITCH • LV ' + level;
  return level < 3 ? 'UPGRADE TO LV ' + (level + 1) : 'MAX LEVEL 3';
}

export function weaponDropChoices(levels: WeaponLevels, equipped: WeaponId) {
  return DROPPED_WEAPONS.filter(id => id !== equipped || weaponLevel(levels, id) < 3);
}
