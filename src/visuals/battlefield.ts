import Phaser from 'phaser';

// Original procedural artwork; texture sizes retain the existing collision footprints.
export function createBattlefieldTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 });
  const save = (key: string, w: number, h: number) => {
    if (!scene.textures.exists(key)) g.generateTexture(key, w, h);
    g.clear();
  };
  const soldier = (w: number, h: number, coat: number) => {
    g.fillStyle(0x101820, 0.35); g.fillEllipse(w / 2 + 3, h - 5, w - 2, 9);
    g.fillStyle(0x242a29); g.fillRoundedRect(8, h - 17, 9, 15, 3);
    g.fillRoundedRect(w - 17, h - 17, 9, 15, 3);
    g.fillStyle(coat); g.fillRoundedRect(6, 12, w - 12, h - 21, 5);
    g.fillStyle(0xd3a575); g.fillRoundedRect(2, 15, 7, 16, 3); g.fillRoundedRect(w - 9, 15, 7, 16, 3);
    g.fillStyle(0x424b39); g.fillRoundedRect(11, 18, w - 22, 15, 3);
    g.lineStyle(2, 0xa9a477); g.strokeRoundedRect(11, 18, w - 22, 15, 3);
    g.fillStyle(0xd9b388); g.fillCircle(w / 2, 11, 7);
    g.fillStyle(0x727653); g.fillEllipse(w / 2, 8, 18, 13);
    g.fillStyle(0x161f25); g.fillRect(w - 12, 0, 6, 22);
    g.fillStyle(0x93a4aa); g.fillRect(w - 11, 1, 2, 14);
  };
  soldier(40, 40, 0x8f7556); save('player', 40, 40);
  soldier(36, 36, 0x687b58); save('troop', 36, 36);
  g.fillStyle(0xff752f, 0.3); g.fillEllipse(3, 9, 6, 18);
  g.fillStyle(0xffc85c); g.fillEllipse(3, 8, 4, 14);
  g.fillStyle(0xfff8d2); g.fillEllipse(3, 5, 2, 9); save('bullet', 6, 18);
  g.fillStyle(0x101820, 0.35); g.fillEllipse(19, 32, 31, 8);
  g.fillStyle(0x777777); g.fillRect(10, 24, 6, 10); g.fillRect(21, 24, 6, 10);
  g.fillStyle(0xdddddd); g.fillRoundedRect(8, 10, 21, 18, 4);
  g.fillStyle(0xffffff); g.fillCircle(18, 7, 7); g.fillRect(2, 14, 7, 15); g.fillRect(28, 14, 7, 15);
  g.fillStyle(0x242020); g.fillRect(13, 6, 3, 3); g.fillRect(21, 6, 3, 3); g.fillRect(15, 11, 7, 2);
  save('enemy', 36, 36);
  g.fillStyle(0x131519, 0.5); g.fillEllipse(75, 80, 140, 19);
  g.fillStyle(0x40392f); g.fillRoundedRect(34, 48, 29, 38, 8); g.fillRoundedRect(87, 48, 29, 38, 8);
  g.fillStyle(0x9aaf75); g.fillRoundedRect(3, 24, 34, 46, 12); g.fillRoundedRect(113, 24, 34, 46, 12);
  g.fillStyle(0x665849); g.fillRoundedRect(29, 16, 92, 50, 13);
  g.lineStyle(5, 0xc6ab70); g.strokeRoundedRect(34, 20, 82, 40, 10);
  g.fillStyle(0xb3c18b); g.fillRoundedRect(54, 0, 42, 34, 12);
  g.fillStyle(0xff603e); g.fillRect(60, 11, 9, 5); g.fillRect(81, 11, 9, 5);
  g.fillStyle(0x29251f); g.fillRect(66, 25, 19, 4); save('boss', 150, 90);
  g.fillStyle(0x191c25); g.fillRoundedRect(0, 0, 60, 45, 4);
  g.fillStyle(0xb7c5cd); g.fillRoundedRect(3, 3, 54, 37, 3);
  g.fillStyle(0x677782); g.fillRect(7, 8, 46, 25);
  g.fillStyle(0xe0e6dc); g.fillRect(11, 3, 5, 37); g.fillRect(44, 3, 5, 37);
  g.fillStyle(0xffd178); g.fillRect(23, 17, 14, 10);
  g.lineStyle(2, 0xffffff); g.strokeRoundedRect(1, 1, 58, 42, 4); save('upgrade-container', 60, 45);
  g.fillStyle(0x174e8b); g.fillRoundedRect(0, 0, 40, 55, 4);
  g.fillStyle(0x44bdff, 0.7); g.fillRoundedRect(3, 3, 34, 49, 3);
  g.lineStyle(2, 0xc6f6ff); g.strokeRoundedRect(2, 2, 36, 51, 3); save('upgrade-card', 40, 55);
  g.destroy();
}

