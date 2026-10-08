import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  private moveSpeed = 400;

  setTouchTarget(x?: number) {
    // Scene shutdown can remove the physics body before touch controls clean up.
    if (!this.body) return;
    this.setVelocityX(0);
    // Touch is direct positioning: do not make the player chase a fast swipe.
    if (x !== undefined) this.body.reset(Phaser.Math.Clamp(x, 24, this.scene.scale.width - 24), this.y);
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');

    // Add player to the scene
    scene.add.existing(this);

    // Enable Arcade Physics
    scene.physics.add.existing(this);

    // Prevent player from leaving the screen
    this.setCollideWorldBounds(true);

    // Arrow keys
    this.cursors = scene.input.keyboard!.createCursorKeys();

    // A / D controls
    this.wasd = scene.input.keyboard!.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as {
      left: Phaser.Input.Keyboard.Key;
      right: Phaser.Input.Keyboard.Key;
    };
  }

  update() {
    // Stop horizontal movement unless a key is pressed
    this.setVelocityX(0);

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      this.setVelocityX(-this.moveSpeed);
    }

    if (this.cursors.right.isDown || this.wasd.right.isDown) {
      this.setVelocityX(this.moveSpeed);
    }
  }
}