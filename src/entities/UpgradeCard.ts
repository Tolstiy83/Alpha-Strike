import Phaser from 'phaser';
import {
  UPGRADES,
  type UpgradeId,
} from '../data/upgrades';

export class UpgradeCard extends Phaser.Physics.Arcade.Sprite {
  public readonly upgradeId: UpgradeId;

  private label: Phaser.GameObjects.Text;

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
      'upgrade-card'
    );

    this.upgradeId = upgradeId;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.label = scene.add.text(
      x,
      y,
      UPGRADES[this.upgradeId].cardLabel,
      {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#ffffff',
        align: 'center',
      }
    );

    this.label
      .setOrigin(0.5)
      .setDepth(10);
  }

  setRewardLabel(text: string) { this.label.setText(text); }

  update() {
    if (!this.active) {
      return;
    }

    this.label.setPosition(
      this.x,
      this.y
    );
  }

  destroy(fromScene?: boolean) {
    if (this.label) {
      this.label.destroy();
    }

    super.destroy(fromScene);
  }
}