import { aabb, createTrapRuntime } from "./physics.js";

export class LevelEditor {
  constructor() {
    this.enabled = false;
    this.tool = "tile";
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  handleClick(worldPos, levelState) {
    if (!this.enabled) return;
    const gx = Math.floor(worldPos.x / 40) * 40;
    const gy = Math.floor(worldPos.y / 40) * 40;

    if (this.tool === "erase") {
      levelState.tiles = levelState.tiles.filter(
        (t) => !(t.x === gx && t.y === gy)
      );
      levelState.traps = levelState.traps.filter(
        (tr) => !(Math.abs(tr.x - gx) < 40 && Math.abs(tr.y - gy) < 40)
      );
      return;
    }

    if (this.tool === "tile") {
      levelState.tiles.push({ x: gx, y: gy, w: 40, h: 40, solid: true });
    } else {
      const trapDefinition = {
        type: this.tool,
        x: gx,
        y: gy,
        w: this.tool === "falling_floor" ? 120 : 40,
        h: this.tool === "falling_floor" ? 24 : 24,
        triggerX: gx - 60,
        delay: this.tool === "hidden_spike" ? 0.1 : 0.2
      };
      if (trapDefinition.type === "falling_floor") {
        levelState.tiles = levelState.tiles.filter((tile) => !aabb(tile, trapDefinition));
      }
      levelState.traps.push(createTrapRuntime(trapDefinition));
    }
  }
}
