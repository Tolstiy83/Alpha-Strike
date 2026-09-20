import './style.css';
import Phaser from 'phaser';

import { Troop } from './entities/Troops';
import { Player } from './entities/Player';
import { Projectile } from './entities/Projectile';
import { Enemy } from './entities/Enemy';
import { UpgradeContainer } from './entities/UpgradeContainer';
import { UpgradeCard } from './entities/UpgradeCard';

class GameScene extends Phaser.Scene {
  private player!: Player;

  private troops!: Phaser.Physics.Arcade.Group;

  private troopSpacingX = 45;
  private troopSpacingY = 45;

  private troopsPerRow = 5;

  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;

  private lastShotTime = 0;
  private weaponStats = {
    fireRate: 250,
    damage: 1,
    projectileCount: 1,
  };
  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;

  private wave = 0;
  private enemiesToSpawn = 0;
  private enemiesAlive = 0;
  private waveInProgress = false;
  private waveText!: Phaser.GameObjects.Text;

  private playerHealth = 100;
  private maxPlayerHealth = 100;
  private healthText!: Phaser.GameObjects.Text;

  private isGameOver = false;

  private healthBarBackground!: Phaser.GameObjects.Rectangle;
  private healthBarFill!: Phaser.GameObjects.Rectangle;

  private healthBarWidth = 200;

  private upgradeContainers!: Phaser.Physics.Arcade.Group;
  private upgradeCards!: Phaser.Physics.Arcade.Group;

  private upgradeSpawnedThisWave = false;

  constructor() {
    super('GameScene');
  }

