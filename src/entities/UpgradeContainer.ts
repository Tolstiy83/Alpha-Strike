import Phaser from 'phaser';
import type { UpgradeId } from '../data/upgrades';

export class UpgradeContainer extends Phaser.Physics.Arcade.Sprite {
  public health: number;
  public readonly maxHealth: number;
  private isBroken = false;
  private healthLabel?: Phaser.GameObjects.Text;

  public readonly upgradeId: UpgradeId;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        upgradeId: UpgradeId,
        rewardLevel = 1
        ) {
        super(
            scene,
            x,
            y,
            'weapon-barrel'
        );

        this.upgradeId = upgradeId;
        this.maxHealth = upgradeId === 'add-troop' ? 10 : 24 + (Math.max(1, Math.min(3, rewardLevel)) - 1) * 6;
        this.health = this.maxHealth;

        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDisplaySize(86, 86);
        this.setTint(upgradeId === 'add-troop' ? 0x99ff99 : 0xffffff);
        {
          this.healthLabel = scene.add.text(x, y, String(Math.ceil(this.health)), {
            fontFamily: 'Arial', fontSize: '40px', fontStyle: 'bold', color: '#ffffff',
            stroke: '#25190e', strokeThickness: 6,
          }).setOrigin(0.5).setDepth(12);
          this.once('destroy', () => this.healthLabel?.destroy());
        }
    }

  updateHealthLabel() { this.healthLabel?.setPosition(this.x, this.y); }

  takeDamage(amount: number): boolean {
    if (this.isBroken) {
      return false;
    }

    this.health = Math.max(0, Number((this.health - amount).toFixed(2)));
    this.healthLabel?.setText(String(Math.ceil(this.health)));

    // Hit flash
    this.setTint(0xffffff);

    this.scene.time.delayedCall(50, () => {
      if (this.active && !this.isBroken) {
        this.setTint(this.upgradeId === 'add-troop' ? 0x99ff99 : 0xffffff);
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