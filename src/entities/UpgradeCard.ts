import Phaser from 'phaser';

export class UpgradeCard extends Phaser.Physics.Arcade.Sprite {
  public readonly upgradeId: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    upgradeId: string
  ) {
    super(scene, x, y, 'upgrade-card');

    this.upgradeId = upgradeId;

    scene.add.existing(this);
    scene.physics.add.existing(this);
  }
}