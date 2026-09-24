import Phaser from 'phaser';

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
    height: number; phase: number;
  }>();
  const render = () => {
    for (const object of [...scene.children.list]) {
      if (!(object instanceof Phaser.Physics.Arcade.Sprite)) continue;
      const key = object.texture.key;
      if (!['player', 'troop', 'enemy', 'boss'].includes(key) || visuals.has(object)) continue;
      const frame = key === 'enemy' ? 'zombie' : key === 'boss' ? 'brute' : 'survivor';
      const height = key === 'boss' ? 235 : key === 'enemy' ? object.displayHeight * 2 : 105;
      const image = scene.add.image(object.x, object.y, 'character-art', frame).setOrigin(0.5, 0.85);
      image.setDisplaySize(height * image.width / image.height, height);
      const shadow = scene.add.ellipse(object.x, object.y + 12, image.displayWidth * 0.85, 15, 0x121018, 0.35);
      const visual = {image, shadow, height, phase: object.x * 0.1};
      visuals.set(object, visual);
      object.setVisible(false);
      object.once('destroy', () => {image.destroy(); shadow.destroy(); visuals.delete(object);});
    }
    for (const [actor, visual] of visuals) {
      const moving = actor.body && (Math.abs(actor.body.velocity.x) + Math.abs(actor.body.velocity.y) > 1);
      const bob = moving ? Math.sin(scene.time.now / 130 + visual.phase) * 2 : 0;
      visual.image.setPosition(actor.x, actor.y + bob).setAlpha(actor.alpha);
      visual.image.setAngle(moving ? Math.sin(scene.time.now / 180 + visual.phase) * 2 : 0);
      visual.image.setDepth(actor.y / 1000 + 2);
      visual.shadow.setPosition(actor.x + 5, actor.y + 12).setDepth(actor.y / 1000 + 1);
      visual.image.setTint(actor.texture.key === 'boss' && actor.tintTopLeft !== 0xffffff ? 0xffb49e : 0xffffff);
    }
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, render);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, render);
    for (const visual of visuals.values()) {visual.image.destroy(); visual.shadow.destroy();}
    visuals.clear();
  });
}
