import Phaser from 'phaser';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  damage = 1;
  splash = 0;
  range = 1000;
  readonly startY: number;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number
  ) {
    super(scene, x, y, 'bullet');
    this.startY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);
  }
}