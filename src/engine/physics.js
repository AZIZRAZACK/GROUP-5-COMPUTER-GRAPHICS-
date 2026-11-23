export function checkAABB(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export class Player {
  constructor(x, y) {
    this.spawnX = x;
    this.spawnY = y;
    this.w = 24;
    this.h = 32;
    this.reset();
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.speed = 260;
    this.jumpForce = -470;
    this.gravity = 1350;
    this.grounded = false;
    this.dead = false;
  }

  update(dt, keys, tiles) {
    if (this.dead) return;

    if (keys["ArrowLeft"] || keys["KeyA"]) this.vx = -this.speed;
    else if (keys["ArrowRight"] || keys["KeyD"]) this.vx = this.speed;
    else this.vx = 0;

    if ((keys["Space"] || keys["ArrowUp"] || keys["KeyW"]) && this.grounded) {
      this.vy = this.jumpForce;
      this.grounded = false;
    }

    this.x += this.vx * dt;
    for (const tile of tiles) {
      if (!tile.solid) continue;
      if (checkAABB(this, tile)) {
        if (this.vx > 0) this.x = tile.x - this.w;
        if (this.vx < 0) this.x = tile.x + tile.w;
      }
    }

    this.vy += this.gravity * dt;
    this.y += this.vy * dt;
    this.grounded = false;

    for (const tile of tiles) {
      if (!tile.solid) continue;
      if (checkAABB(this, tile)) {
        if (this.vy > 0) {
          this.y = tile.y - this.h;
          this.vy = 0;
          this.grounded = true;
        } else if (this.vy < 0) {
          this.y = tile.y + tile.h;
          this.vy = 0;
        }
      }
    }

    if (this.y > 500) this.dead = true;
  }

  render(ctx) {
    ctx.fillStyle = "#4cc9f0";
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = "#111";
    ctx.fillRect(this.x + 14, this.y + 8, 4, 4);
  }
}
