import Phaser from 'phaser';
import { BOSS_DIFFICULTY } from '../data/difficulty';
import { laneForX } from '../data/campaign';

export type BossStyle = 'melee' | 'ranged' | 'sweep';

export class Boss extends Phaser.Physics.Arcade.Sprite {
  readonly maxHealth: number;
  health: number;
  private attackElapsed = 0;
  private windingUp = false;
  private recovery = 0;
  readonly style: BossStyle;
  private endlessRound: number;
  attackLane = 0;
  private sweepStart = 0;
  private sweepIndex = 0;

  get windupDuration() { return this.style === 'sweep' ? (this.enraged ? 1100 : 1400) : this.style === 'ranged' ? (this.enraged ? 850 : 1200) : (this.enraged ? 650 : 900); }
  get attackProgress() { return this.windingUp ? Math.min(1, this.attackElapsed / this.windupDuration) : 0; }

  get enraged() { return this.health <= this.maxHealth / 2; }

  constructor(scene: Phaser.Scene, style: BossStyle = 'melee', endlessRound = 0) {
    super(scene, scene.scale.width / 2, 190, 'boss');
    this.style = style;
    this.endlessRound = endlessRound;
    this.maxHealth = endlessRound > 0 ? Math.ceil(900 * (1 + endlessRound * 0.18)) : BOSS_DIFFICULTY[style].health;
    this.health = this.maxHealth;
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
      if (this.attackElapsed >= this.windupDuration) {
        this.windingUp = false;
        this.recovery = Math.max(200, BOSS_DIFFICULTY[this.style].recovery[this.enraged ? 1 : 0] * Math.max(0.5, 1 - this.endlessRound * 0.04));
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
    const dy = Math.max(0, targetY - (this.style !== 'melee' ? 280 : 70) - this.y);
    if (dy <= 5 && (this.style !== 'melee' || Math.abs(dx) <= 80)) {
      this.setVelocity(0, 0);
      if (this.style === 'sweep') {
        if (this.sweepIndex === 0) this.sweepStart = laneForX(targetX, this.scene.scale.width);
        this.attackLane = (this.sweepStart + this.sweepIndex) % 3;
        this.sweepIndex = (this.sweepIndex + 1) % 3;
      }
      this.windingUp = true;
      this.attackElapsed = 0;
      return 'warning';
    }
    // Approach the squad, then follow sideways to prevent safe side-lane camping.
    const speed = BOSS_DIFFICULTY[this.style].speed * (this.enraged ? 1.4 : 1) * Math.min(1.4, 1 + this.endlessRound * 0.025);
    this.setVelocity(
      Phaser.Math.Clamp(dx * 1.5, -speed * 1.7, speed * 1.7),
      Math.min(speed, dy * 3)
    );
  }

  takeDamage(amount: number) {
    if (!this.active || this.health <= 0) return false;
    this.setData('hitUntil', this.scene.time.now + 90);
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this.setVelocity(0, 0);
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
      return true;
    }
    return false;
  }
}
