const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let GameScene;
class Sprite {
  constructor(scene, x, y) { Object.assign(this, { scene, x, y, active: true, body: { enable: true }, data: {} }); }
  setImmovable() { return this; } setTint() { return this; }
  setVelocity(x, y) { this.velocity = { x, y }; return this; }
  setData(k, v) { this.data[k] = v; return this; }
}
const Phaser = { Scene: class {}, Game: class { constructor(config) { GameScene = config.scene; } },
  Physics: { Arcade: { Sprite } }, Math: { Clamp: (x, a, b) => Math.max(a, Math.min(b, x)) } };
const cache = {};
function load(file) {
  file = path.resolve(root, file);
  if (cache[file]) return cache[file];
  const exports = {}; cache[file] = exports;
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(js, { exports, console, require: id => id === 'phaser' ? Phaser :
    id.endsWith('.css') ? {} : load(path.resolve(path.dirname(file), id + '.ts')) });
  return exports;
}
const { nextStage, laneForX, laneBounds } = load('src/data/campaign.ts');
const { Boss } = load('src/entities/Boss.ts');
load('src/main.ts');
const plain = value => JSON.parse(JSON.stringify(value));

test('each reward changes only its benefit, carries equipment, and never mutates the old run', () => {
  const carry = { stage: 1, weapon: 'shotgun', troops: 0, health: 75, score: 5000, stats: { damage: 2, fireRate: 200 } };
  const original = plain(carry);
  for (const bonus of ['heal', 'troop', 'damage']) {
    const result = nextStage(carry, bonus);
    assert.equal(result.stage, 2); assert.equal(result.weapon, 'shotgun'); assert.equal(result.score, 5000);
    assert.equal(result.health, bonus === 'heal' ? 100 : 75);
    assert.equal(result.troops, bonus === 'troop' ? 1 : 0);
    assert.equal(result.stats.damage, bonus === 'damage' ? 3 : 2); assert.equal(result.stats.fireRate, 200);
    assert.deepEqual(carry, original);
  }
  assert.equal(nextStage({ ...carry, stage: 2 }, 'damage').stage, 3);
  assert.equal(nextStage({ ...carry, stage: 3 }, 'damage'), undefined);
  assert.equal(nextStage(nextStage(carry, 'damage'), 'damage').stats.damage, 4);
});

test('lane warnings cover screen edges without gaps or double-owned boundaries', () => {
  assert.equal(laneForX(0, 800), 0); assert.equal(laneForX(800, 800), 2);
  for (const width of [800, 1000]) for (let lane = 0; lane < 3; lane++) {
    const bounds = laneBounds(lane, width);
    assert.equal(laneForX(bounds.left, width), lane);
    assert.equal(laneForX(bounds.center, width), lane);
    assert.equal(laneForX(bounds.right - 0.001, width), lane);
  }
});

function bossScene() { return { scale: { width: 800 }, add: { existing() {} }, physics: { add: { existing() {} } }, time: { now: 1000 } }; }
test('all bosses warn before striking, respect recovery, and stop attacking on death', () => {
  for (const style of ['melee', 'ranged', 'sweep']) for (const enraged of [false, true]) {
    const boss = new Boss(bossScene(), style); boss.x = 400; boss.y = style === 'melee' ? 610 : 400;
    if (enraged) boss.health = boss.maxHealth / 2;
    assert.equal(boss.updateCombat(16, 400, 680), 'warning');
    assert.equal(boss.updateCombat(boss.windupDuration / 2, 100, 680), undefined);
    assert.equal(boss.attackProgress, 0.5);
    assert.equal(boss.updateCombat(boss.windupDuration / 2, 100, 680), 'strike');
    assert.equal(boss.updateCombat(1, 400, 680), undefined);
    assert.equal(boss.takeDamage(1000), true); assert.equal(boss.body.enable, false);
    assert.equal(boss.updateCombat(3000, 400, 680), undefined);
  }
});
test('industrial boss locks each warning, sweeps all lanes, then reacquires the squad', () => {
  const boss = new Boss(bossScene(), 'sweep'); boss.x = 400; boss.y = 400;
  const lanes = [];
  for (let strike = 0; strike < 6; strike++) {
    const target = strike < 3 ? 790 : 10;
    assert.equal(boss.updateCombat(16, target, 680), 'warning');
    lanes.push(boss.attackLane);
    boss.updateCombat(boss.windupDuration / 2, 400, 680);
    assert.equal(boss.attackLane, lanes.at(-1), 'warning cannot follow the player');
    assert.equal(boss.updateCombat(boss.windupDuration / 2, 400, 680), 'strike');
    boss.updateCombat(2000, target, 680);
  }
  assert.deepEqual(lanes, [2, 0, 1, 0, 1, 2]);
});

