export type WeaponId = 'pistol' | 'machine-gun' | 'shotgun' | 'rocket-launcher';
export const WEAPONS = {
  pistol: { name: 'Pistol', interval: 450, damage: 1, speed: 650, range: 1000, angles: [0], splash: 0, color: 0xfff3cf },
  'machine-gun': { name: 'Machine Gun', interval: 210, damage: 1, speed: 700, range: 1000, angles: [0], splash: 0, color: 0xffe195 },
  shotgun: { name: 'Shotgun', interval: 650, damage: 2, speed: 620, range: 430, angles: [-0.14, 0, 0.14], splash: 0, color: 0x8cecff },
  'rocket-launcher': { name: 'Rocket Launcher', interval: 1100, damage: 8, speed: 460, range: 1000, angles: [0], splash: 95, color: 0xff8752 },
} satisfies Record<WeaponId, {name: string; interval: number; damage: number; speed: number; range: number; angles: number[]; splash: number; color: number}>;
