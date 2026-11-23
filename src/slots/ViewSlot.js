export class ViewSlot {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.flipped = false;
    this.shakeTime = 0;
    this.shakeIntensity = 0;
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.flipped = false;
    this.shakeTime = 0;
  }

  triggerShake(duration = 0.3, intensity = 8) {
    this.shakeTime = duration;
    this.shakeIntensity = intensity;
  }

  toggleFlip() {
    this.flipped = !this.flipped;
  }

  update(dt, target) {
    const targetX = Math.max(0, target.x - this.width / 3);
    this.x += (targetX - this.x) * 8 * dt;

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
    }
  }

  apply(ctx) {
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);

    if (this.flipped) {
      ctx.scale(1, -1);
    }

    ctx.scale(this.zoom, this.zoom);

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTime > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    }

    ctx.translate(-this.width / 2 - this.x + shakeX, -this.height / 2 - this.y + shakeY);
  }

  restore(ctx) {
    ctx.restore();
  }
}
