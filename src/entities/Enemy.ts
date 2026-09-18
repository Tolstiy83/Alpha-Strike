import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private health = 2;

  private isDead = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number
  ) {
    super(scene, x, y, 'enemy');

    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

takeDamage(amount: number): boolean {
    if (this.isDead) {
        return false;
    }

    this.health -= amount;

    if (this.health <= 0) {
        this.isDead = true;

        // Stop the enemy immediately
        this.setVelocity(0, 0);

        // Disable its physics body so no more bullets hit it
        const body =
        this.body as Phaser.Physics.Arcade.Body;

        body.enable = false;

        // Death flash
        this.setTint(0xffffff);

        this.scene.time.delayedCall(
        60,
        () => {
            if (this.active) {
            this.destroy();
            }
        }
        );

        return true;
    }

    // Hit feedback
    this.setTint(0xffffff);

    this.scene.time.delayedCall(
        50,
        () => {
        if (this.active && !this.isDead) {
            this.clearTint();
        }
        }
    );

    return false;
    }
}