  create() {
    this.score = 0;

    this.wave = 0;
    this.enemiesToSpawn = 0;
    this.enemiesAlive = 0;
    this.waveInProgress = false;

    this.playerHealth = this.maxPlayerHealth;

    this.isGameOver = false;

    this.lastShotTime = 0;

    this.weaponStats = {
      fireRate: 250,
      damage: 1,
      projectileCount: 1,
    };

    this.troops = this.physics.add.group();

    this.createTextures();

    // -----------------------
    // Player
    // -----------------------

    this.player = new Player(
      this,
      400,
      500
    );

    // -----------------------
    // Physics groups
    // -----------------------

    this.projectiles = this.physics.add.group();

    this.enemies = this.physics.add.group();

    // -----------------------
    // Upgrade groups
    // -----------------------

    this.upgradeContainers =
      this.physics.add.group();

    this.upgradeCards =
      this.physics.add.group();

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
    // Bullet / container collision
    // -----------------------

    this.physics.add.overlap(
      this.projectiles,
      this.upgradeContainers,
      this.handleBulletContainerCollision,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.upgradeCards,
      this.handlePlayerCardCollision,
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

    this.healthText = this.add.text(
      20,
      85,
      `Health: ${this.playerHealth}/${this.maxPlayerHealth}`,
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
      }
    );

    this.healthBarBackground = this.add.rectangle(
      20,
      115,
      this.healthBarWidth,
      14,
      0x333333
    );

    this.healthBarBackground.setOrigin(0, 0.5);

    this.healthBarFill = this.add.rectangle(
      20,
      115,
      this.healthBarWidth,
      14,
      0x4caf50
    );

    this.healthBarFill.setOrigin(0, 0.5);

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
      135,
      'Move: ← → or A / D',
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#aaaaaa',
      }
    );

    this.startNextWave();

    this.input.keyboard!.on(
      'keydown-SPACE',
      () => {
        if (this.isGameOver) {
          this.scene.restart();
        }
      }
    );
  }

  update(time: number) {
    if (this.isGameOver) {
      return;
    }

    this.player.update();

    this.constrainPlayerToFormation();

    this.updateTroopFormation();

    // Automatic shooting
    if (
      time - this.lastShotTime >=
      this.weaponStats.fireRate
    ) {
      this.fireSquad();
      this.lastShotTime = time;
    }

    // Check enemies that reached the bottom
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Enemy;

      if (
        enemy.active &&
        enemy.y > this.scale.height
      ) {
        this.enemyEscaped(enemy);
      }
    }

    // Clean up bullets that leave the screen
    for (const child of this.projectiles.getChildren()) {
      const projectile = child as Projectile;

      if (
        projectile.active &&
        projectile.y < -30
      ) {
        projectile.destroy();
      }
    }

    // Clean up upgrade cards that leave the screen
    for (
      const child of
      this.upgradeCards.getChildren()
    ) {
      const card =
        child as UpgradeCard;

      if (card.active) {
        card.update();

        // Remove missed cards
        if (
          card.y >
          this.scale.height + 50
        ) {
          card.destroy();
        }
      }
    }
  }

  private enemyEscaped(enemy: Enemy) {
    enemy.destroy();

    this.enemiesAlive--;

    this.damagePlayer(20);

    if (!this.isGameOver) {
      this.checkWaveComplete();
    }
  }

  private damagePlayer(amount: number) {
    this.playerHealth -= amount;

    if (this.playerHealth < 0) {
      this.playerHealth = 0;
    }

    this.healthText.setText(
      `Health: ${this.playerHealth}/${this.maxPlayerHealth}`
    );

    const healthPercent =
      this.playerHealth / this.maxPlayerHealth;

    this.healthBarFill.width =
      this.healthBarWidth * healthPercent;

    // Damage feedback
    this.cameras.main.flash(
      150,
      255,
      50,
      50,
      false
    );

    if (this.playerHealth <= 0) {
      this.gameOver();
    }
  }

  private gameOver() {
    this.isGameOver = true;
    this.waveInProgress = false;

    // Stop all Phaser timers
    this.time.removeAllEvents();

    // Stop enemies
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Enemy;

      if (enemy.active) {
        enemy.setVelocity(0, 0);
      }
    }

    // Remove remaining bullets
    this.projectiles.clear(true, true);

    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      'GAME OVER',
      {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#ff5252',
      }
    ).setOrigin(0.5);

    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 60,
      `Score: ${this.score}`,
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
      }
    ).setOrigin(0.5);

    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 110,
      'Press SPACE to restart',
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#aaaaaa',
      }
    ).setOrigin(0.5);
  }

  private startNextWave() {
    if (this.isGameOver) {
      return;
    }

    this.wave++;

    this.upgradeSpawnedThisWave = false;

    this.waveText.setText(
      `Wave: ${this.wave}`
    );

    const announcement =
      this.add.text(
        this.scale.width / 2,
        this.scale.height / 2,
        `WAVE ${this.wave}`,
        {
          fontFamily: 'Arial',
          fontSize: '48px',
          color: '#ffffff',
        }
      );

    announcement.setOrigin(0.5);

    this.time.delayedCall(
      1500,
      () => {
        announcement.destroy();

        if (!this.isGameOver) {
          this.beginWave();
        }
      }
    );
  }

  private beginWave() {
    this.waveInProgress = true;

    this.enemiesToSpawn =
      4 + this.wave * 2;

    this.enemiesAlive =
      this.enemiesToSpawn;

    let enemiesSpawned = 0;

    const spawnTimer =
      this.time.addEvent({
        delay: 500,

        callback: () => {
          if (this.isGameOver) {
            return;
          }

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

    if (!this.upgradeSpawnedThisWave) {
      this.time.delayedCall(
        2000,
        () => {
          if (!this.isGameOver) {
            this.spawnUpgradeContainer();
          }
        }
      );

      this.upgradeSpawnedThisWave = true;
    }
  }

  private fireSquad() {
    // Player fires
    this.fireProjectileFrom(
      this.player.x,
      this.player.y - 30
    );

    // Every troop fires
    for (
      const child of
      this.troops.getChildren()
    ) {
      const troop =
        child as Troop;

      if (troop.active) {
        this.fireProjectileFrom(
          troop.x,
          troop.y - 30
        );
      }
    }
  }

  private fireProjectileFrom(
    x: number,
    y: number
  ) {
    const projectile =
      new Projectile(
        this,
        x,
        y
      );

    this.projectiles.add(
      projectile
    );

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
      -20
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

  private handleBulletContainerCollision:
    Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
      (bulletObject, containerObject) => {

        const bullet =
          bulletObject as Projectile;

        if (!(containerObject instanceof UpgradeContainer)) {
          return;
        }

        const container = containerObject;

        bullet.destroy();

        const destroyed =
          container.takeDamage(1);

        if (destroyed) {
          this.destroyUpgradeContainer(
            container
          );
        }
      };

  private destroyUpgradeContainer(
    container: UpgradeContainer
  ) {
    const x = container.x;
    const y = container.y;

    container.destroy();

    const upgradeId =
      this.getRandomUpgradeId();

    console.log(
      'Creating upgrade card:',
      upgradeId
    );

    const card = new UpgradeCard(
      this,
      x,
      y,
      upgradeId
    );

    this.upgradeCards.add(card);

    card.setVelocityY(100);
  }

  private handlePlayerCardCollision:
    Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
      (_playerObject, cardObject) => {
        const card =
          cardObject as UpgradeCard;

        this.applyUpgrade(card.upgradeId);

        card.destroy();
      };

  private applyUpgrade(upgradeId: string) {
    console.log(
      'Applying upgrade:',
      upgradeId
    );

    switch (upgradeId) {
      case 'rapid-fire':
        this.weaponStats.fireRate =
          Math.max(
            75,
            this.weaponStats.fireRate * 0.8
          );

        this.showUpgradeNotification(
          'RAPID FIRE',
          'Fire Rate +20%'
        );

        break;

      case 'add-troop':
        this.addTroop();

        this.showUpgradeNotification(
          '+1 TROOP',
          'Soldier joined your squad!'
        );

        break;

      default:
        console.warn(
          `Unknown upgrade: ${upgradeId}`
        );
    }
  }

  private addTroop() {
    const troop = new Troop(
      this,
      this.player.x,
      this.player.y
    );

    this.troops.add(troop);

    this.updateTroopFormation();
  }

  private updateTroopFormation() {
    const troops =
      this.troops.getChildren() as Troop[];

    troops.forEach(
      (troop, index) => {

        const row =
          Math.floor(
            index / this.troopsPerRow
          );

        const indexInRow =
          index % this.troopsPerRow;

        const troopsInThisRow =
          Math.min(
            this.troopsPerRow,
            troops.length -
              row * this.troopsPerRow
          );

        const rowWidth =
          (troopsInThisRow - 1) *
          this.troopSpacingX;

        const startX =
          this.player.x -
          rowWidth / 2;

        const targetX =
          startX +
          indexInRow *
            this.troopSpacingX;

        const targetY =
          this.player.y +
          50 +
          row *
            this.troopSpacingY;

        troop.x = Phaser.Math.Linear(
          troop.x,
          targetX,
          0.15
        );

        troop.y = Phaser.Math.Linear(
          troop.y,
          targetY,
          0.15
        );
      }
    );
  }

  private constrainPlayerToFormation() {
    const troopCount =
      this.troops.getLength();

    if (troopCount === 0) {
      return;
    }

    const widestRowCount =
      Math.min(
        troopCount,
        this.troopsPerRow
      );

    const formationHalfWidth =
      ((widestRowCount - 1) *
        this.troopSpacingX) /
      2;

    const margin = 25;

    const minX =
      formationHalfWidth +
      margin;

    const maxX =
      this.scale.width -
      formationHalfWidth -
      margin;

    this.player.x =
      Phaser.Math.Clamp(
        this.player.x,
        minX,
        maxX
      );
  }

  private showUpgradeNotification(
    title: string,
    description: string
  ) {
    const notification =
      this.add.text(
        this.scale.width / 2,
        this.scale.height - 120,
        `${title}\n${description}`,
        {
          fontFamily: 'Arial',
          fontSize: '22px',
          color: '#ffffff',
          align: 'center',
          backgroundColor: '#000000',
          padding: {
            x: 16,
            y: 10,
          },
        }
      );

    notification
      .setOrigin(0.5)
      .setDepth(100);

    this.time.delayedCall(
      1200,
      () => {
        notification.destroy();
      }
    );
  }

  private spawnUpgradeContainer() {
    const container =
      new UpgradeContainer(
        this,
        this.scale.width / 2,
        180
      );

    this.upgradeContainers.add(
      container
    );
  }

  private getRandomUpgradeId(): string {
    const upgrades = [
      'rapid-fire',
      'add-troop',
    ];

    return Phaser.Utils.Array.GetRandom(
      upgrades
    );
  }

  private checkWaveComplete() {
    if (
      !this.waveInProgress ||
      this.enemiesAlive > 0 ||
      this.isGameOver
    ) {
      return;
    }

    this.waveInProgress = false;

    const announcement =
      this.add.text(
        this.scale.width / 2,
        this.scale.height / 2,
        `WAVE ${this.wave} COMPLETE`,
        {
          fontFamily: 'Arial',
          fontSize: '36px',
          color: '#ffffff',
        }
      );

    announcement.setOrigin(0.5);

    this.time.delayedCall(
      1500,
      () => {
        announcement.destroy();

        if (!this.isGameOver) {
          this.startNextWave();
        }
      }
    );
  }

  private createTextures() {
    if (
      this.textures.exists('player') &&
      this.textures.exists('bullet') &&
      this.textures.exists('enemy') &&
      this.textures.exists('upgrade-container') &&
      this.textures.exists('upgrade-card') &&
      this.textures.exists('troop')
    ) {
      return;
    }

    const graphics = this.make.graphics({
      x: 0,
      y: 0,
    });

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

    // Upgrade container
    graphics.clear();

    graphics.fillStyle(0x8d6e63);
    graphics.fillRect(0, 0, 60, 45);

    graphics.generateTexture(
      'upgrade-container',
      60,
      45
    );

    // Upgrade card
    graphics.clear();

    graphics.fillStyle(0x42a5f5);
    graphics.fillRect(0, 0, 40, 55);

    graphics.generateTexture(
      'upgrade-card',
      40,
      55
    );

    // Troop
    graphics.clear();

    graphics.fillStyle(0x66bb6a);
    graphics.fillTriangle(
      18,
      0,
      0,
      36,
      36,
      36
    );

    graphics.generateTexture(
      'troop',
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