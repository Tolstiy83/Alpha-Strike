import Phaser from 'phaser';
import type { WeaponId } from '../data/weapons';

export const WEAPON_SCALE = 0.72;
export const WEAPON_LENGTH: Record<WeaponId, number> = { pistol: 28, 'machine-gun': 50, shotgun: 54, 'rocket-launcher': 58 };
export function weaponMuzzle(x: number, y: number, id: WeaponId) {
  return { x: x + 8, y: y - 52 - WEAPON_LENGTH[id] * WEAPON_SCALE };
}

export function weaponAnimation(id: WeaponId, shotAgo: number) {
  const active = shotAgo >= 0;
  const duration = id === 'shotgun' ? 180 : id === 'rocket-launcher' ? 230 : 95;
  const recoil = active ? Math.max(0, 1 - shotAgo / duration) : 0;
  const action = active && ((id === 'shotgun' && shotAgo > 110 && shotAgo < 330) || (id === 'pistol' && shotAgo < 65));
  return { texture: 'held-' + id + (action ? '-action' : ''), recoil: recoil * (id === 'shotgun' ? 6 : id === 'rocket-launcher' ? 8 : 3) };
}

export function createWeaponTextures(scene: Phaser.Scene) {
  for (const id of Object.keys(WEAPON_LENGTH) as WeaponId[]) {
    for (const action of (id === 'shotgun' || id === 'pistol' ? [false, true] : [false])) {
      const key = 'held-' + id + (action ? '-action' : '');
      if (scene.textures.exists(key)) continue;
      const g = scene.make.graphics({ x: 0, y: 0 });
      const top = 64 - WEAPON_LENGTH[id];
      if (id === 'pistol') {
        // Compact steel slide above a clearly separate angled brown grip.
        g.fillStyle(0x171d23); g.fillRoundedRect(13, top, 14, 20, 3);
        g.fillStyle(0x34291f); g.fillPoints([new Phaser.Math.Vector2(16, 53),new Phaser.Math.Vector2(25, 53),new Phaser.Math.Vector2(29, 64),new Phaser.Math.Vector2(18, 64)], true);
        g.fillStyle(0xa0784e); g.fillRect(19, 55, 6, 7);
        g.fillStyle(0xa5b5c0); g.fillRoundedRect(14, top + (action ? 4 : 0), 12, 17, 2);
        g.fillStyle(0xe8f1f4); g.fillRect(15, top + 2 + (action ? 4 : 0), 3, 12);
        g.fillStyle(0x202a31); g.fillRect(18, top, 5, 3);
        g.lineStyle(2, 0x34404a); g.strokeCircle(25, 54, 4);
      } else if (id === 'shotgun') {
        // Long barrel, shorter magazine tube, ribbed wood pump and broad stock.
        g.fillStyle(0x18232c); g.fillRoundedRect(16, top, 9, 42, 2);
        g.fillStyle(0xc3d3db); g.fillRect(17, top + 2, 3, 29);
        g.fillStyle(0x526572); g.fillRect(24, top + 10, 5, 28);
        g.fillStyle(0x101820); g.fillRect(16, top, 9, 3);
        g.fillStyle(0xffcf79); g.fillRect(19, top + 3, 2, 3);
        const pumpY = top + 23 + (action ? 8 : 0);
        g.fillStyle(0x492d1b); g.fillRoundedRect(12, pumpY, 19, 13, 3);
        g.fillStyle(0xc58748); g.fillRoundedRect(13, pumpY + 1, 16, 10, 2);
        g.lineStyle(2, 0x704220);
        for (let y = pumpY + 3; y < pumpY + 11; y += 3) g.lineBetween(14, y, 28, y);
        g.fillStyle(0x445763); g.fillRoundedRect(15, 46, 13, 9, 2);
        g.fillStyle(0x996033); g.fillPoints([new Phaser.Math.Vector2(17, 54),new Phaser.Math.Vector2(25, 54),new Phaser.Math.Vector2(31, 63),new Phaser.Math.Vector2(13, 63)], true);
        g.fillStyle(0x20262b); g.fillRect(12, 62, 20, 3);
      } else if (id === 'machine-gun') {
        g.fillStyle(0x202c32); g.fillRect(17, top, 7, 22);
        g.fillStyle(0xadc3cc); g.fillRect(18, top + 2, 2, 18);
        g.fillStyle(0x283e45); g.fillRoundedRect(12, top + 18, 17, 24, 3);
        g.fillStyle(0x8ca3aa); g.fillRect(14, top + 20, 4, 19);
        g.fillStyle(0x131e25); g.fillRect(15, top - 1, 11, 5);
        for (let y = top + 7; y < top + 20; y += 4) g.fillRect(16, y, 10, 2);
        g.fillStyle(0x687348); g.fillRoundedRect(27, top + 27, 11, 16, 2);
        g.fillStyle(0xe0b65f);
        for (let y = top + 27; y < top + 40; y += 4) g.fillRect(26, y, 9, 2);
        g.fillStyle(0x394b40); g.fillRoundedRect(13, 55, 16, 9, 2);
        g.fillStyle(0x182128); g.fillRect(12, 62, 18, 3);
      } else {
        // RPG silhouette: oversized pointed warhead, slender tube and flared exhaust.
        g.fillStyle(0x263329); g.fillRoundedRect(16, top + 20, 9, 37, 2);
        g.fillStyle(0x91a37b); g.fillRect(17, top + 23, 2, 30);
        g.fillStyle(0x80603c); g.fillRoundedRect(14, top + 30, 13, 17, 2);
        g.fillStyle(0xbe9156); g.fillRect(16, top + 31, 3, 14);
        g.fillStyle(0x526338);
        g.fillPoints([new Phaser.Math.Vector2(20, top), new Phaser.Math.Vector2(29, top + 13),
          new Phaser.Math.Vector2(27, top + 22), new Phaser.Math.Vector2(23, top + 27),
          new Phaser.Math.Vector2(17, top + 27), new Phaser.Math.Vector2(13, top + 22),
          new Phaser.Math.Vector2(11, top + 13)], true);
        g.fillStyle(0xaabb72);
        g.fillPoints([new Phaser.Math.Vector2(20, top + 2), new Phaser.Math.Vector2(16, top + 14),
          new Phaser.Math.Vector2(17, top + 22), new Phaser.Math.Vector2(20, top + 24)], true);
        g.fillStyle(0xd1b25b); g.fillRect(13, top + 18, 14, 3);
        g.fillStyle(0x263039); g.fillRect(25, top + 28, 8, 5); g.fillRect(29, top + 24, 5, 10);
        g.fillStyle(0x99cbd0); g.fillRect(30, top + 25, 3, 3);
        g.fillStyle(0x523b28); g.fillRect(25, top + 43, 6, 10);
        g.fillStyle(0x37473a);
        g.fillPoints([new Phaser.Math.Vector2(16, 57), new Phaser.Math.Vector2(25, 57),
          new Phaser.Math.Vector2(30, 64), new Phaser.Math.Vector2(11, 64)], true);
        g.fillStyle(0x151f24); g.fillEllipse(20, 64, 21, 5);
      }
      g.generateTexture(key, 40, 68); g.destroy();
    }
  }
}
