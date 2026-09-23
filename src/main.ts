import './style.css';
import Phaser from 'phaser';

import { TroopSystem } from './systems/TroopSystems';

import { Player } from './entities/Player';
import { Projectile } from './entities/Projectile';
import { Boss } from './entities/Boss';
import { Enemy } from './entities/Enemy';
import { UpgradeContainer } from './entities/UpgradeContainer';
import { UpgradeCard } from './entities/UpgradeCard';
import {
  UPGRADE_POOL,
  UPGRADES,
  type UpgradeId,
} from './data/upgrades';
import {
  ENEMIES,
  type EnemyType,
} from './data/enemies';

class GameScene extends Phaser.Scene {
  private boss?: Boss;
  private bossLabel?: Phaser.GameObjects.Text;
  private bossBar?: Phaser.GameObjects.Rectangle;
  private bossBarBackground?: Phaser.GameObjects.Rectangle;
  private bossSummonElapsed = 0;
  private rewardPending = false;
  private player!: Player;

  private troopSystem!: TroopSystem;

  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;

  private lastShotTime = 0;
  private weaponStats = {
    fireRate: 250,
    damage: 1,
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

  private weaponStatsText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create() {
    this.boss = undefined;
    this.bossLabel = undefined;
    this.bossBar = undefined;
    this.bossBarBackground = undefined;
    this.bossSummonElapsed = 0;
    this.rewardPending = false;
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
    };

    this.createTextures();

    // -----------------------
    // Player
    // -----------------------

    this.player = new Player(
      this,
      this.scale.width / 2,
      680
    );

    this.troopSystem =
      new TroopSystem(
        this,
        this.player
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
    // HUD
    // -----------------------
    this.weaponStatsText = this.add.text(
      20,
      145,
      '',
      {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#aaaaaa',
        lineSpacing: 4,
      }
    );

    this.updateWeaponStatsText();

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

    const controlsText = this.add.text(
      this.scale.width / 2,
      this.scale.height - 25,
      'Move: ← → or A/D',
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#777777',
      }
    );

    controlsText.setOrigin(0.5);

    this.time.delayedCall(
      5000,
      () => {
        this.tweens.add({
          targets: controlsText,
          alpha: 0,
          duration: 1000,
          onComplete: () => {
            controlsText.destroy();
          },
        });
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

  update(time: number, delta: number) {
    if (this.isGameOver) {
      return;
    }

    this.updateBoss(delta);
    this.player.update();

    this.troopSystem.update();

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
      enemy.updateMovement(delta);

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
          this.finishRewardPhase();
        }
      }
    }
  }

