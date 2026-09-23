import Phaser from 'phaser';

import { Player } from '../entities/Player';
import { Troop } from '../entities/Troop';

export class TroopSystem {
  private scene: Phaser.Scene;
  private player: Player;

  private troops: Phaser.Physics.Arcade.Group;

  private troopSpacingX = 30;
  private troopSpacingY = 36;

  private troopsPerRow = 3;

  constructor(
    scene: Phaser.Scene,
    player: Player
  ) {
    this.scene = scene;
    this.player = player;

    this.troops =
      this.scene.physics.add.group();
  }

  addTroop() {
    const troop = new Troop(
      this.scene,
      this.player.x,
      this.player.y
    );

    this.troops.add(troop);

    this.updateFormation();
  }

  removeTroop(): { x: number; y: number } | undefined {
    const troop = this.getTroops().at(-1);
    if (!troop) return undefined;
    const position = { x: troop.x, y: troop.y };
    this.troops.remove(troop, true, true);
    this.updateFormation();
    return position;
  }

  update() {
    this.constrainPlayerToFormation();
    this.updateFormation();
  }

  getTroops(): Troop[] {
    return this.troops.getChildren() as Troop[];
  }

  getTroopCount(): number {
    return this.troops.getLength();
  }

  private updateFormation() {
    const troops = this.getTroops();

    troops.forEach(
      (troop, index) => {
        const row =
          Math.floor(
            index / this.troopsPerRow
          );

        const indexInRow =
          index % this.troopsPerRow;

        const troopsInThisRow =
          Math.min(
            this.troopsPerRow,
            troops.length -
              row * this.troopsPerRow
          );

        const rowWidth =
          (troopsInThisRow - 1) *
          this.troopSpacingX;

        const startX =
          this.player.x -
          rowWidth / 2;

        const targetX =
          startX +
          indexInRow *
            this.troopSpacingX;

        const targetY =
          this.player.y +
          50 +
          row *
            this.troopSpacingY;

        troop.x =
          Phaser.Math.Linear(
            troop.x,
            targetX,
            0.15
          );

        troop.y =
          Phaser.Math.Linear(
            troop.y,
            targetY,
            0.15
          );
      }
    );
  }

  private constrainPlayerToFormation() {
    const troopCount =
      this.getTroopCount();

    if (troopCount === 0) {
      return;
    }

    const widestRowCount =
      Math.min(
        troopCount,
        this.troopsPerRow
      );

    const formationHalfWidth =
      ((widestRowCount - 1) *
        this.troopSpacingX) /
      2;

    const margin = 25;

    const minX =
      formationHalfWidth +
      margin;

    const maxX =
      this.scene.scale.width -
      formationHalfWidth -
      margin;

    this.player.x =
      Phaser.Math.Clamp(
        this.player.x,
        minX,
        maxX
      );
  }
}