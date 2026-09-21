# Alpha Strike

Alpha Strike is a small top-down survival shooter built with Phaser and TypeScript. You control a player ship at the bottom of the screen, defend against incoming enemies, and collect upgrade cards dropped by defeated upgrade containers to improve your firepower and squad.

The game is a wave-based defense loop: survive each wave, eliminate enemies, earn score, and keep your health above zero. Every time a wave clears, the next wave gets harder and spawns more enemies.

---

## Features

- Wave-based survival gameplay
- Player movement with keyboard controls
- Auto-firing squad attack from the player and supporting troops
- Score tracking and persistent health bar
- Upgrade containers that drop random upgrades
- Upgrade cards that give permanent or semi-permanent boosts
- Phaser-based visuals and arcade physics
- Vite + TypeScript development setup

---

## How to Play

### Objective

- Survive as long as possible
- Eliminate incoming enemies before they reach the bottom of the screen
- Collect upgrade cards to improve your weapon and squad
- Keep your health above 0 to avoid losing the run

### Controls

- Move left: Left Arrow or A
- Move right: Right Arrow or D
- Restart after game over: Space

### Gameplay Loop

1. The player starts with a basic weapon.
2. Enemies spawn at random x positions and descend toward the player.
3. Bullets fire automatically from the player and from any allied troops.
4. If an enemy reaches the bottom of the screen, it damages the player.
5. Destroying enemies increases the score.
6. When all enemies in a wave are defeated, the next wave begins.
7. Defeating upgrade containers drops cards that can be picked up.
8. Picking up cards applies upgrades such as faster firing or extra troops.

---

## Upgrade System

The game currently includes two upgrade types:

### Rapid Fire

- Upgrade ID: `rapid-fire`
- Effect: reduces the weapon fire rate by 20% each time it is applied, with a floor cap
- Description: "Fire Rate +20%"

### Add Troop

- Upgrade ID: `add-troop`
- Effect: adds one troop to the player's squad formation
- Description: "Soldier joined your squad!"

The random upgrade pool is defined in the data file, and cards are generated from that pool when a container is destroyed.

---

## Project Structure

```text
Alpha-Strike/
├── index.html
├── package.json
├── tsconfig.json
├── public/
├── src/
│   ├── main.ts
│   ├── style.css
│   ├── counter.ts
│   ├── data/
│   │   └── upgrades.ts
│   ├── entities/
│   │   ├── Enemy.ts
│   │   ├── Player.ts
│   │   ├── Projectile.ts
│   │   ├── Troop.ts
│   │   ├── UpgradeCard.ts
│   │   └── UpgradeContainer.ts
│   └── systems/
│       └── TroopSystems.ts
└── README.md
```

### Main Files

- `src/main.ts`: Core game scene, wave logic, enemy spawning, collisions, UI, and upgrade application
- `src/data/upgrades.ts`: Upgrade definitions and upgrade pool data
- `src/entities/Player.ts`: Player movement and input handling
- `src/entities/Enemy.ts`: Enemy health and death behavior
- `src/entities/Troop.ts`: Allied troop sprite representation
- `src/systems/TroopSystems.ts`: Formation and troop positioning logic
- `src/entities/UpgradeCard.ts`: Upgrade card sprite and label
- `src/entities/UpgradeContainer.ts`: Breakable upgrade container object

---

## How the Game Works

### Player and Movement

The player is a Phaser physics sprite constrained to the world bounds. It responds to left/right movement and moves horizontally at a fixed speed.

### Troops

The troop system creates a formation behind the player. Troops are arranged in rows and columns and follow the player's position. This gives the squad a layered formation that moves with the player while staying within screen bounds.

### Shooting

The game fires automatically on a timer using the current weapon fire rate. The player fires a projectile from their position, and each troop also fires from its own position.

### Enemies

Enemies are created at random x values above the screen and travel downward toward the bottom. Each enemy has a health value of 1 and can be killed in a single hit. Once they pass the bottom of the screen, they deal damage to the player and are removed.

### Upgrade Containers

Upgrade containers appear during each wave and sit near the center-top area of the screen. They can be destroyed by firing at them. Once destroyed, they spawn a random upgrade card that falls downward.

### Upgrade Cards

When the player touches a card, the matching upgrade is applied immediately. These cards are used to improve the player's build over the course of the run.

---

## Wave System

The game runs in waves with increasing difficulty.

- Initial wave count begins at 0
- Each wave increases the displayed wave number
- Enemies to spawn scale based on the wave number
- Enemy speed also increases as the wave increases
- The wave is considered complete when no enemies remain alive and the wave is active
- After a short delay, the next wave starts

The game also displays an announcement for each wave and a completion message after success.

---

## Game State and UI

The game HUD includes:

- Title text: "ALPHA STRIKE"
- Score display
- Health display
- Health bar
- Current wave value
- Short on-screen instructions

The game over screen shows the final score and prompts the player to press Space to restart.

---

## Development Setup

### Prerequisites

- Node.js
- npm

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

This launches the Vite dev server for local development.

### Build the project

```bash
npm run build
```

This runs TypeScript compilation and then creates a production build using Vite.

### Preview the production build

```bash
npm run preview
```

---

## Scripts

The project defines these scripts from `package.json`:

- `npm run dev` — starts the local Vite dev server
- `npm run build` — runs TypeScript compilation and production bundle generation
- `npm run preview` — serves the built app locally

---

## Notes on the Current Implementation

This project is intentionally lightweight and uses generated textures for all major game objects instead of external art assets. The graphics are created procedurally in code, including:

- player triangle
- bullet rectangle
- enemy square
- upgrade container box
- upgrade card rectangle
- troop triangle

Physics debug is also enabled in the Phaser config, which makes collision bodies visible while developing.

---

## Tech Stack

- TypeScript
- Vite
- Phaser 4
- Arcade physics

---

## Future Ideas

Possible enhancements for this project could include:

- more enemy types
- weapon variation and projectile patterns
- boss waves
- sound effects and music
- better UI polish
- progression and save system
- additional upgrade choices and rarity tiers
- more polished sprite art and animations

---

## License

This project does not currently include a formal license file. If you plan to distribute or publish it, add a license before doing so.

---

## Summary

Alpha Strike is a compact arcade survival game with a simple combat loop, progressive difficulty, and an upgrade-driven progression system. It is a strong example of a lightweight Phaser game built in TypeScript and is easy to extend with more content and polish.