export function drawDesertRoad(scene: Phaser.Scene, city = false, industrial = false) {
  const g = scene.add.graphics().setDepth(-20);
  g.fillStyle(industrial ? 0x555c60 : city ? 0x777a76 : 0xd4ae76); g.fillRect(0, 0, 800, 900);
  for (let i = 0; i < 65; i++) {
    const x = (i * 137) % 800, y = (i * 193) % 900;
    g.fillStyle(i % 2 ? 0xb68b56 : 0xe7c58e, 0.45);
    g.fillEllipse(x, y, 26 + i % 24, 7);
  }
  g.fillStyle(0x6f675d); g.fillPoints([new Phaser.Math.Vector2(115, 0),new Phaser.Math.Vector2(685, 0),new Phaser.Math.Vector2(800, 900),new Phaser.Math.Vector2(0, 900)],true);
  g.fillStyle(0x363a40); g.fillPoints([new Phaser.Math.Vector2(125, 0),new Phaser.Math.Vector2(675, 0),new Phaser.Math.Vector2(785, 900),new Phaser.Math.Vector2(15, 900)],true);
  const project = (x: number, y: number) => 400 + (x - 400) * (0.72 + y / 900 * 0.28);
  for (const x of [65, 260, 540, 735]) {
    g.lineStyle(x === 65 || x === 735 ? 5 : 8, 0xaca799);
    g.lineBetween(project(x, 0), 0, project(x, 900), 900);
    g.lineStyle(2, 0x20252c); g.lineBetween(project(x,0)+5,0,project(x,900)+5,900);
  }
  for (let y = 20; y < 900; y += 95) {
    g.fillStyle(0xe1ddd0,0.7); g.fillRect(398,y,4,30 + y / 60);
  }
  if (city && !industrial) {
    for (let y = 30; y < 900; y += 120) {
      for (const x of [0, 750]) {
        g.fillStyle(0x424953); g.fillRect(x, y, 50, 90);
        g.fillStyle(0x1d252c); g.fillRect(x + 12, y + 12, 12, 20); g.fillRect(x + 30, y + 12, 12, 20);
        g.fillStyle(0x91958e); g.fillRect(x, y, 50, 6);
      }
    }
  }
  if (industrial) {
    for (let y = 25; y < 900; y += 145) {
      for (const x of [0, 748]) {
        g.fillStyle(0x292e32); g.fillRect(x, y, 52, 110);
        g.fillStyle(0x805341); g.fillRect(x + 5, y + 5, 42, 78);
        g.lineStyle(3, 0x343b3e);
        for (let line = 12; line < 45; line += 8) g.lineBetween(x + line, y + 8, x + line, y + 78);
        g.fillStyle(0xcda444); g.fillRect(x, y + 88, 52, 12);
        g.lineStyle(5, 0x252a2d);
        for (let stripe = 0; stripe < 45; stripe += 13) g.lineBetween(x + stripe, y + 88, x + stripe + 10, y + 100);
        g.fillStyle(0x738087); g.fillCircle(x + 26, y + 30, 14);
        g.fillStyle(0x2b3339); g.fillCircle(x + 26, y + 30, 9);
      }
    }
    g.lineStyle(7, 0x8b969c); g.lineBetween(110, 0, 20, 900); g.lineBetween(690, 0, 780, 900);
  }
  for (let i = 0; i < (city ? 0 : 12); i++) {
    const y = 80 + i * 66, x = i % 2 ? 765 : 30;
    g.lineStyle(5,0x647044); g.lineBetween(x,y,x,y+28);
    g.lineBetween(x-8,y+8,x-8,y+17); g.lineBetween(x-8,y+17,x+8,y+17);
    g.lineBetween(x+8,y+17,x+8,y+3);
  }
  scene.add.rectangle(400, 70, 800, 140, 0x101a24, 0.9).setDepth(-1);
}
