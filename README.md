# Alpha Strike

A browser-based squad shooter built with **Phaser 4, TypeScript, and Vite**. Hold your position, steer your squad left and right, and fire automatically into approaching hordes. Choose when to fight, unlock a better weapon, or recruit another soldier.

## Gameplay

The stationary battlefield has three lanes:

| Lane | Targets | Reward |
| --- | --- | --- |
| Left | Armored weapon crates | Machine gun, shotgun, or rocket launcher |
| Middle | Dense enemy formations and bosses | Score and stage completion |
| Right | Troop barricades | +1 soldier |

Shoot an obstacle until it breaks, then collect the released card. Weapon crates have 24 health and troop barricades have 10; your weapon's damage affects how quickly they break. Rewards are independent: destroying one obstacle does not remove another. Missed obstacles and cards leave the screen.

Weapon crates arrive at 6 and 29 seconds; troop barricades arrive at 17 and 41 seconds. Crates advertise their reward and remaining health. Weapon rewards are randomly selected from the three unlockable weapons, excluding the currently equipped weapon.

## Controls

| Action | Control |
| --- | --- |
| Move left / right | Arrow keys or A / D |
| Shoot | Automatic |
| Toggle sound | M or the sound button |
| Choose a stage-clear bonus | Click a card or press 1 / 2 / 3 |
| Continue after Stage 1 or 2 | Select a bonus, then Space |
| Restart after defeat or campaign completion | Space |

## Squad and survival

- Start a new campaign with a pistol, two supporting troops, and 100 health.
- Every soldier fires the equipped weapon; weapon pickups equip the whole squad.
- Troops follow in a compact formation and reform after a casualty.
- An enemy crossing the player's row counts as a breach, even if it is in another lane.
- A breach removes one troop first. With no troops remaining, the player takes damage.
- Breaches and boss attacks share an 800 ms protection window, shown by blinking characters.
- Troop pickups rebuild the squad. Health reaching zero ends the run.

## Weapons

Base values before any stat modifiers:

| Weapon | Damage per projectile | Firing interval | Behavior |
| --- | --- | --- | --- |
| Pistol | 1 | 450 ms | Starting weapon; single focused shot |
| Machine gun | 1 | 250 ms | Fast, focused fire |
| Shotgun | 2 | 650 ms | Three spread pellets; 430-pixel range |
| Rocket launcher | 8 | 1,100 ms | Slower projectile; 95-pixel splash radius |

Rockets can damage multiple nearby enemies, obstacles, and the boss. Each projectile retains the damage and behavior it had when fired, even after a weapon switch.

Rapid Fire and Heavy Rounds remain supported in the upgrade definitions, but the current stage schedule offers weapon unlocks and troop cards.

## Enemies

| Type | Health | Base speed | Score | Solo-player breach damage |
| --- | --- | --- | --- | --- |
| Grunt | 2 | 60 | 100 | 20 |
| Runner | 1 | 105 | 125 | 10 |
| Tank | 6 | 35 | 250 | 35 |

Speed is measured in game pixels per second, with a small stage-progress bonus. Runners are smaller and weave side to side; Grunts and Tanks advance straight ahead. Dense formations use compact rows rather than widely scattered spawns.

### Difficulty progression

The enemy table above lists Stage 1 values. Durability and movement scale with the campaign to keep pace with squad upgrades:

| Stage | Grunt / Runner / Tank HP | Base speed multiplier | Enemies per encounter |
| --- | --- | --- | --- |
| 1 | 2 / 1 / 6 | 1.0× | 12–32 |
| 2 | 3 / 2 / 10 | 1.15× | 18–38 |
| 3 | 5 / 3 / 16 | 1.3× | 22–37 |

Later hordes span seven columns in the middle lane. Bosses approach at 60 / 70 / 80 pixels per second by stage (40% faster when enraged) and recover sooner between attacks. Dodge countdowns, weapon damage, supply timing, and the 800 ms protection window are unchanged.

## Three-stage campaign

Each stage schedules six encounters over a 55-second buildup. Reaching 100% progress does not immediately end the stage: remaining enemies must be cleared before the boss appears.

### Stage 1: Desert road

Six hordes grow from 12 to 32 enemies. The first encounter stays all-Grunt; later formations spread wider and include more Runners and Tanks. Defeat the **Iron Commander**, a 420-health melee boss that advances toward the squad and follows sideways. Its marked strike area gives time to dodge. A hit removes one troop, or deals 30 health damage when the player is alone.

