import Phaser from 'phaser';

/** Short-lived debris, capped per burst; does not change collision or damage. */
export function combatBurst(scene: Phaser.Scene, x: number, y: number, color: number, large = false) {
  for (let i = 0; i < (large ? 10 : 5); i++) {
    const angle = Math.PI * 2 * i / (large ? 10 : 5) + Math.random() * 0.4;
    const distance = (large ? 45 : 17) + Math.random() * 20;
    const spark = scene.add.rectangle(x, y, large ? 5 : 3, large ? 10 : 6, color)
      .setRotation(angle).setDepth(14);
    scene.tweens.add({ targets: spark, x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance, alpha: 0, scale: 0.25,
      duration: large ? 360 : 180, onComplete: () => spark.destroy() });
  }
}
