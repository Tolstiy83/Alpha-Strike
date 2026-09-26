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
  setDisplaySize() { return this; } setImmovable() { return this; } setTint() { return this; }
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


test('later-stage enemies actually survive damage that kills opening-stage grunts', () => {
  const { Enemy } = load('src/entities/Enemy.ts');
  const scene = bossScene(); scene.time.delayedCall = () => {};
  const opening = new Enemy(scene, 400, 0, 'grunt', 1);
  const city = new Enemy(scene, 400, 0, 'grunt', 2);
  const factory = new Enemy(scene, 400, 0, 'grunt', 3);
  assert.equal(opening.takeDamage(2), true);
  assert.equal(city.takeDamage(2), false);
  assert.equal(factory.takeDamage(2), false);
  assert.equal(city.takeDamage(1), true);
  assert.equal(factory.takeDamage(2), false);
  assert.equal(factory.takeDamage(1), true);
});

test('difficulty ramps across stages while preserving an approachable first encounter', () => {
  const { encounterFormation, stageDifficulty } = load('src/data/difficulty.ts');
  const first = encounterFormation(1, 0);
  assert.equal(first.length, 12); assert.ok(first.every(enemy => enemy.type === 'grunt'));
  const totals = [];
  for (const stage of [1, 2, 3]) {
    let totalHealth = 0;
    for (let encounter = 0; encounter < 6; encounter++) {
      const formation = encounterFormation(stage, encounter);
      assert.ok(formation.length <= 40, 'keep crowd size bounded');
      for (const enemy of formation) {
        assert.ok(enemy.x >= 280 && enemy.x <= 520, 'keep hordes in the middle lane');
        assert.ok(enemy.y < 0, 'enemies enter from offscreen');
        totalHealth += stageDifficulty(stage).health[enemy.type];
      }
    }
    totals.push(totalHealth);
  }
  assert.ok(totals[1] > totals[0]); assert.ok(totals[2] > totals[1]);
  assert.ok(stageDifficulty(3).speed > stageDifficulty(2).speed);
  for (const style of ['melee', 'ranged', 'sweep']) {
    const boss = new Boss(bossScene(), style);
    boss.updateCombat(16, 400, 680);
    assert.ok(boss.velocity.y >= 60, 'boss should approach before a long free-fire window');
  }
});

test('endless entry requires campaign victory and preserves survivors while resetting its score', () => {
  const early = sceneForStage(2); early.scene.stageFinished = true; early.scene.enterEndless();
  assert.equal(early.restarts.length, 0);
  const final = sceneForStage(3); final.scene.enterEndless(); assert.equal(final.restarts.length, 0);
  final.scene.completeStage(); final.scene.enterEndless(); final.scene.enterEndless();
  assert.equal(final.restarts.length, 1);
  assert.deepEqual(final.restarts[0], { stage: 1, endlessRound: 1, weapon: 'rocket-launcher',
    troops: 0, health: 40, score: 0, stats: { damage: 2, fireRate: 250 }, weaponLevels: { pistol: 1 } });
});

test('endless round three loops onward with exactly one bonus and retains survival score', () => {
  const run = sceneForStage(3); run.scene.endlessRound = 3;
  run.scene.completeStage(); assert.equal(run.scene.bonusCards.length, 3);
  run.scene.selectBonus('heal'); run.scene.advanceStage(); run.scene.advanceStage();
  assert.equal(run.restarts.length, 1); const result = run.restarts[0];
  assert.equal(result.stage, 1); assert.equal(result.endlessRound, 4); assert.equal(result.score, 8000);
  assert.equal(result.health, 90); assert.equal(result.stats.damage, 2);
});

test('personal records persist independently and survive corrupt or unavailable storage', () => {
  const { readSurvivalBest, saveSurvivalBest } = load('src/data/survival.ts');
  let data = null;
  const storage = { getItem: () => data, setItem: (_key, value) => { data = value; } };
  assert.deepEqual(plain(readSurvivalBest(storage)), { wave: 0, score: 0 });
  saveSurvivalBest(12, 5000, storage); saveSurvivalBest(3, 6000, storage);
  assert.deepEqual(plain(readSurvivalBest(storage)), { wave: 12, score: 6000 });
  saveSurvivalBest(14, 2000, storage);
  assert.deepEqual(plain(readSurvivalBest(storage)), { wave: 14, score: 6000 });
  data = '{broken'; assert.equal(readSurvivalBest(storage).score, 0);
  data = '{"wave":-1,"score":"9999"}'; assert.deepEqual(plain(readSurvivalBest(storage)), { wave: 0, score: 0 });
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.deepEqual(plain(saveSurvivalBest(7, 700, blocked)), { wave: 7, score: 700 });
});

