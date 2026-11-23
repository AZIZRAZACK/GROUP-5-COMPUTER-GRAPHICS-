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
      levelState.traps.push({
        type: this.tool,
        x: gx,
        y: gy,
        w: this.tool === "falling_floor" ? 120 : 40,
        h: this.tool === "falling_floor" ? 24 : 24,
        triggerX: gx - 60,
        delay: 0.2,
        state: "idle",
        timer: 0,
        vy: 0,
        baseY: gy,
        visible: true,
        solid: false,
        triggeredSpike: false
      });
    }
  }
}
