import Phaser from 'phaser';

const budgets = new WeakMap<Phaser.Scene, { active: number }>();
export function effectBudget(scene: Phaser.Scene) {
  let budget = budgets.get(scene);
  if (!budget) { budget = { active: 0 }; budgets.set(scene, budget); }
  return budget;
}

/** Short-lived debris, capped per burst; does not change collision or damage. */
export function combatBurst(scene: Phaser.Scene, x: number, y: number, color: number, large = false) {
  const budget = effectBudget(scene);
  const count = Math.min(large ? 10 : 5, Math.max(0, 80 - budget.active));
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * 2 * i / (large ? 10 : 5) + Math.random() * 0.4;
    const distance = (large ? 45 : 17) + Math.random() * 20;
    const spark = scene.add.rectangle(x, y, large ? 5 : 3, large ? 10 : 6, color)
      .setRotation(angle).setDepth(14);
    budget.active++;
    spark.once('destroy', () => budget.active--);
    scene.tweens.add({ targets: spark, x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance, alpha: 0, scale: 0.25,
      duration: large ? 360 : 180, onComplete: () => spark.destroy() });
  }
}
