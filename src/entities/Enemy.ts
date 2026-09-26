import Phaser from 'phaser';
import { stageDifficulty } from '../data/difficulty';
import {
  ENEMIES,
  type EnemyType,
} from '../data/enemies';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    private health: number;

    public readonly enemyType: EnemyType;
    private isDead = false;

    private enemyColor: number;
    private movementElapsedMs = 0;
    private readonly spawnX: number;
  
    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        enemyType: EnemyType,
        stage = 1,
        endlessRound = 0
        ) {
        super(
            scene,
            x,
            y,
            'enemy'
        );

        this.enemyType = enemyType;
        this.spawnX = x;

        const definition =
            ENEMIES[enemyType];

        this.health =
            stageDifficulty(stage, endlessRound).health[enemyType];

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setDisplaySize(
            definition.size,
            definition.size
        );

        this.setTint(
            definition.color
        );

        this.enemyColor =
            definition.color;

        this.setTint(
            this.enemyColor
        );
    }

    updateMovement(delta: number) {
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!this.active || this.isDead || !body.enable || delta <= 0) {
            return;
        }

        const movement = ENEMIES[this.enemyType].movement;
        if (movement.pattern === 'straight') {
            this.setVelocityX(0);
            return;
        }

        this.movementElapsedMs =
            (this.movementElapsedMs + delta) % movement.periodMs;

        // Reduce sway near an edge so the entire enemy stays on screen.
        const halfWidth = this.displayWidth / 2;
        const centerX = Phaser.Math.Clamp(
            this.spawnX, halfWidth, this.scene.scale.width - halfWidth
        );
        const amplitude = Math.max(0, Math.min(
            movement.amplitude,
            centerX - halfWidth,
            this.scene.scale.width - halfWidth - centerX
        ));
        const phase = this.movementElapsedMs / movement.periodMs * Math.PI * 2;
        const targetX = centerX + Math.sin(phase) * amplitude;

        // Use Arcade velocity to keep the collision body with the sprite.
        // Preserve the downward speed assigned when the enemy spawned.
        this.setVelocityX((targetX - this.x) / (delta / 1000));
    }

takeDamage(amount: number): boolean {
    if (this.isDead) {
        return false;
    }

    this.setData('hitUntil', this.scene.time.now + 100);
    this.health -= amount;

    if (this.health <= 0) {
        this.isDead = true;
        this.setData('deathAt', this.scene.time.now);

        // Stop the enemy immediately
        this.setVelocity(0, 0);

        // Disable its physics body so no more bullets hit it
        const body =
        this.body as Phaser.Physics.Arcade.Body;

        body.enable = false;

        // Death flash
        this.setTint(0xffffff);

        this.scene.time.delayedCall(
        180,
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
                this.setTint(
                    this.enemyColor
                );
            }
        }
    );

    return false;
    }
}