import Phaser from 'phaser';
import type { WeaponId } from '../data/weapons';

export const WEAPON_SCALE = 0.72;
export const WEAPON_LENGTH: Record<WeaponId, number> = { pistol: 24, 'machine-gun': 43, shotgun: 38, 'rocket-launcher': 48 };
export function weaponMuzzle(x: number, y: number, id: WeaponId) {
  return { x: x + 8, y: y - 52 - WEAPON_LENGTH[id] * WEAPON_SCALE };
}

export function createWeaponTextures(scene: Phaser.Scene) {
  for (const id of Object.keys(WEAPON_LENGTH) as WeaponId[]) {
    if (scene.textures.exists('held-' + id)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 });
    // All barrels point up; a shared bottom anchor aligns guns and projectiles.
    const length = WEAPON_LENGTH[id];
    const top = 64 - length;
    g.fillStyle(0x10181e); g.fillRoundedRect(14, top, 13, length, 3);
    if (id === 'pistol') {
      g.fillStyle(0x536876); g.fillRect(15, top + 1, 10, 15);
      g.fillStyle(0xc6d4d9); g.fillRect(16, top + 1, 3, 13);
      g.fillStyle(0x715440); g.fillRect(17, top + 15, 7, 8);
    } else if (id === 'machine-gun') {
      g.fillStyle(0x9baab1); g.fillRect(17, top, 6, 17);
      g.fillStyle(0x293e48); g.fillRect(13, top + 17, 15, 18);
      g.fillStyle(0xb9964c); g.fillRect(26, top + 22, 8, 12);
      g.fillStyle(0x141e26);
      for (let y = top + 2; y < top + 16; y += 4) g.fillRect(16, y, 8, 2);
      g.fillStyle(0x82969c); g.fillRect(16, top + 19, 4, 14);
    } else if (id === 'shotgun') {
      g.fillStyle(0xaebec4); g.fillRect(14, top, 5, 24); g.fillRect(21, top, 5, 24);
      g.fillStyle(0x895637); g.fillRoundedRect(12, top + 22, 17, 9, 2);
      g.fillStyle(0xc08c55); g.fillRect(15, top + 24, 11, 2);
    } else {
      g.fillStyle(0x71834f); g.fillRoundedRect(9, top + 3, 23, length - 7, 4);
      g.fillStyle(0xb5bc7a); g.fillRect(12, top + 7, 5, length - 15);
      g.fillStyle(0x222c31); g.fillRect(8, top, 25, 7); g.fillRect(8, 57, 25, 7);
      g.fillStyle(0xf2b75b); g.fillRect(10, top + 16, 21, 4);
      g.fillStyle(0x37462f); g.fillRect(25, top + 7, 5, length - 15);
      g.fillStyle(0xa5b380); g.fillEllipse(20, top + 4, 25, 8);
      g.fillStyle(0x101b22); g.fillEllipse(20, top + 3, 17, 4);
      g.fillStyle(0x33434c); g.fillRect(31, top + 22, 5, 8);
    }
    g.generateTexture('held-' + id, 40, 68); g.destroy();
  }
}
