import { PALETTE } from "../engine/palette.js";

export class FontSlot {
  constructor() {
    this.taunts = [];
    this.currentFont = "'Press Start 2P', monospace";
  }

  reset() {
    this.taunts = [];
    this.currentFont = "'Press Start 2P', monospace";
  }

  swapToHorrorFont() {
    this.currentFont = "'Creepster', cursive";
  }

  spawnTaunt({ text, x, y, size = 18, color = PALETTE.danger, lethal = false }) {
    this.taunts.push({
      text,
      x,
      y,
      w: text.length * (size * 0.6),
      h: size,
      size,
      color,
      lethal,
      vy: 0
    });
  }

  update(dt) {
    for (const t of this.taunts) {
      if (t.lethal) {
        t.vy += 900 * dt;
        t.y += t.vy * dt;
      }
    }
  }

  renderWorldText(ctx) {
    for (const t of this.taunts) {
      ctx.font = `${t.size}px ${this.currentFont}`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y + t.h);
    }
  }

  renderHUD(ctx, deaths, levelName) {
    ctx.font = `14px ${this.currentFont}`;
    ctx.fillStyle = PALETTE.ui;
    ctx.fillText(`LEVEL: ${levelName}`, 20, 32);
    ctx.fillStyle = PALETTE.danger;
    ctx.fillText(`FAILS: ${deaths}`, 640, 32);
  }
}
