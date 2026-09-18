import './style.css';
import Phaser from 'phaser';

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.add
      .text(400, 350, 'ALPHA STRIKE', {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(400, 410, 'Phase 1 Prototype', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);
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