function ui(x = 0, y = 0) {
  const object = { x, y, active: true, text: '', destroyed: false };
  for (const method of ['setRotation', 'setFillStyle', 'setStrokeStyle', 'setScale', 'setDepth', 'setOrigin', 'setInteractive', 'setBackgroundColor', 'setColor', 'setVelocity', 'setAlpha', 'on']) object[method] = () => object;
  object.setText = text => { object.text = text; return object; };
  object.destroy = () => { object.destroyed = true; };
  return object;
}
function sceneForStage(stage) {
  const scene = new GameScene(); const restarts = [];
  Object.assign(scene, { stage, playerHealth: 40, score: 8000, equippedWeapon: 'rocket-launcher',
    weaponStats: { damage: 2, fireRate: 250 }, player: ui(), waveText: ui(),
    troopSystem: { getTroops: () => [], getTroopCount: () => 0 },
    time: { removeAllEvents() {} }, upgradeContainers: { getChildren: () => [] }, upgradeCards: { clear() {} },
    add: { rectangle: ui, text: ui }, scene: { restart: carry => restarts.push(plain(carry)) } });
  return { scene, restarts };
}
test('bonus selection is required, can change before continuing, and cannot award twice', () => {
  const { scene, restarts } = sceneForStage(1);
  scene.selectBonus('damage'); assert.equal(scene.selectedBonus, undefined);
  scene.completeStage(); assert.equal(scene.bonusCards.length, 3);
  scene.advanceStage(); assert.equal(restarts.length, 0);
  scene.selectBonus('heal'); scene.selectBonus('damage'); scene.advanceStage(); scene.advanceStage();
  assert.equal(restarts.length, 1); assert.equal(restarts[0].stage, 2);
  assert.equal(restarts[0].health, 40); assert.equal(restarts[0].stats.damage, 3);
  assert.equal(restarts[0].weapon, 'rocket-launcher'); assert.equal(restarts[0].troops, 0);
});
test('stage two offers rewards; final victory and defeat start a fresh campaign', () => {
  const second = sceneForStage(2); second.scene.completeStage(); second.scene.selectBonus('troop'); second.scene.advanceStage();
  assert.equal(second.restarts[0].stage, 3); assert.equal(second.restarts[0].troops, 1);
  const final = sceneForStage(3); final.scene.completeStage(); assert.equal(final.scene.bonusCards.length, 0);
  final.scene.selectBonus('damage'); final.scene.advanceStage(); assert.deepEqual(final.restarts, [{}]);
  const lost = sceneForStage(2); lost.scene.isGameOver = true; lost.scene.advanceStage(); assert.deepEqual(lost.restarts, [{}]);
});


test('lane strikes hit either squad member only in the marked lane and clear their warnings', () => {
  for (const [playerX, troopX, expectedHits] of [[100, 150, 0], [400, 150, 1], [100, 400, 1], [799, 750, 0]]) {
    const { scene } = sceneForStage(3); let hits = 0;
    Object.assign(scene, {
      scale: { width: 800 }, player: { x: playerX, y: 680 },
      troopSystem: { getTroops: () => [{ x: troopX, y: 730 }] },
      boss: { attackLane: 1, attackProgress: 0, windupDuration: 1400 },
      tweens: { add() {} }, cameras: { main: { shake() {} } }, damageSquad: () => hits++,
    });
    scene.updateLaneAttack('warning');
    const warning = scene.bossLaneWarning;
    assert.equal(warning.x, 400);
    scene.boss.attackLane = 2;
    scene.updateLaneAttack('strike');
    assert.equal(hits, expectedHits);
    assert.equal(warning.destroyed, true);
    assert.equal(scene.bossLaneWarning, undefined);
    assert.equal(scene.bossAttackLane, undefined);
    assert.equal(scene.bossWarningText, undefined);
    scene.updateLaneAttack('strike'); assert.equal(hits, expectedHits, 'no repeated strike after warning is cleared');
  }
});
