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
  private stageElapsed = 0;
  private encounterIndex = 0;
  private stageFinished = false;
  private bossStarted = false;
  private roadMarks: Phaser.GameObjects.Rectangle[] = [];
  private progressFill!: Phaser.GameObjects.Rectangle;
  private readonly encounters = [2000, 9000, 18000, 27000, 37000, 46000];
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
  private enemiesAlive = 0;
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
    this.stageElapsed = 0;
    this.encounterIndex = 0;
    this.stageFinished = false;
    this.bossStarted = false;
    this.roadMarks = [];
    this.score = 0;

    this.wave = 0;
    this.enemiesAlive = 0;

    this.playerHealth = this.maxPlayerHealth;

    this.isGameOver = false;

    this.lastShotTime = 0;

    this.weaponStats = {
      fireRate: 250,
      damage: 1,
    };

    this.createTextures();
    this.createRoad();

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

    this.troopSystem.addTroop();
    this.troopSystem.addTroop();

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
      470,
      20,
      'ROAD 1 • 0%',
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


    this.input.keyboard!.on(
      'keydown-SPACE',
      () => {
        if (this.isGameOver || this.stageFinished) {
          this.scene.restart();
        }
      }
    );
  }

  update(time: number, delta: number) {
    if (this.isGameOver || this.stageFinished) {
      return;
    }

    this.updateRoad(delta);
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
      if (this.isGameOver) break;
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

  private createRoad() {
    this.add.rectangle(400, 450, 800, 900, 0x182822).setDepth(-20);
    this.add.rectangle(400, 450, 700, 900, 0x292e38).setDepth(-19);
    for (const x of [65, 735]) {
      this.add.rectangle(x, 450, 5, 900, 0xc9b887).setDepth(-18);
    }
    for (let y = -120; y < 1020; y += 120) {
      for (const x of [285, 515]) {
        this.roadMarks.push(this.add.rectangle(x, y, 5, 55, 0x66707b).setDepth(-17));
      }
    }
    this.add.rectangle(470, 50, 290, 6, 0x414a56).setOrigin(0).setDepth(25);
    this.progressFill = this.add.rectangle(470, 50, 0, 6, 0x6ee7b7).setOrigin(0).setDepth(26);
  }

  private updateRoad(delta: number) {
    for (const mark of this.roadMarks) {
      mark.y += delta * 0.1;
      if (mark.y > 1020) mark.y -= 1200;
    }
    for (const child of [...this.upgradeContainers.getChildren()]) {
      const container = child as UpgradeContainer;
      const label = container.getData('choiceLabel') as Phaser.GameObjects.Text;
      if (label?.active) label.setPosition(container.x, container.y - 45);
      if (container.y > this.scale.height + 50) {
        this.removeContainerLabel(container);
        container.destroy();
      }
    }
    if (this.bossStarted) return;
    const previous = this.stageElapsed;
    this.stageElapsed = Math.min(55000, this.stageElapsed + delta);
    const progress = this.stageElapsed / 55000;
    this.progressFill.width = 290 * progress;
    this.waveText.setText('ROAD 1 • ' + Math.floor(progress * 100) + '%');
    this.wave = 1 + Math.floor(progress * 4);
    if (previous < 13000 && this.stageElapsed >= 13000) this.spawnUpgradeChoice();
    if (previous < 32000 && this.stageElapsed >= 32000) this.spawnUpgradeChoice();
    while (this.encounterIndex < this.encounters.length &&
      this.stageElapsed >= this.encounters[this.encounterIndex]) {
      const index = this.encounterIndex++;
      for (let i = 0; i < 4 + index; i++) {
        this.enemiesAlive++;
        this.spawnEnemy(index >= 3 && i === 0 ? 'tank' :
          index >= 1 && i % 3 === 0 ? 'runner' : 'grunt');
      }
    }
    if (this.stageElapsed >= 55000 && this.enemiesAlive === 0) {
      this.bossStarted = true;
      this.removeOtherUpgradeChoices();
      this.upgradeCards.clear(true, true);
      this.waveText.setText('ROAD 1 • BOSS');
      this.beginBossWave();
    }
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


    };

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
        this.completeStage();
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
        this.troopSystem.addTroop();

        this.updateWeaponStatsText();

        this.showUpgradeNotification(
          '+2 TROOPS',
          'Reinforcements joined your squad!'
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
    const choices: UpgradeId[] = ['add-troop', 'heavy-rounds'];
    this.showUpgradeNotification('CHOOSE YOUR ROUTE', 'Shoot a crate, then collect its upgrade');

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
            -40,
            upgradeId
          );

        this.upgradeContainers.add(
          container
        );

        container.setVelocityY(90);
        this.createUpgradeChoiceLabel(
          container
        );
      }
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

  private completeStage() {
    this.stageFinished = true;
    this.time.removeAllEvents();
    this.player.setVelocity(0, 0);
    this.removeOtherUpgradeChoices();
    this.upgradeCards.clear(true, true);
    this.waveText.setText('ROAD 1 • COMPLETE');
    this.add.rectangle(400, 450, 620, 240, 0x101820, 0.95).setDepth(100);
    this.add.text(400, 395, 'STAGE CLEAR', {
      fontFamily: 'Arial', fontSize: '44px', color: '#6ee7b7',
    }).setOrigin(0.5).setDepth(101);
    this.add.text(400, 465, 'Score: ' + this.score + '\nPress SPACE to play again', {
      fontFamily: 'Arial', fontSize: '23px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setDepth(101);
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
      debug: false,
    },
  },

  scene: GameScene,
};

new Phaser.Game(config);