import Phaser from 'phaser';

export class UpgradeContainer extends Phaser.Physics.Arcade.Sprite {
  private health = 5;
  private isBroken = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number
  ) {
    super(scene, x, y, 'upgrade-container');

    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  takeDamage(amount: number): boolean {
    if (this.isBroken) {
      return false;
    }

    this.health -= amount;

    // Hit flash
    this.setTint(0xffffff);

    this.scene.time.delayedCall(50, () => {
      if (this.active && !this.isBroken) {
        this.clearTint();
      }
    });

    if (this.health <= 0) {
      this.isBroken = true;

      const body =
        this.body as Phaser.Physics.Arcade.Body;

      body.enable = false;

      return true;
    }

    return false;
  }
}