### Stage 2: Ruined city

After each of the first two victories, choose one bonus: **+50 health** (capped at 100), **+1 troop**, or **+1 damage per projectile** for the squad. Click a card or press 1, 2, or 3, then press Space to continue. You can change your selection before continuing. Troops, weapon, damage boosts, and score carry over; there is no automatic healing. Damage bonuses last for the run and also apply after switching weapons.

The city has larger mixed groups of Grunts, Runners, and Tanks. Its **Siege Brute** has 650 health and stops at range to target the squad's position with delayed ground strikes. Move out of the marked area before impact.

### Stage 3: Industrial zone

An abandoned factory road with pipes, rusted machinery, and hazard stripes. Six encounters alternate slower Tank formations with tightly packed Runner bursts.

The **Foundry Tyrant** has 900 health and attacks whole lanes. Each three-strike sweep starts in the squad's current lane, then visits the other two lanes in order. The marked area stays fixed during its countdown. A new sweep targets the squad again. Leave the highlighted lane with your entire squad before impact. Windups last 1.4 seconds, dropping to 1.1 seconds below half health.

All three bosses become faster below half health, award 2,000 points on defeat, and **do not summon reinforcements**. Defeating the third boss completes the campaign. Restarting begins a fresh campaign with the pistol, two troops, and no stage-clear bonuses.

## Combat feedback and sound

- Grunts use a green tint; smaller amber Runners move with a faster gait; broad purple Tanks use the brute silhouette.
- Hits flash and recoil the artwork. Defeated enemies briefly fall and fade; armored targets shed bright sparks.
- Boss attack zones stay fixed while a countdown shows time to dodge. The first two bosses use shrinking rings; the industrial boss highlights entire lanes. Warning and impact sounds accompany attacks.
- Synthesized pistol, machine-gun, shotgun, and rocket sounds play once per squad volley. Click or press a key to enable browser audio; use **M** or the sound button to mute. Mute carries across stage transitions and restarts.

## Visuals

- Angled three-lane road with desert, ruined-city, and industrial scenery.
- AI-generated survivor, zombie, and brute artwork, stored locally in `public/art/`.
- Larger visual sprites layered over the existing Arcade Physics bodies.
- Ground shadows, subtle sprite sway, muzzle flashes, glowing projectiles, impacts, and rocket explosions.
- Weapon, health, squad, obstacle durability, stage progress, and boss health displays.
- Canvas sizing that fits the available browser viewport.

Character movement currently uses procedural sway rather than full frame-based walking animations. The game remains a 2D prototype with a perspective-style presentation.

## Run locally

Use a current Node.js release compatible with Vite 8 and npm. Development has been run with Node.js 24.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite.

```bash
npm run build
npm run preview
```

`build` runs TypeScript checking followed by Vite's production build. `preview` serves the production output locally. The Phaser bundle may produce Vite's large-chunk warning; bundle splitting is not yet configured.

## Project structure

```text
public/art/                 Generated character atlas and art notes
src/
  main.ts                   Game scene, encounters, combat, HUD, stage transitions
  data/
    campaign.ts             Stage definitions, reward carryover, and lane bounds
    enemies.ts              Grunt, Runner, and Tank definitions
    upgrades.ts             Upgrade names, cards, and definitions
    weapons.ts              Weapon damage, cadence, range, and firing patterns
  entities/
    Boss.ts                 Boss movement, attack timing, phases, and health
    Enemy.ts                Enemy movement and damage
    Player.ts               Keyboard input and movement
    Projectile.ts           Per-shot damage, range, and splash data
    Troop.ts                Supporting soldier
    UpgradeCard.ts          Collectible reward and label
    UpgradeContainer.ts     Destructible reward obstacle
  systems/
    TroopSystems.ts          Formation, recruitment, and casualties
  visuals/
    battlefield.ts          Procedural scenery and fallback textures
    characters.ts           Character-art overlays and movement effects
  style.css                 Page and canvas layout
```

## Current scope

This is a playable three-stage prototype. Progress lasts for the current run; there is no persistent save system, base building, multiplayer, or touch controls yet. Weapon balance, horde density, and boss difficulty are still being tuned through playtesting. `npm test` runs campaign regression checks for reward selection, carryover, restart behavior, boss timing, and lane sweeps. The suite isolates game logic with Phaser stubs; browser playtesting checks the rendered experience.

## License

No formal license is currently included in this repository.
