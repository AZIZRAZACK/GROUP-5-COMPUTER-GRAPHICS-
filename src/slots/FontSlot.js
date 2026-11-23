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

  spawnTaunt({ text, x, y, size = 18, color = "#ff3e3e", lethal = false }) {
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
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`LEVEL: ${levelName}`, 20, 32);
    ctx.fillStyle = "#ff5555";
    ctx.fillText(`FAILS: ${deaths}`, 640, 32);
  }
}
