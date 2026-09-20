import Phaser from 'phaser';

export class UpgradeCard extends Phaser.Physics.Arcade.Sprite {
  public readonly upgradeId: string;

  private label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    upgradeId: string
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
      this.getLabel(),
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

  private getLabel(): string {
    switch (this.upgradeId) {
      case 'rapid-fire':
        return 'RAPID\nFIRE';

      case 'add-troop':
        return '+1\nTROOP';

      default:
        return 'UPGRADE';
    }
  }

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