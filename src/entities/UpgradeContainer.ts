import Phaser from 'phaser';
import type { UpgradeId } from '../data/upgrades';

export class UpgradeContainer extends Phaser.Physics.Arcade.Sprite {
  public health: number;
  public readonly maxHealth: number;
  private isBroken = false;

  public readonly upgradeId: UpgradeId;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        upgradeId: UpgradeId
        ) {
        super(
            scene,
            x,
            y,
            'upgrade-container'
        );

        this.upgradeId = upgradeId;
        this.maxHealth = upgradeId === 'add-troop' ? 10 : 24;
        this.health = this.maxHealth;

        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDisplaySize(upgradeId === 'add-troop' ? 70 : 100, 60);
        this.setTint(upgradeId === 'add-troop' ? 0x99ff99 : 0xaabbff);
    }

  takeDamage(amount: number): boolean {
    if (this.isBroken) {
      return false;
    }

    this.health = Math.max(0, this.health - amount);

    // Hit flash
    this.setTint(0xffffff);

    this.scene.time.delayedCall(50, () => {
      if (this.active && !this.isBroken) {
        this.setTint(this.upgradeId === 'add-troop' ? 0x99ff99 : 0xaabbff);
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