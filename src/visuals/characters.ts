import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { type WeaponId } from '../data/weapons';
import { createWeaponTextures, weaponAnimation, WEAPON_SCALE } from './weapons';

/** Art-only cutout joints: physics footprints and movement remain on the original sprites. */
export function installCharacterArt(scene: Phaser.Scene, equipment: () => { id: WeaponId; level: number }) {
  if (!scene.textures.exists('character-art')) return;
  createWeaponTextures(scene);
  const atlas = scene.textures.get('character-art');
  const frames = {
    survivor: { x: 65, y: 175, w: 375, h: 815, hip: 440 },
    zombie: { x: 525, y: 170, w: 420, h: 800, hip: 350 },
    brute: { x: 945, y: 140, w: 590, h: 840, hip: 450 },
  };
  for (const [name, f] of Object.entries(frames)) {
    if (atlas.has(name + '-torso')) continue;
    atlas.add(name + '-torso', 0, f.x, f.y, f.w, f.hip + 16);
    atlas.add(name + '-left', 0, f.x, f.y + f.hip, Math.floor(f.w / 2), f.h - f.hip);
    atlas.add(name + '-right', 0, f.x + Math.floor(f.w / 2), f.y + f.hip, Math.ceil(f.w / 2), f.h - f.hip);
  }
  type Visual = {
    torso: Phaser.GameObjects.Image; legs: Phaser.GameObjects.Image[];
    gun?: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse;
    height: number; width: number; hip: number; phase: number; cadence: number;
    tint: number; lastX: number; lastY: number; motion: number; heavy: boolean;
  };
  const visuals = new Map<Phaser.Physics.Arcade.Sprite, Visual>();
  const destroy = (v: Visual) => { v.torso.destroy(); v.legs.forEach(leg => leg.destroy()); v.gun?.destroy(); v.shadow.destroy(); };
  const render = (_time: number, delta: number) => {
    const weapon = equipment();
    const existingCount = scene.children.list.length;
    for (let index = 0; index < existingCount; index++) {
      const object = scene.children.list[index];
      if (!(object instanceof Phaser.Physics.Arcade.Sprite)) continue;
      const key = object.texture.key;
      if (!['player', 'troop', 'enemy', 'boss'].includes(key) || visuals.has(object)) continue;
      const kind = object instanceof Enemy ? object.enemyType : undefined;
      const soldier = key === 'player' || key === 'troop';
      const frame = soldier ? 'survivor' : key === 'boss' || kind === 'tank' ? 'brute' : 'zombie';
      const f = frames[frame];
      const height = key === 'boss' ? 235 : key === 'enemy' ? object.displayHeight * 2 : 92;
      const width = height * f.w / f.h * (kind === 'runner' ? 0.8 : kind === 'tank' ? 1.2 : 1);
      const torso = scene.add.image(object.x, object.y, 'character-art', frame + '-torso').setOrigin(0.5, 1);
      const legs = ['left', 'right'].map(side => scene.add.image(object.x, object.y, 'character-art', frame + '-' + side).setOrigin(0.5, 0));
      const shadow = scene.add.ellipse(object.x, object.y + 12, width * 0.85, 15, 0x121018, 0.35);
      const tint = kind === 'runner' ? 0xffc06b : kind === 'tank' ? 0xb9a4ed : kind === 'grunt' ? 0xc9dfb0 : 0xffffff;
      if (kind && kind !== 'grunt') shadow.setStrokeStyle(2, kind === 'runner' ? 0xffbe55 : 0xba94ff, 0.9);
      const visual: Visual = { torso, legs, shadow, width, height, hip: f.hip / f.h,
        gun: soldier ? scene.add.image(object.x, object.y, 'held-' + weapon.id).setOrigin(0.5, 64 / 68).setScale(WEAPON_SCALE) : undefined,
        tint, phase: object.x * 0.13 + object.y * 0.07,
        cadence: kind === 'runner' ? 75 : key === 'boss' || kind === 'tank' ? 210 : soldier ? 100 : 140,
        lastX: object.x, lastY: object.y, motion: 0, heavy: key === 'boss' || kind === 'tank' };
      visuals.set(object, visual); object.setVisible(false);
      object.once('destroy', () => { destroy(visual); visuals.delete(object); });
    }
    for (const [actor, v] of visuals) {
      // Troops use interpolated positions, so displacement also drives their steps.
      const distance = Math.hypot(actor.x - v.lastX, actor.y - v.lastY);
      v.lastX = actor.x; v.lastY = actor.y;
      const recruitAlpha = scene.time.now < (actor.getData('recruitUntil') ?? 0) ? 0 : actor.alpha;
      const deathAt = actor.getData('deathAt') as number | undefined;
      const moving = actor.body?.enable && deathAt === undefined && distance > 0.04;
      const dt = Math.min(delta || 16, 50);
      v.motion = Phaser.Math.Linear(v.motion, moving ? 1 : 0, Math.min(1, dt / 90));
      v.phase += dt / v.cadence * v.motion;
      const stride = Math.sin(v.phase) * v.motion;
      const bob = Math.abs(Math.cos(v.phase)) * v.motion * (v.heavy ? 2 : 1.5);
      const death = deathAt === undefined ? 0 : Phaser.Math.Clamp((scene.time.now - deathAt) / 180, 0, 1);
      const hit = scene.time.now < (actor.getData('hitUntil') ?? 0);
      const shotAgo = scene.time.now - (actor.getData('shotAt') ?? -1000);
      const recoil = shotAgo >= 0 && shotAgo < 110 ? (1 - shotAgo / 110) : 0;
      const scale = (hit ? 0.94 : 1) * (1 - death * 0.25);
      const top = actor.y - v.height * 0.85;
      const hipY = top + v.height * v.hip;
      const depth = actor.y / 1000 + 2;
      v.torso.setDisplaySize(v.width * scale, (v.height * v.hip + 2) * scale)
        .setPosition(actor.x, hipY + 2 + bob + recoil * 1.5).setAngle(stride * 1.5 + death * 30).setDepth(depth + 0.002);
      v.legs.forEach((leg, i) => {
        const direction = i === 0 ? 1 : -1;
        leg.setDisplaySize(v.width / 2 * scale, v.height * (1 - v.hip) * scale * (1 + stride * direction * 0.045))
          .setPosition(actor.x + direction * -v.width / 4, hipY + stride * direction * (v.heavy ? 2 : 3))
          .setAngle(direction * stride * (v.heavy ? 5 : 9) + death * 30).setDepth(depth);
      });
      for (const part of [v.torso, ...v.legs]) {
        part.setAlpha(recruitAlpha * (1 - death));
        if (hit) part.setTint(0xffefcb).setTintMode(Phaser.TintModes.FILL);
        else part.setTintMode(Phaser.TintModes.MULTIPLY).setTint(actor.texture.key === 'boss' && actor.tintTopLeft !== 0xffffff ? 0xffb49e : v.tint);
      }
      if (v.gun) {
        const animation = weaponAnimation(weapon.id, shotAgo);
        if (v.gun.texture.key !== animation.texture) v.gun.setTexture(animation.texture);
        v.gun.setPosition(actor.x + 8, actor.y - 52 + animation.recoil)
          .setAngle(stride * 1.5).setDepth(depth + 0.004).setAlpha(recruitAlpha);
        v.gun.setTint(weapon.level === 3 ? 0xffe3a0 : weapon.level === 2 ? 0xc5eaff : 0xffffff);
      }
      v.shadow.setPosition(actor.x + 5, actor.y + 12).setDepth(depth - 1).setAlpha(recruitAlpha * (1 - death));
    }
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, render);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, render);
    for (const visual of visuals.values()) destroy(visual);
    visuals.clear();
  });
}
