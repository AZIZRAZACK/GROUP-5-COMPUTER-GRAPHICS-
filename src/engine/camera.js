export class Camera {
  constructor(viewport, { deadZoneW = 140, deadZoneH = 90, smoothness = 8, zoom = 1 } = {}) {
    this.viewport = viewport;
    this.x = 400;
    this.y = 240;
    this.targetX = this.x;
    this.targetY = this.y;
    this.deadZoneW = deadZoneW;
    this.deadZoneH = deadZoneH;
    this.smoothness = smoothness;
    this.zoom = zoom;
    this.flipped = false;
    this.shakeTime = 0;
    this.shakeMag = 0;
  }

  shake(duration = 0.25, magnitude = 8) {
    this.shakeTime = Math.max(this.shakeTime, duration);
    this.shakeMag = Math.max(this.shakeMag, magnitude);
  }

  update(dt, target) {
    const halfDZx = this.deadZoneW / 2;
    const halfDZy = this.deadZoneH / 2;

    const dx = target.x + target.w / 2 - this.targetX;
    const dy = target.y + target.h / 2 - this.targetY;

    if (dx > halfDZx) this.targetX += dx - halfDZx;
    else if (dx < -halfDZx) this.targetX += dx + halfDZx;

    if (dy > halfDZy) this.targetY += dy - halfDZy;
    else if (dy < -halfDZy) this.targetY += dy + halfDZy;

    const alpha = 1 - Math.exp(-this.smoothness * dt);
    this.x += (this.targetX - this.x) * alpha;
    this.y += (this.targetY - this.y) * alpha;

    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
    }
  }

  worldToScreen(wx, wy) {
    const { x: vx, y: vy, w: vw, h: vh } = this.viewport;
    let sx = vx + vw * 0.5 + (wx - this.x) * this.zoom;
    let sy = vy + vh * 0.5 + (wy - this.y) * this.zoom;
    if (this.flipped) {
      sy = vy + vh - (sy - vy);
    }
    return { x: sx, y: sy };
  }

  screenToWorld(sx, sy) {
    const { x: vx, y: vy, w: vw, h: vh } = this.viewport;
    let adjY = sy;
    if (this.flipped) {
      adjY = vy + vh - (sy - vy);
    }
    return {
      x: (sx - (vx + vw * 0.5)) / this.zoom + this.x,
      y: (adjY - (vy + vh * 0.5)) / this.zoom + this.y
    };
  }

  getVisibleWorldBounds() {
    const { w: vw, h: vh } = this.viewport;
    const halfW = (vw * 0.5) / this.zoom;
    const halfH = (vh * 0.5) / this.zoom;
    return {
      left: this.x - halfW,
      right: this.x + halfW,
      top: this.y - halfH,
      bottom: this.y + halfH
    };
  }

  applyToContext(ctx) {
    const { x: vx, y: vy, w: vw, h: vh } = this.viewport;
    ctx.save();
    ctx.beginPath();
    ctx.rect(vx, vy, vw, vh);
    ctx.clip();

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTime > 0) {
      shakeX = (Math.random() * 2 - 1) * this.shakeMag;
      shakeY = (Math.random() * 2 - 1) * this.shakeMag;
    }

    ctx.translate(vx + vw * 0.5 + shakeX, vy + vh * 0.5 + shakeY);
    ctx.scale(this.zoom, this.flipped ? -this.zoom : this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  restoreContext(ctx) {
    ctx.restore();
  }
}
