import Phaser from 'phaser';

export class Troop extends Phaser.Physics.Arcade.Sprite {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number
  ) {
    super(scene, x, y, 'troop');

    scene.add.existing(this);
    scene.physics.add.existing(this);
  }
}