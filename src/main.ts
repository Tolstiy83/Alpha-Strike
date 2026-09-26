import { encounterFormation, stageDifficulty } from './data/difficulty';
import { STAGES, nextStage, laneBounds, laneForX, type StageCarry, type StageBonus } from './data/campaign';
import { combatAudio } from './systems/CombatAudio';
import { combatBurst } from './visuals/combat';
import { WEAPONS, type WeaponId } from './data/weapons';
import { installCharacterArt } from './visuals/characters';
import { createBattlefieldTextures, drawDesertRoad } from './visuals/battlefield';
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
  private stage = 1;
  private selectedBonus?: StageBonus;
  private bonusCards: Phaser.GameObjects.Text[] = [];
  private bonusPrompt?: Phaser.GameObjects.Text;
  private transitioning = false;
  private bossLaneWarning?: Phaser.GameObjects.Rectangle;
  private bossAttackLane?: number;
  private equippedWeapon: WeaponId = 'pistol';
  private hitBoss?: (damage: number) => void;
  private boss?: Boss;
  private bossWarning?: Phaser.GameObjects.Arc;
  private bossCountdown?: Phaser.GameObjects.Arc;
  private bossWarningText?: Phaser.GameObjects.Text;
  private bossLabel?: Phaser.GameObjects.Text;
  private bossBar?: Phaser.GameObjects.Rectangle;
  private bossBarBackground?: Phaser.GameObjects.Rectangle;
  private stageElapsed = 0;
  private encounterIndex = 0;
  private stageFinished = false;
  private bossStarted = false;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private readonly encounters = [2000, 9000, 18000, 27000, 37000, 46000];
  private squadProtectedUntil = 0;
  private squadText!: Phaser.GameObjects.Text;
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

  preload() {
    this.load.image('character-art', '/art/characters-v1.png');
  }

  create(carry: StageCarry = {}) {
    this.stage = Phaser.Math.Clamp(carry.stage ?? 1, 1, STAGES.length);
    this.selectedBonus = undefined;
    this.bonusCards = [];
    this.bonusPrompt = undefined;
    this.transitioning = false;
    const soundButton = this.add.text(760, 145, '', { fontFamily: 'Arial', fontSize: '16px',
      color: '#ffffff', backgroundColor: '#18222c', padding: { x: 10, y: 8 } })
      .setOrigin(1, 0).setDepth(100).setInteractive({ useHandCursor: true });
    const updateSoundLabel = () => soundButton.setText(combatAudio.muted ? 'SOUND OFF [M]' : 'SOUND ON [M]');
    updateSoundLabel();
    const unlockSound = () => { void combatAudio.unlock(); };
    const toggleSound = () => { combatAudio.toggle(); unlockSound(); updateSoundLabel(); };
    soundButton.on('pointerdown', toggleSound);
    this.input.on('pointerdown', unlockSound);
    this.input.keyboard?.on('keydown', unlockSound);
    const onMute = (event: KeyboardEvent) => { if (!event.repeat) toggleSound(); };
    this.input.keyboard?.on('keydown-M', onMute);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', unlockSound);
      this.input.keyboard?.off('keydown', unlockSound);
      this.input.keyboard?.off('keydown-M', onMute);
      this.clearBossWarning();
    });
    this.equippedWeapon = carry.weapon ?? 'pistol';
    this.hitBoss = undefined;
    this.clearBossWarning();
    this.boss = undefined;
    this.bossLabel = undefined;
    this.bossBar = undefined;
    this.bossBarBackground = undefined;
    this.stageElapsed = 0;
    this.encounterIndex = 0;
    this.stageFinished = false;
    this.bossStarted = false;
    this.squadProtectedUntil = 0;
    this.score = carry.score ?? 0;

    this.wave = 0;
    this.enemiesAlive = 0;

    this.playerHealth = carry.health ?? this.maxPlayerHealth;

    this.isGameOver = false;

    this.lastShotTime = 0;

    this.weaponStats = {
      fireRate: 250,
      damage: 1,
    };

    if (carry.stats) this.weaponStats = { ...carry.stats };
    this.createTextures();
    this.createRoad();
    installCharacterArt(this);

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

    for (let i = 0; i < (carry.troops ?? 2); i++) this.troopSystem.addTroop();

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

    this.squadText = this.add.text(20, 205, '', {
      fontFamily: 'Arial', fontSize: '23px', fontStyle: 'bold', color: '#6ee7b7',
      backgroundColor: '#18222c', padding: { x: 8, y: 5 },
    }).setDepth(30);
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
      'Score: ' + this.score,
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
    this.healthBarFill.width = this.healthBarWidth * this.playerHealth / this.maxPlayerHealth;

    this.waveText = this.add.text(
      470,
      20,
      'STAGE ' + this.stage + ' • 0%',
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


    const onSpace = (event: KeyboardEvent) => {
      if (!event.repeat) this.advanceStage();
    };
    const onBonus = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const choice = ({ Digit1: 'heal', Digit2: 'troop', Digit3: 'damage',
        Numpad1: 'heal', Numpad2: 'troop', Numpad3: 'damage' } as const)[event.code];
      if (choice) this.selectBonus(choice);
    };
    this.input.keyboard!.on('keydown-SPACE', onSpace);
    this.input.keyboard!.on('keydown', onBonus);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-SPACE', onSpace);
      this.input.keyboard?.off('keydown', onBonus);
    });
  }

  update(time: number, delta: number) {
    if (this.isGameOver || this.stageFinished) {
      return;
    }

    this.updateRoad(delta);
    this.updateBoss(delta);
    if (this.isGameOver || this.stageFinished) return;
    this.player.update();

    this.troopSystem.update();
    const protectedNow = this.time.now < this.squadProtectedUntil;
    const alpha = protectedNow && Math.floor(this.time.now / 100) % 2 === 0 ? 0.35 : 1;
    this.player.setAlpha(alpha);
    for (const troop of this.troopSystem.getTroops()) troop.setAlpha(alpha);

    // Automatic shooting
    if (
      time - this.lastShotTime >=
      WEAPONS[this.equippedWeapon].interval * this.weaponStats.fireRate / 250
    ) {
      this.fireSquad();
      this.lastShotTime = time;
    }

    // Check enemies that reached the bottom
    for (const child of [...this.enemies.getChildren()]) {
      const enemy = child as Enemy;
      if (this.isGameOver) break;
      enemy.updateMovement(delta);

      if (
        enemy.active &&
        enemy.body?.enable &&
        enemy.y + enemy.displayHeight / 2 >= this.player.y
      ) {
        this.enemyEscaped(enemy);
      }
    }

    // Clean up bullets that leave the screen
    for (const child of this.projectiles.getChildren()) {
      const projectile = child as Projectile;

      if (
        projectile.active &&
        (projectile.y < -30 || projectile.startY - projectile.y >= projectile.range ||
          projectile.x < -30 || projectile.x > this.scale.width + 30)
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
    if (this.isGameOver || this.stageFinished || !enemy.active || !enemy.body?.enable) return;
    const damage = ENEMIES[enemy.enemyType].escapeDamage;
    enemy.destroy();
    this.enemiesAlive--;
    this.damageSquad(damage);
  }

  private damageSquad(damage: number) {
    if (this.isGameOver || this.stageFinished) return;
    // Breaches and boss strikes share the same protection window.
    if (this.time.now < this.squadProtectedUntil) return;
    this.squadProtectedUntil = this.time.now + 800;
    const lostTroop = this.troopSystem.removeTroop();
    if (lostTroop) {
      this.updateWeaponStatsText();
      this.showSquadHit(lostTroop.x, lostTroop.y, '-1 TROOP');
      this.cameras.main.flash(100, 255, 100, 60, false);
    } else {
      this.showSquadHit(this.player.x, this.player.y, '-' + damage + ' HEALTH');
      this.damagePlayer(damage);
    }
  }

  private showSquadHit(x: number, y: number, message: string) {
    const label = this.add.text(x, y - 35, message, {
      fontFamily: 'Arial', fontSize: '22px', fontStyle: 'bold', color: '#ff8a80',
      stroke: '#101820', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(90);
    this.tweens.add({ targets: label, y: y - 95, alpha: 0, duration: 800,
      onComplete: () => label.destroy() });
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
    this.player.setVelocity(0, 0);
    this.player.setAlpha(1);
    for (const troop of this.troopSystem.getTroops()) troop.setAlpha(1);

    this.boss?.setVelocity(0, 0);
    this.clearBossWarning();

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
    drawDesertRoad(this, this.stage >= 2, this.stage === 3);
    for (const [x, title, color] of [[160, 'WEAPONS', '#ffd27a'], [400, 'HORDE', '#ff9380'], [640, '+1 TROOP', '#83dcff']] as const) {
      this.add.text(x, 255, title, {fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color,
        backgroundColor: '#17212c', padding: {x: 12, y: 6}}).setOrigin(0.5).setDepth(30);
    }
    this.add.rectangle(470, 50, 290, 6, 0x414a56).setOrigin(0).setDepth(25);
    this.progressFill = this.add.rectangle(470, 50, 0, 6, 0x6ee7b7).setOrigin(0).setDepth(26);
  }

  private updateRoad(delta: number) {
    for (const child of [...this.upgradeContainers.getChildren()]) {
      const container = child as UpgradeContainer;
      const label = container.getData('choiceLabel') as Phaser.GameObjects.Text;
      if (label?.active) {
        label.setPosition(container.x, container.y - 55);
        label.setText(UPGRADES[container.upgradeId].name.toUpperCase() + '\n' +
          (container.upgradeId === 'add-troop' ? 'BARRICADE ' : 'ARMORED CRATE ') +
          container.health + '/' + container.maxHealth);
      }
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
    this.waveText.setText('STAGE ' + this.stage + ' • ' + Math.floor(progress * 100) + '%');
    this.wave = 1 + Math.floor(progress * 4);
    const supplySchedule: { at: number; id: 'weapon' | 'add-troop' }[] = [
      { at: 6000, id: 'weapon' },
      { at: 17000, id: 'add-troop' },
      { at: 29000, id: 'weapon' },
      { at: 41000, id: 'add-troop' },
    ];
    for (const supply of supplySchedule) {
      if (previous < supply.at && this.stageElapsed >= supply.at) {
        const weapons: UpgradeId[] = ['machine-gun', 'shotgun', 'rocket-launcher'];
        const choices = weapons.filter(id => id !== this.equippedWeapon);
        const reward = supply.id === 'weapon'
          ? Phaser.Utils.Array.GetRandom(choices) : supply.id;
        this.spawnUpgradeObstacle(reward);
      }
    }
    while (this.encounterIndex < this.encounters.length &&
      this.stageElapsed >= this.encounters[this.encounterIndex]) {
      const index = this.encounterIndex++;
      for (const spawn of encounterFormation(this.stage, index)) {
        this.enemiesAlive++;
        this.spawnEnemy(spawn.type, spawn.x, spawn.y);
      }
    }

    if (this.stageElapsed >= 55000 && this.enemiesAlive === 0) {
      this.bossStarted = true;
      this.removeOtherUpgradeChoices();
      this.upgradeCards.clear(true, true);
      this.waveText.setText('STAGE ' + this.stage + ' • BOSS');
      this.beginBossWave();
    }
  }

  private fireSquad() {
    combatAudio.fire(this.equippedWeapon);
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
    const weapon = WEAPONS[this.equippedWeapon];
    for (const angle of weapon.angles) {
      const projectile = new Projectile(this, x, y);
      this.projectiles.add(projectile);
      projectile.damage = weapon.damage + this.weaponStats.damage - 1;
      projectile.splash = weapon.splash;
      projectile.range = weapon.range;
      projectile.setTint(weapon.color).setBlendMode(Phaser.BlendModes.ADD);
      if (weapon.splash) projectile.setDisplaySize(12, 30);
      projectile.setRotation(angle);
      projectile.setVelocity(Math.sin(angle) * weapon.speed, -Math.cos(angle) * weapon.speed);
    }
    const flash = this.add.circle(x, y, weapon.splash ? 12 : 7, weapon.color, 0.9).setDepth(15);
    this.tweens.add({targets: flash, alpha: 0, scale: 0.2, duration: 70,
      onComplete: () => flash.destroy()});
  }

  private impactProjectile(bullet: Projectile, target: Enemy | UpgradeContainer | Boss) {
    if (!bullet.active || !target.active || !target.body?.enable) return;
    const x = bullet.x, y = bullet.y, damage = bullet.damage, radius = bullet.splash;
    bullet.destroy();
    const armored = target instanceof UpgradeContainer || (target instanceof Enemy && target.enemyType === 'tank');
    combatAudio.impact(armored, radius > 0);
    combatBurst(this, x, y, armored ? 0xbfeaff : 0xffcf80, radius > 0);
    const targets: (Enemy | UpgradeContainer | Boss)[] = radius ? [
      ...this.enemies.getChildren() as Enemy[],
      ...this.upgradeContainers.getChildren() as UpgradeContainer[],
      ...(this.boss?.active ? [this.boss] : []),
    ] : [target];
    // Snapshot targets before damage: a boss death clears the battlefield.
    for (const victim of targets) {
      if (!victim.active || !victim.body?.enable) continue;
      if (victim !== target && Math.hypot(victim.x - x, victim.y - y) > radius) continue;
      if (victim instanceof Boss) this.hitBoss?.(damage);
      else if (victim instanceof UpgradeContainer) {
        if (victim.takeDamage(damage)) this.destroyUpgradeContainer(victim);
      } else if (victim.takeDamage(damage)) {
        combatBurst(this, victim.x, victim.y, victim.enemyType === 'tank' ? 0xc3acff : 0xc9dfb0, true);
        this.score += ENEMIES[victim.enemyType].scoreValue;
        this.enemiesAlive--;
        this.scoreText.setText('Score: ' + this.score);
      }
    }
    const impact = this.add.circle(x, y, radius || 10, radius ? 0xff914d : 0xffdc83, 0.65).setDepth(15);
    this.tweens.add({targets: impact, alpha: 0, scale: 1.2, duration: radius ? 280 : 100,
      onComplete: () => impact.destroy()});
  }

  private spawnEnemy(
    enemyType: EnemyType,
    formationX?: number,
    formationY = -30
  ) {
    const spawnWidth =
      140;

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
      formationX ?? x,
      formationY,
      enemyType,
      this.stage
    );

    this.enemies.add(enemy);

    const definition =
      ENEMIES[enemyType];

    const waveSpeedBonus =
      this.wave * 2;

    enemy.setVelocityY(
      definition.speed * stageDifficulty(this.stage).speed +
      waveSpeedBonus
    );
  }

  private handleBulletEnemyCollision: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
    (bullet, enemy) => this.impactProjectile(bullet as Projectile, enemy as Enemy);

  private handleBulletContainerCollision: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
    (bullet, container) => this.impactProjectile(bullet as Projectile, container as UpgradeContainer);

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
    const boss = new Boss(this, STAGES[this.stage - 1].style);
    this.boss = boss;
    if (this.stage === 3) this.showUpgradeNotification('FOUNDRY TYRANT', 'Three-lane sweep • Leave the marked lane');
    this.bossLabel = this.add.text(300, 65, STAGES[this.stage - 1].boss + ' — PHASE 1', {
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
      this.impactProjectile(bullet, boss);
    });
    this.hitBoss = (damage: number) => {
      if (!boss.active || boss.health <= 0 || this.isGameOver) return;
      const wasEnraged = boss.enraged;
      const killed = boss.takeDamage(damage);
      this.bossBar!.width = 460 * boss.health / boss.maxHealth;
      if (killed) {
        this.clearBossWarning();
        combatBurst(this, boss.x, boss.y, 0xffb45e, true);
        combatAudio.strike();
        this.hitBoss = undefined;
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
        this.bossLabel!.setText(STAGES[this.stage - 1].boss + ' — PHASE 2');
        this.bossBar!.setFillStyle(0xff5252);
        this.showUpgradeNotification(STAGES[this.stage - 1].boss + ' ENRAGED', 'Faster movement • Faster attacks');
      }
    };
  }

  private clearBossWarning() {
    this.bossLaneWarning?.destroy();
    this.bossLaneWarning = undefined;
    this.bossAttackLane = undefined;
    this.bossWarning?.destroy();
    this.bossCountdown?.destroy();
    this.bossWarningText?.destroy();
    this.bossWarning = undefined;
    this.bossCountdown = undefined;
    this.bossWarningText = undefined;
  }

  private updateBoss(delta: number) {
    if (!this.boss?.active) return;
    const action = this.boss.updateCombat(delta, this.player.x, this.player.y);
    if (this.boss.style === 'sweep') { this.updateLaneAttack(action); return; }
    if (action === 'warning') {
      this.clearBossWarning();
      const x = this.stage === 2 ? this.player.x : this.boss.x;
      // The full circle stays fixed: it represents the actual strike radius.
      this.bossWarning = this.add.circle(x, this.player.y, 95, 0xff493b, 0.2)
        .setStrokeStyle(4, 0xffd18c).setDepth(1.9);
      this.bossCountdown = this.add.circle(x, this.player.y, 95)
        .setStrokeStyle(4, 0xffffff).setDepth(12);
      this.bossWarningText = this.add.text(x, this.player.y - 115, '', {
        fontFamily: 'Arial', fontSize: '19px', fontStyle: 'bold', color: '#ffffff',
        stroke: '#581b16', strokeThickness: 5, backgroundColor: '#581b16',
        padding: { x: 8, y: 5 },
      }).setOrigin(0.5).setDepth(40);
      combatAudio.warning();
    }
    if (this.bossWarning && action !== 'strike') {
      const progress = this.boss.attackProgress;
      this.bossWarning.setFillStyle(0xff493b, 0.18 + progress * 0.28);
      this.bossCountdown?.setScale(Math.max(0.01, 1 - progress));
      this.bossWarningText?.setText('DODGE! ' + ((1 - progress) * this.boss.windupDuration / 1000).toFixed(1) + 's');
    }
    if (action === 'strike' && this.bossWarning) {
      const strikeX = this.bossWarning.x;
      const hit = Math.abs(this.player.x - strikeX) <= 95 ||
        this.troopSystem.getTroops().some(troop => Math.abs(troop.x - strikeX) <= 95);
      this.clearBossWarning();
      combatAudio.strike();
      combatBurst(this, strikeX, this.player.y, 0xffb45e, true);
      const impact = this.add.circle(strikeX, this.player.y, 95, 0xffb45e, 0.7).setDepth(10);
      this.tweens.add({targets: impact, alpha: 0, scale: 1.3, duration: 250,
        onComplete: () => impact.destroy()});
      this.cameras.main.shake(150, 0.006);
      if (hit) this.damageSquad(30);
    }
  }

  private updateLaneAttack(action: 'warning' | 'strike' | undefined) {
    const boss = this.boss!;
    const names = ['LEFT', 'MIDDLE', 'RIGHT'];
    if (action === 'warning') {
      this.clearBossWarning();
      this.bossAttackLane = boss.attackLane;
      const bounds = laneBounds(boss.attackLane, this.scale.width);
      this.bossLaneWarning = this.add.rectangle(bounds.center, 570, this.scale.width / 3, 660, 0xff593b, 0.18)
        .setStrokeStyle(4, 0xffdf8a).setDepth(1.9);
      this.bossWarningText = this.add.text(bounds.center, 565, '', {
        fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
        backgroundColor: '#682617', align: 'center', padding: { x: 8, y: 8 },
      }).setOrigin(0.5).setDepth(40);
      combatAudio.warning();
    }
    if (this.bossLaneWarning && action !== 'strike') {
      const progress = boss.attackProgress;
      this.bossLaneWarning.setFillStyle(0xff593b, 0.18 + progress * 0.3);
      this.bossWarningText?.setText(names[this.bossAttackLane!] + ' LANE — MOVE!\n' +
        ((1 - progress) * boss.windupDuration / 1000).toFixed(1) + 's');
    }
    if (action === 'strike' && this.bossAttackLane !== undefined) {
      const lane = this.bossAttackLane;
      const bounds = laneBounds(lane, this.scale.width);
      const hit = [this.player, ...this.troopSystem.getTroops()]
        .some(actor => laneForX(actor.x, this.scale.width) === lane);
      this.clearBossWarning();
      const blast = this.add.rectangle(bounds.center, 570, this.scale.width / 3, 660, 0xffb45e, 0.7).setDepth(10);
      this.tweens.add({ targets: blast, alpha: 0, duration: 280, onComplete: () => blast.destroy() });
      combatBurst(this, bounds.center, this.player.y, 0xffdf8a, true);
      combatAudio.strike();
      this.cameras.main.shake(150, 0.006);
      if (hit) this.damageSquad(30);
    }
  }

  private applyUpgrade(upgradeId: UpgradeId) {
    console.log(
      'Applying upgrade:',
      upgradeId
    );

    switch (upgradeId) {
      case 'machine-gun':
      case 'shotgun':
      case 'rocket-launcher':
        this.equippedWeapon = upgradeId;
        this.lastShotTime = this.time.now;
        this.updateWeaponStatsText();
        this.showUpgradeNotification(WEAPONS[upgradeId].name.toUpperCase(), 'Equipped for the whole squad');
        break;
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
          'A soldier joined your squad!'
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
    const troops = this.troopSystem.getTroopCount();
    this.squadText.setText(troops > 0 ? 'SQUAD: YOU + ' + troops : 'SQUAD: SOLO — RECRUIT!');
    this.squadText.setColor(troops > 0 ? '#6ee7b7' : '#ff8a80');
    this.weaponStatsText.setText([
      WEAPONS[this.equippedWeapon].name.toUpperCase(),
      `Damage: ${WEAPONS[this.equippedWeapon].damage + this.weaponStats.damage - 1}`,
      `Fire Rate: ${Math.round(WEAPONS[this.equippedWeapon].interval * this.weaponStats.fireRate / 250)}ms`,

    ]);
  }

  private spawnUpgradeObstacle(upgradeId: UpgradeId) {
    const troopReward = upgradeId === 'add-troop';
    this.showUpgradeNotification(troopReward ? 'TROOP BARRICADE' : 'WEAPON CRATE',
      troopReward ? 'Right lane • Break it to recruit' : 'Left lane • Break it to upgrade');
    const container = new UpgradeContainer(this,
      this.scale.width * (troopReward ? 0.8 : 0.2), -40, upgradeId);
    this.upgradeContainers.add(container);
    container.setVelocityY(90);
    this.createUpgradeChoiceLabel(container);
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
        fontSize: '20px',
        fontStyle: 'bold',
        stroke: '#18202a',
        strokeThickness: 4,
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

  private advanceStage() {
    if (this.transitioning) return;
    if (this.stageFinished && this.stage < STAGES.length) {
      if (!this.selectedBonus) return;
      const carry = nextStage({ stage: this.stage, weapon: this.equippedWeapon,
        troops: this.troopSystem.getTroopCount(), health: this.playerHealth,
        score: this.score, stats: this.weaponStats }, this.selectedBonus);
      if (carry) { this.transitioning = true; this.scene.restart(carry); }
    } else if (this.isGameOver || this.stageFinished) {
      this.transitioning = true;
      this.scene.restart({});
    }
  }

  private selectBonus(bonus: StageBonus) {
    if (!this.stageFinished || this.stage >= STAGES.length || this.transitioning) return;
    this.selectedBonus = bonus;
    const choices: StageBonus[] = ['heal', 'troop', 'damage'];
    this.bonusCards.forEach((card, index) => {
      const selected = choices[index] === bonus;
      card.setBackgroundColor(selected ? '#236957' : '#263544');
      card.setColor(selected ? '#ffffff' : '#cbd5e1');
    });
    const descriptions = { heal: 'HEAL', troop: '+1 TROOP', damage: '+1 DAMAGE' };
    this.bonusPrompt?.setText('Selected: ' + descriptions[bonus] + '\nSPACE: Enter ' + STAGES[this.stage].name);
  }

  private completeStage() {
    this.stageFinished = true;
    this.clearBossWarning();
    this.time.removeAllEvents();
    this.player.setVelocity(0, 0).setAlpha(1);
    for (const troop of this.troopSystem.getTroops()) troop.setVelocity(0, 0).setAlpha(1);
    this.removeOtherUpgradeChoices();
    this.upgradeCards.clear(true, true);
    this.waveText.setText('STAGE ' + this.stage + ' • COMPLETE');
    const finalStage = this.stage === STAGES.length;
    this.add.rectangle(400, 450, 740, 380, 0x101820, 0.98).setDepth(100);
    this.add.text(400, 305, finalStage ? 'CAMPAIGN CLEAR' : 'STAGE CLEAR', {
      fontFamily: 'Arial', fontSize: '40px', color: '#6ee7b7',
    }).setOrigin(0.5).setDepth(101);
    this.add.text(400, 360, 'Score: ' + this.score + (finalStage ? '\nAll three bosses defeated!' : '\nChoose one bonus • Keep your squad and weapon'), {
      fontFamily: 'Arial', fontSize: '21px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setDepth(101);
    if (finalStage) {
      this.add.text(400, 470, 'SPACE: New campaign', { fontFamily: 'Arial', fontSize: '26px', color: '#ffffff' })
        .setOrigin(0.5).setDepth(101);
      return;
    }
    const labels = [
      '[1] HEAL +50\n' + this.playerHealth + ' → ' + Math.min(100, this.playerHealth + 50) + ' HP',
      '[2] +1 TROOP\nOne extra soldier',
      '[3] +1 DAMAGE\nEvery projectile',
    ];
    const choices: StageBonus[] = ['heal', 'troop', 'damage'];
    this.bonusCards = labels.map((label, i) => this.add.text(160 + i * 240, 460, label, {
      fontFamily: 'Arial', fontSize: '21px', color: '#cbd5e1', align: 'center',
      backgroundColor: '#263544', fixedWidth: 220, padding: { x: 8, y: 20 },
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.selectBonus(choices[i])));
    this.bonusPrompt = this.add.text(400, 575, 'Click a bonus or press 1, 2, or 3', {
      fontFamily: 'Arial', fontSize: '22px', color: '#ffe1a3', align: 'center',
    }).setOrigin(0.5).setDepth(101);
  }

  private createTextures() {
    createBattlefieldTextures(this);
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