import Phaser from 'phaser';
import {
  ENEMIES,
  type EnemyType,
} from '../data/enemies';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    private health: number;

    public readonly enemyType: EnemyType;
    private isDead = false;

    private enemyColor: number;
  
    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        enemyType: EnemyType
        ) {
        super(
            scene,
            x,
            y,
            'enemy'
        );

        this.enemyType = enemyType;

        const definition =
            ENEMIES[enemyType];

        this.health =
            definition.health;

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
                this.setTint(
                    this.enemyColor
                );
            }
        }
    );

    return false;
    }
}