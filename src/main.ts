import './style.css';
import Phaser from 'phaser';

import { Player } from './entities/Player';
import { Projectile } from './entities/Projectile';
import { Enemy } from './entities/Enemy';

class GameScene extends Phaser.Scene {
  private player!: Player;

  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;

  private lastShotTime = 0;
  private fireRate = 250;

  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;

  private wave = 0;
  private enemiesToSpawn = 0;
  private enemiesAlive = 0;
  private waveInProgress = false;

  private waveText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create() {
    this.createTextures();

    // -----------------------
    // Player
    // -----------------------

    this.player = new Player(
      this,
      400,
      620
    );

    // -----------------------
    // Physics groups
    // -----------------------

    this.projectiles = this.physics.add.group();

    this.enemies = this.physics.add.group();

    // -----------------------
    // Bullet / enemy collision
    // -----------------------

    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.handleBulletEnemyCollision,
      undefined,
      this
    );

    // -----------------------
    // UI
    // -----------------------

    this.add.text(
      20,
      20,
      'ALPHA STRIKE',
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
      }
    );

    this.scoreText = this.add.text(
      20,
      55,
      'Score: 0',
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
      }
    );

    this.waveText = this.add.text(
      650,
      20,
      'Wave: 0',
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
      }
    );

    this.add.text(
      20,
      85,
      'Move: ← → or A / D',
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#aaaaaa',
      }
    );

    this.startNextWave();
  }

  update(time: number) {
    this.player.update();

    // Automatic shooting
    if (time - this.lastShotTime >= this.fireRate) {
      this.fireProjectile();
      this.lastShotTime = time;
    }
  }

  private startNextWave() {
    this.wave++;

    this.waveText.setText(
      `Wave: ${this.wave}`
    );

    this.waveInProgress = true;

    // Each wave contains more enemies
    this.enemiesToSpawn =
      4 + this.wave * 2;

    this.enemiesAlive =
      this.enemiesToSpawn;

    let enemiesSpawned = 0;

    const spawnTimer = this.time.addEvent({
      delay: 500,

      callback: () => {
        this.spawnEnemy();

        enemiesSpawned++;

        if (
          enemiesSpawned >=
          this.enemiesToSpawn
        ) {
          spawnTimer.destroy();
        }
      },

      loop: true,
    });
  }

  private fireProjectile() {
    const projectile = new Projectile(
      this,
      this.player.x,
      this.player.y - 30
    );

    this.projectiles.add(projectile);

    // Set velocity AFTER adding to physics group
    projectile.setVelocityY(-700);
  }

  private spawnEnemy() {
    const x = Phaser.Math.Between(
      40,
      this.scale.width - 40
    );

    const enemy = new Enemy(
      this,
      x,
      20
    );

    this.enemies.add(enemy);

    const enemySpeed =
      80 + this.wave * 10;

    enemy.setVelocityY(enemySpeed);
  }

  private handleBulletEnemyCollision: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
    (bulletObject, enemyObject) => {
      const bullet =
        bulletObject as Projectile;

      const enemy =
        enemyObject as Enemy;

      bullet.destroy();

      const enemyKilled =
        enemy.takeDamage(1);

      if (enemyKilled) {
        this.score += 100;

        this.scoreText.setText(
          `Score: ${this.score}`
        );

        this.enemiesAlive--;

        this.checkWaveComplete();
      }
    };

  private checkWaveComplete() {
    if (
      this.waveInProgress &&
      this.enemiesAlive <= 0
    ) {
      this.waveInProgress = false;

      this.waveText.setText(
        `Wave ${this.wave} Complete!`
      );

      this.time.delayedCall(
        2000,
        () => {
          this.startNextWave();
        }
      );
    }
  }

  private createTextures() {
    const graphics =
      this.make.graphics({
        x: 0,
        y: 0,
      });

    // -----------------------
    // Player
    // -----------------------

    graphics.fillStyle(0x4fc3f7);

    graphics.fillTriangle(
      20,
      0,
      0,
      40,
      40,
      40
    );

    graphics.generateTexture(
      'player',
      40,
      40
    );

    graphics.clear();

    // -----------------------
    // Bullet
    // -----------------------

    graphics.fillStyle(0xffeb3b);

    graphics.fillRect(
      0,
      0,
      6,
      18
    );

    graphics.generateTexture(
      'bullet',
      6,
      18
    );

    graphics.clear();

    // -----------------------
    // Enemy
    // -----------------------

    graphics.fillStyle(0xff5252);

    graphics.fillRect(
      0,
      0,
      36,
      36
    );

    graphics.generateTexture(
      'enemy',
      36,
      36
    );

    graphics.destroy();
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,

  width: 800,
  height: 700,

  backgroundColor: '#10131c',

  physics: {
    default: 'arcade',

    arcade: {
      debug: true,
    },
  },

  scene: GameScene,
};

new Phaser.Game(config);