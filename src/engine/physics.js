export function aabb(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export class Player {
  constructor(x, y, color = "#38bdf8", label = "P1") {
    this.spawnX = x;
    this.spawnY = y;
    this.color = color;
    this.label = label;
    this.w = 24;
    this.h = 32;
    this.reset(x, y);
  }

  reset(x = this.spawnX, y = this.spawnY) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.runSpeed = 290;
    this.gravityMag = 1450;
    this.gravityDir = 1;
    this.jumpVelocity = -540;
    this.coyoteMax = 0.11;
    this.coyoteTimer = 0;
    this.jumpHeldPrev = false;
    this.grounded = false;
    this.dead = false;
    this.finished = false;
    this.gravityOverrideTimer = 0;
  }

  update(dt, controls, solids, sfx) {
    if (this.dead || this.finished) return;

    if (this.gravityOverrideTimer > 0) {
      this.gravityOverrideTimer = Math.max(0, this.gravityOverrideTimer - dt);
      if (this.gravityOverrideTimer === 0) this.gravityDir = 1;
    }

    const moveX = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    this.vx = moveX * this.runSpeed;

    if (this.grounded) {
      this.coyoteTimer = this.coyoteMax;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    const jumpJustPressed = controls.jump && !this.jumpHeldPrev;
    const jumpJustReleased = !controls.jump && this.jumpHeldPrev;
    this.jumpHeldPrev = controls.jump;

    if (jumpJustPressed && this.coyoteTimer > 0) {
      this.vy = this.jumpVelocity * this.gravityDir;
      this.coyoteTimer = 0;
      this.grounded = false;
      sfx?.play("jump");
    }

    if (jumpJustReleased) {
      if (this.gravityDir === 1 && this.vy < -140) this.vy *= 0.45;
      if (this.gravityDir === -1 && this.vy > 140) this.vy *= 0.45;
    }

    this.x += this.vx * dt;
    for (const s of solids) {
      if (!s.solid) continue;
      if (aabb(this, s)) {
        if (this.vx > 0) this.x = s.x - this.w;
        else if (this.vx < 0) this.x = s.x + s.w;
      }
    }

    this.vy += this.gravityMag * this.gravityDir * dt;
    this.y += this.vy * dt;
    this.grounded = false;

    for (const s of solids) {
      if (!s.solid) continue;
      if (aabb(this, s)) {
        if (this.gravityDir === 1) {
          if (this.vy > 0) {
            this.y = s.y - this.h;
            this.vy = 0;
            this.grounded = true;
          } else if (this.vy < 0) {
            this.y = s.y + s.h;
            this.vy = 0;
          }
        } else {
          if (this.vy < 0) {
            this.y = s.y + s.h;
            this.vy = 0;
            this.grounded = true;
          } else if (this.vy > 0) {
            this.y = s.y - this.h;
            this.vy = 0;
          }
        }
      }
    }

    if (this.y > 760 || this.y < -260) {
      this.dead = true;
    }
  }
}

export function createTrapRuntime(trapDef) {
  return {
    ...trapDef,
    state: "idle",
    timer: 0,
    vy: 0,
    baseY: trapDef.y,
    visible: trapDef.type !== "invisible_block",
    solid: trapDef.type === "invisible_block",
    triggeredSpike: false
  };
}

export function updateTraps(dt, traps, players, levelState, camera, sfx) {
  for (const trap of traps) {
    if (trap.state === "idle") {
      const crossed = players.some((p) => !p.dead && p.x + p.w >= trap.triggerX);
      if (crossed) {
        trap.state = "armed";
        trap.timer = trap.delay ?? 0;
        sfx?.play("trap");
      }
    }

    if (trap.state === "armed") {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.state = "active";
        if (trap.type === "falling_floor") {
          trap.vy = 120;
        } else if (trap.type === "hidden_spike") {
          trap.triggeredSpike = true;
          camera?.shake(0.2, 6);
        } else if (trap.type === "runaway_door") {
          levelState.goal.x += trap.offsetX ?? 120;
          levelState.goal.y += trap.offsetY ?? -40;
          camera?.shake(0.2, 5);
        } else if (trap.type === "reverse_gravity") {
          trap.timer = trap.duration ?? 2.2;
          for (const p of players) {
            p.gravityDir = -1;
            p.gravityOverrideTimer = trap.duration ?? 2.2;
          }
        } else if (trap.type === "fake_checkpoint") {
          trap.timer = 0.35;
        } else if (trap.type === "crusher") {
          trap.vy = 520;
        } else if (trap.type === "screen_flip") {
          trap.timer = trap.duration ?? 2.5;
          if (camera) camera.flipped = true;
        } else if (trap.type === "invisible_block") {
          trap.visible = trap.revealOnTouch ?? false;
        }
      }
    } else if (trap.state === "active") {
      if (trap.type === "falling_floor") {
        trap.vy += 980 * dt;
        trap.y += trap.vy * dt;
      } else if (trap.type === "reverse_gravity") {
        trap.timer -= dt;
        if (trap.timer <= 0) {
          for (const p of players) p.gravityDir = 1;
          trap.state = "done";
        }
      } else if (trap.type === "fake_checkpoint") {
        trap.timer -= dt;
        if (trap.timer <= 0) {
          trap.lethal = true;
        }
      } else if (trap.type === "crusher") {
        trap.y += trap.vy * dt;
        if (trap.y >= (trap.crushY ?? 300)) {
          trap.y = trap.crushY ?? 300;
          trap.vy = -220;
        } else if (trap.vy < 0 && trap.y <= trap.baseY) {
          trap.y = trap.baseY;
          trap.vy = 520;
        }
      } else if (trap.type === "screen_flip") {
        trap.timer -= dt;
        if (trap.timer <= 0) {
          if (camera) camera.flipped = false;
          trap.state = "done";
        }
      }
    }

    for (const p of players) {
      if (p.dead || p.finished) continue;
      if (trap.type === "hidden_spike" && trap.triggeredSpike && aabb(p, trap)) {
        p.dead = true;
      }
      if (trap.type === "fake_checkpoint" && trap.lethal && aabb(p, trap)) {
        p.dead = true;
      }
      if (trap.type === "crusher" && aabb(p, trap)) {
        p.dead = true;
      }
      if (trap.type === "invisible_block" && trap.revealOnTouch && aabb(p, trap)) {
        trap.visible = true;
      }
    }
  }
}
