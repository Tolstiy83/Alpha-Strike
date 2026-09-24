import Phaser from 'phaser';

export class Boss extends Phaser.Physics.Arcade.Sprite {
  readonly maxHealth = 320;
  health = this.maxHealth;
  private attackElapsed = 0;
  private windingUp = false;
  private recovery = 0;

  get enraged() { return this.health <= this.maxHealth / 2; }

  constructor(scene: Phaser.Scene) {
    super(scene, scene.scale.width / 2, 190, 'boss');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setImmovable(true);
  }

  updateCombat(delta: number, targetX: number, targetY: number): 'warning' | 'strike' | undefined {
    if (!this.active || this.health <= 0 || delta <= 0) return;
    this.setTint(this.enraged ? 0xff756b : 0xffffff);
    if (this.windingUp) {
      this.setVelocity(0, 0);
      this.attackElapsed += delta;
      if (this.attackElapsed >= (this.enraged ? 650 : 900)) {
        this.windingUp = false;
        this.recovery = this.enraged ? 1200 : 1800;
        return 'strike';
      }
      return;
    }
    if (this.recovery > 0) {
      this.recovery = Math.max(0, this.recovery - delta);
      this.setVelocity(0, 0);
      return;
    }
    const dx = targetX - this.x;
    const dy = Math.max(0, targetY - 70 - this.y);
    if (dy <= 5 && Math.abs(dx) <= 80) {
      this.setVelocity(0, 0);
      this.windingUp = true;
      this.attackElapsed = 0;
      return 'warning';
    }
    // Approach the squad, then follow sideways to prevent safe side-lane camping.
    const speed = this.enraged ? 48 : 32;
    this.setVelocity(
      Phaser.Math.Clamp(dx * 1.5, -speed * 1.7, speed * 1.7),
      Math.min(speed, dy * 3)
    );
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
