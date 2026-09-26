import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';

export function installCharacterArt(scene: Phaser.Scene) {
  if (!scene.textures.exists('character-art')) return;
  const atlas = scene.textures.get('character-art');
  if (!atlas.has('survivor')) {
    atlas.add('survivor', 0, 65, 20, 375, 970);
    atlas.add('zombie', 0, 525, 170, 420, 800);
    atlas.add('brute', 0, 945, 140, 590, 840);
  }
  const visuals = new Map<Phaser.Physics.Arcade.Sprite, {
    image: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse;
    height: number; phase: number; cadence: number; tint: number; width: number;
  }>();
  const render = () => {
    for (const object of [...scene.children.list]) {
      if (!(object instanceof Phaser.Physics.Arcade.Sprite)) continue;
      const key = object.texture.key;
      if (!['player', 'troop', 'enemy', 'boss'].includes(key) || visuals.has(object)) continue;
      const kind = object instanceof Enemy ? object.enemyType : undefined;
      const frame = key === 'boss' || kind === 'tank' ? 'brute' : key === 'enemy' ? 'zombie' : 'survivor';
      const height = key === 'boss' ? 235 : key === 'enemy' ? object.displayHeight * 2 : 105;
      const image = scene.add.image(object.x, object.y, 'character-art', frame).setOrigin(0.5, 0.85);
      image.setDisplaySize(height * image.width / image.height, height);
      const shadow = scene.add.ellipse(object.x, object.y + 12, image.displayWidth * 0.85, 15, 0x121018, 0.35);
      const tint = kind === 'runner' ? 0xffc06b : kind === 'tank' ? 0xb9a4ed : kind === 'grunt' ? 0xc9dfb0 : 0xffffff;
      if (kind === 'runner') image.displayWidth *= 0.8;
      if (kind === 'tank') image.displayWidth *= 1.2;
      if (kind && kind !== 'grunt') shadow.setStrokeStyle(2, kind === 'runner' ? 0xffbe55 : 0xba94ff, 0.9);
      const visual = {image, shadow, height, width: image.displayWidth, phase: object.x * 0.1,
        cadence: kind === 'runner' ? 70 : kind === 'tank' ? 220 : 130, tint};
      visuals.set(object, visual);
      object.setVisible(false);
      object.once('destroy', () => {image.destroy(); shadow.destroy(); visuals.delete(object);});
    }
    for (const [actor, visual] of visuals) {
      const moving = actor.body && (Math.abs(actor.body.velocity.x) + Math.abs(actor.body.velocity.y) > 1);
      const bob = moving ? Math.sin(scene.time.now / visual.cadence + visual.phase) * 2 : 0;
      visual.image.setPosition(actor.x, actor.y + bob).setAlpha(actor.alpha);
      visual.image.setAngle(moving ? Math.sin(scene.time.now / 180 + visual.phase) * 2 : 0);
      visual.image.setDepth(actor.y / 1000 + 2);
      visual.shadow.setPosition(actor.x + 5, actor.y + 12).setDepth(actor.y / 1000 + 1);
      const hit = scene.time.now < (actor.getData('hitUntil') ?? 0);
      const deathAt = actor.getData('deathAt') as number | undefined;
      const death = deathAt === undefined ? 0 : Phaser.Math.Clamp((scene.time.now - deathAt) / 180, 0, 1);
      const recoil = hit ? 0.94 : 1;
      visual.image.setDisplaySize(visual.width * recoil * (1 - death * 0.2), visual.height * recoil * (1 - death * 0.3));
      if (hit) visual.image.setTint(0xffefcb).setTintMode(Phaser.TintModes.FILL);
      else visual.image.setTintMode(Phaser.TintModes.MULTIPLY).setTint(actor.texture.key === 'boss' && actor.tintTopLeft !== 0xffffff ? 0xffb49e : visual.tint);
      if (deathAt !== undefined) visual.image.setAngle(death * 30).setAlpha(1 - death);
      visual.shadow.setAlpha(actor.alpha * (1 - death));
    }
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, render);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, render);
    for (const visual of visuals.values()) {visual.image.destroy(); visual.shadow.destroy();}
    visuals.clear();
  });
}
