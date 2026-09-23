import Phaser from 'phaser';

export class Boss extends Phaser.Physics.Arcade.Sprite {
  readonly maxHealth = 160;
  health = this.maxHealth;
  private phase = 0;

  get enraged() { return this.health <= this.maxHealth / 2; }

  constructor(scene: Phaser.Scene) {
    super(scene, scene.scale.width / 2, 190, 'boss');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setImmovable(true);
  }

  updateMovement(delta: number) {
    if (!this.active || this.health <= 0 || delta <= 0) return;
    this.phase += delta / 1000 * (this.enraged ? 1.5 : 0.9);
    const target = this.scene.scale.width / 2 + Math.sin(this.phase) * 55;
    this.setVelocityX((target - this.x) / (delta / 1000));
    this.setTint(this.enraged ? 0xff756b : 0xffffff);
  }

  takeDamage(amount: number) {
    if (!this.active || this.health <= 0) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this.setVelocity(0, 0);
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
      return true;
    }
    return false;
  }
}
