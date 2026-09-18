import './style.css';
import Phaser from 'phaser';
import { Player } from './entities/Player';

class GameScene extends Phaser.Scene {
  private player!: Player;

  constructor() {
    super('GameScene');
  }

  create() {
    // Create a temporary player texture.
    // We'll replace this with actual artwork much later.
    const graphics = this.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(0x4fc3f7);

    graphics.fillTriangle(
      20, 0,
      0, 40,
      40, 40
    );

    graphics.generateTexture(
      'player',
      40,
      40
    );

    graphics.destroy();

    // Create player near bottom-center of screen
    this.player = new Player(
      this,
      400,
      620
    );

    // Game title
    this.add.text(20, 20, 'ALPHA STRIKE', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
    });

    // Controls
    this.add.text(20, 55, 'Move: ← → or A / D', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaaaaa',
    });
  }

  update() {
    this.player.update();
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
      debug: false,
    },
  },

  scene: GameScene,
};

new Phaser.Game(config);