  private enemyEscaped(enemy: Enemy) {
    enemy.destroy();

    this.enemiesAlive--;

    const definition =
      ENEMIES[enemy.enemyType];

    this.damagePlayer(
      definition.escapeDamage
    );

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

    this.boss?.setVelocity(0, 0);

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

    this.waveText.setText(
      `Wave: ${this.wave}`
    );

    const announcement =
      this.add.text(
        this.scale.width / 2,
        this.scale.height / 2,
        this.wave === 5 ? 'WAVE 5 — BOSS' : `WAVE ${this.wave}`,
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
    if (this.wave === 5) {
      this.beginBossWave();
      return;
    }

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

          const enemyType =
            this.getEnemyTypeForWave();

          this.spawnEnemy(
            enemyType
          );

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

  private getEnemyTypeForWave():
    EnemyType {

    // Wave 1:
    // Grunts only
    if (this.wave === 1) {
      return 'grunt';
    }

    // Waves 2-3:
    // Introduce runners
    if (this.wave <= 3) {
      return Phaser.Math.Between(
        1,
        100
      ) <= 25
        ? 'runner'
        : 'grunt';
    }

    // Waves 4+:
    // All three types
    const roll =
      Phaser.Math.Between(
        1,
        100
      );

    if (roll <= 20) {
      return 'runner';
    }

    if (roll <= 35) {
      return 'tank';
    }

    return 'grunt';
  }

  private fireSquad() {
    // Player
    this.fireProjectileFrom(
      this.player.x,
      this.player.y - 30
    );

    // Troops
    for (
      const troop of
      this.troopSystem.getTroops()
    ) {
      if (!troop.active) {
        continue;
      }

      this.fireProjectileFrom(
        troop.x,
        troop.y - 30
      );
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

  private spawnEnemy(
    enemyType: EnemyType
  ) {
    const spawnWidth =
      this.scale.width * 0.7;

    const spawnLeft =
      (this.scale.width -
        spawnWidth) / 2;

    const spawnRight =
      spawnLeft + spawnWidth;

    const x =
      Phaser.Math.Between(
        spawnLeft,
        spawnRight
      );

    const enemy = new Enemy(
      this,
      x,
      -30,
      enemyType
    );

    this.enemies.add(enemy);

    const definition =
      ENEMIES[enemyType];

    const waveSpeedBonus =
      this.wave * 2;

    enemy.setVelocityY(
      definition.speed +
      waveSpeedBonus
    );
  }

  private handleBulletEnemyCollision:
    Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
      (bulletObject, enemyObject) => {
        const bullet =
          bulletObject as Projectile;

        const enemy =
          enemyObject as Enemy;

        if (
          !bullet.active ||
          !enemy.active
        ) {
          return;
        }

        bullet.destroy();

        const enemyKilled =
          enemy.takeDamage(
            this.weaponStats.damage
          );

        if (enemyKilled) {
          const definition =
            ENEMIES[enemy.enemyType];

          this.score +=
            definition.scoreValue;

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

    const upgradeId =
      container.upgradeId;

    this.removeContainerLabel(
      container
    );

    container.destroy();

    const card = new UpgradeCard(
      this,
      x,
      y,
      upgradeId
    );

    this.upgradeCards.add(card);

    card.setVelocityY(75);

    this.removeOtherUpgradeChoices();
  }

  private removeContainerLabel(
    container: UpgradeContainer
  ) {
    const label =
      container.getData(
        'choiceLabel'
      ) as
        | Phaser.GameObjects.Text
        | undefined;

    if (label) {
      label.destroy();
    }
  }

  private removeOtherUpgradeChoices() {
    for (
      const child of
      this.upgradeContainers.getChildren()
    ) {
      const container =
        child as UpgradeContainer;

      if (!container.active) {
        continue;
      }

      this.removeContainerLabel(
        container
      );

      container.destroy();
    }
  }

  private handlePlayerCardCollision:
  Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
    (_playerObject, cardObject) => {
      const card =
        cardObject as UpgradeCard;

      // Prevent the same card from being collected twice
      if (!card.active) {
        return;
      }

      // Apply the upgrade
      this.applyUpgrade(
        card.upgradeId
      );

      // Remove the card
      card.destroy();

      this.finishRewardPhase();
    };

  private finishRewardPhase() {
    if (!this.rewardPending || this.isGameOver) return;
    this.rewardPending = false;
    this.time.delayedCall(1000, () => {
      if (!this.isGameOver) this.startNextWave();
    });
  }

  private beginBossWave() {
    this.enemiesAlive = 0;
    this.bossSummonElapsed = 0;
    const boss = new Boss(this);
    this.boss = boss;
    this.bossLabel = this.add.text(300, 65, 'IRON COMMANDER — PHASE 1', {
      fontFamily: 'Arial', fontSize: '18px', color: '#ffcc80',
    }).setDepth(30);
    this.bossBarBackground = this.add.rectangle(300, 100, 460, 16, 0x343444)
      .setOrigin(0, 0.5).setDepth(30);
    this.bossBar = this.add.rectangle(300, 100, 460, 16, 0xffb74d)
      .setOrigin(0, 0.5).setDepth(31);
    // Arcade sprite/group callbacks receive the single sprite first.
    const overlap = this.physics.add.overlap(boss, this.projectiles, (_boss, object) => {
      const bullet = object as Projectile;
      if (this.isGameOver || !bullet.active || !boss.active || boss.health <= 0) return;
      bullet.destroy();
      const wasEnraged = boss.enraged;
      const killed = boss.takeDamage(this.weaponStats.damage);
      this.bossBar!.width = 460 * boss.health / boss.maxHealth;
      if (killed) {
        overlap.destroy();
        boss.destroy();
        this.boss = undefined;
        this.bossLabel?.destroy();
        this.bossBar?.destroy();
        this.bossBarBackground?.destroy();
        this.enemies.clear(true, true);
        this.enemiesAlive = 0;
        this.projectiles.clear(true, true);
        this.score += 2000;
        this.scoreText.setText('Score: ' + this.score);
        this.checkWaveComplete();
      } else if (!wasEnraged && boss.enraged) {
        this.bossLabel!.setText('IRON COMMANDER — PHASE 2');
        this.bossBar!.setFillStyle(0xff5252);
        this.showUpgradeNotification('COMMANDER ENRAGED', 'Faster movement • More reinforcements');
      }
    });
  }

  private updateBoss(delta: number) {
    if (!this.boss?.active) return;
    this.boss.updateMovement(delta);
    this.bossSummonElapsed += delta;
    const interval = this.boss.enraged ? 3500 : 5500;
    if (this.bossSummonElapsed < interval) return;
    this.bossSummonElapsed = 0;
    // Limit reinforcements so long fights cannot flood the battlefield.
    const count = Math.min(this.boss.enraged ? 3 : 2, 8 - this.enemiesAlive);
    for (let i = 0; i < count; i++) {
      this.enemiesAlive++;
      this.spawnEnemy(i === 1 ? 'runner' : 'grunt');
    }
  }

  private applyUpgrade(upgradeId: UpgradeId) {
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

        this.updateWeaponStatsText();

        this.showUpgradeNotification(
          'RAPID FIRE',
          'Fire Rate +20%'
        );

        break;

      case 'heavy-rounds':
        this.weaponStats.damage += 1;

        this.updateWeaponStatsText();

        this.showUpgradeNotification(
          'HEAVY ROUNDS',
          `Bullet Damage: ${this.weaponStats.damage}`
        );

        break;

      case 'add-troop':
        this.troopSystem.addTroop();

        this.updateWeaponStatsText();

        this.showUpgradeNotification(
          '+1 TROOP',
          'Soldier joined your squad!'
        );

        break;
    }
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

  private updateWeaponStatsText() {
    this.weaponStatsText.setText([
      `Damage: ${this.weaponStats.damage}`,
      `Fire Rate: ${Math.round(this.weaponStats.fireRate)}ms`,
      `Troops: ${this.troopSystem.getTroopCount()}`,
    ]);
  }

  private spawnUpgradeChoice() {
    const choices =
      this.getUpgradeChoices(2);

    const positions = [
      this.scale.width * 0.22,
      this.scale.width * 0.78,
    ];

    choices.forEach(
      (upgradeId, index) => {
        const container =
          new UpgradeContainer(
            this,
            positions[index],
            300,
            upgradeId
          );

        this.upgradeContainers.add(
          container
        );

        this.createUpgradeChoiceLabel(
          container
        );
      }
    );
  }

  private getUpgradeChoices(
    count: number
  ): UpgradeId[] {
    const available =
      [...UPGRADE_POOL];

    Phaser.Utils.Array.Shuffle(
      available
    );

    return available.slice(
      0,
      count
    );
  }

  private createUpgradeChoiceLabel(
    container: UpgradeContainer
  ) {
    const upgrade =
      UPGRADES[container.upgradeId];

    const label = this.add.text(
      container.x,
      container.y - 45,
      upgrade.name.toUpperCase(),
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
        align: 'center',
      }
    );

    label
      .setOrigin(0.5)
      .setDepth(10);

    container.setData(
      'choiceLabel',
      label
    );
  }

  private checkWaveComplete() {
    if (
      !this.waveInProgress ||
      this.enemiesAlive > 0 ||
      this.boss?.active ||
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
      1200,
      () => {
        announcement.destroy();

        if (!this.isGameOver) {
          this.startUpgradePhase();
        }
      }
    );
  }

  private startUpgradePhase() {
    this.rewardPending = true;
    const text = this.add.text(
      this.scale.width / 2,
      220,
      'CHOOSE YOUR UPGRADE',
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffeb3b',
      }
    );

    text
      .setOrigin(0.5)
      .setDepth(20);

    this.spawnUpgradeChoice();

    this.time.delayedCall(
      1500,
      () => {
        if (text.active) {
          text.destroy();
        }
      }
    );
  }

  private createTextures() {
    if (
      this.textures.exists('boss') &&
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

    graphics.fillStyle(0x607d8b);
    graphics.fillRect(0, 18, 150, 50);
    graphics.fillStyle(0xb0bec5);
    graphics.fillRect(30, 0, 90, 85);
    graphics.fillStyle(0xffb74d);
    graphics.fillRect(52, 25, 46, 30);
    graphics.fillStyle(0x263238);
    graphics.fillRect(8, 50, 18, 40);
    graphics.fillRect(124, 50, 18, 40);
    graphics.generateTexture('boss', 150, 90);
    graphics.clear();

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
  height: 900,

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