test('endless scaling increases durability without unbounded crowd size or movement speed', () => {
  const { stageDifficulty, encounterFormation } = load('src/data/difficulty.ts');
  const { nextEndlessRound } = load('src/data/survival.ts');
  assert.equal(nextEndlessRound({ endlessRound: 100, score: 123 }).endlessRound, 101);
  assert.equal(nextEndlessRound({ endlessRound: 100, score: 123 }).score, 123);
  assert.ok(stageDifficulty(1, 10).health.tank > stageDifficulty(3, 1).health.tank);
  assert.ok(stageDifficulty(1, 1000).speed < 2.1);
  assert.ok(encounterFormation(1, 5, 1000).length <= 60);
  const normal = new Boss(bossScene(), 'melee'); const endless = new Boss(bossScene(), 'melee', 5);
  assert.ok(endless.maxHealth > normal.maxHealth); assert.equal(endless.windupDuration, normal.windupDuration);
  for (const boss of [normal, endless]) { boss.x = 400; boss.y = 610; boss.updateCombat(16, 400, 680); boss.updateCombat(boss.windupDuration, 400, 680); }
  assert.ok(endless.recovery < normal.recovery);
});

test('weapon pickups unlock, upgrade only the equipped weapon, and cap at level three', () => {
  const { collectWeapon, weaponDropChoices, weaponRewardLabel } = load('src/data/weapons.ts');
  const initial = { pistol: 1 };
  let levels = collectWeapon(initial, 'pistol', 'machine-gun');
  assert.equal(levels['machine-gun'], 1); assert.equal(initial['machine-gun'], undefined);
  assert.equal(weaponRewardLabel(levels, 'machine-gun', 'machine-gun'), 'UPGRADE TO LV 2');
  levels = collectWeapon(levels, 'machine-gun', 'machine-gun');
  levels = collectWeapon(levels, 'machine-gun', 'shotgun');
  levels = collectWeapon(levels, 'shotgun', 'machine-gun');
  assert.equal(levels['machine-gun'], 2, 'switching back preserves earned level');
  levels = collectWeapon(levels, 'machine-gun', 'machine-gun');
  levels = collectWeapon(levels, 'machine-gun', 'machine-gun');
  assert.equal(levels['machine-gun'], 3);
  assert.ok(!weaponDropChoices(levels, 'machine-gun').includes('machine-gun'));
  assert.ok(weaponDropChoices(levels, 'shotgun').includes('machine-gun'));
  assert.equal(weaponRewardLabel(levels, 'shotgun', 'machine-gun'), 'SWITCH • LV 3');
  assert.equal(weaponRewardLabel(levels, 'shotgun', 'rocket-launcher'), 'NEW WEAPON • LV 1');
});

test('weapon levels improve their signature behavior without changing base definitions or old shots', () => {
  const { WEAPONS, weaponProfile } = load('src/data/weapons.ts');
  for (const id of ['machine-gun', 'shotgun', 'rocket-launcher']) {
    const first = weaponProfile(id, { [id]: 1 }); const third = weaponProfile(id, { [id]: 3 });
    assert.equal(first.damage, third.damage);
    if (id === 'machine-gun') { assert.equal(first.interval, 210); assert.equal(third.interval, 145); }
    if (id === 'shotgun') { assert.equal(third.angles.length, 3); assert.ok(Math.abs(third.angles[0]) < Math.abs(first.angles[0])); }
    if (id === 'rocket-launcher') { assert.equal(first.splash, 95); assert.equal(third.splash, 135); }
    assert.equal(weaponProfile(id, { [id]: 1 }).interval, WEAPONS[id].interval);
  }
});

test('earned levels carry into the next campaign stage and endless rounds, then reset on new campaign', () => {
  for (const [stage, endless] of [[1, 0], [3, 3]]) {
    const run = sceneForStage(stage); run.scene.endlessRound = endless;
    run.scene.weaponLevels = { pistol: 1, 'machine-gun': 3, shotgun: 2 };
    run.scene.completeStage(); run.scene.selectBonus('damage'); run.scene.advanceStage();
    assert.deepEqual(run.restarts[0].weaponLevels, { pistol: 1, 'machine-gun': 3, shotgun: 2 });
    assert.notEqual(run.restarts[0].weaponLevels, run.scene.weaponLevels);
  }
  const final = sceneForStage(3); final.scene.weaponLevels = { pistol: 1, shotgun: 3 };
  final.scene.completeStage(); final.scene.enterEndless(); assert.equal(final.restarts[0].weaponLevels.shotgun, 3);
  const lost = sceneForStage(1); lost.scene.isGameOver = true; lost.scene.weaponLevels = { shotgun: 3 };
  lost.scene.advanceStage(); assert.deepEqual(lost.restarts, [{}]);
  assert.deepEqual(plain(new GameScene().weaponLevels), { pistol: 1 });
});
