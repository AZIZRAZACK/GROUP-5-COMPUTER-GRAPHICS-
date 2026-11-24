import { PALETTE } from "./palette.js";

export function aabb(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export class Player {
  constructor(x, y, color = PALETTE.player1, label = "P1") {
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
  const floorTiles = trapDef.type === "falling_floor"
    ? Array.from({ length: Math.ceil(trapDef.w / 40) }, (_, index) => {
        const x = trapDef.x + index * 40;
        return {
          x,
          y: trapDef.y,
          w: Math.min(40, trapDef.x + trapDef.w - x),
          h: trapDef.h,
          state: "intact",
          vy: 0,
          solid: true
        };
      })
    : [];

  return {
    ...trapDef,
    initialDefinition: { ...trapDef },
    state: "idle",
    timer: 0,
    vy: 0,
    baseY: trapDef.y,
    visible: trapDef.type !== "invisible_block",
    solid: trapDef.type === "invisible_block",
    triggeredSpike: false,
    spikeHeight: 0,
    spikeTimer: 0,
    floorTiles,
    collapseIndex: 0,
    collapseTimer: 0,
    particles: []
  };
}

export function resetTriggeredTraps(traps) {
  for (const trap of traps) {
    if (trap.state === "idle") continue;
    const resetTrap = createTrapRuntime(trap.initialDefinition);
    for (const key of Object.keys(trap)) {
      if (!(key in resetTrap)) delete trap[key];
    }
    Object.assign(trap, resetTrap);
  }
}

function triangleIntersectsRect(triangle, rect) {
  const rectangle = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h }
  ];
  const axes = [{ x: 1, y: 0 }, { x: 0, y: 1 }];

  for (let i = 0; i < triangle.length; i++) {
    const start = triangle[i];
    const end = triangle[(i + 1) % triangle.length];
    axes.push({ x: -(end.y - start.y), y: end.x - start.x });
  }

  return axes.every((axis) => {
    const triangleProjections = triangle.map((point) => point.x * axis.x + point.y * axis.y);
    const rectangleProjections = rectangle.map((point) => point.x * axis.x + point.y * axis.y);
    return (
      Math.max(...triangleProjections) >= Math.min(...rectangleProjections) &&
      Math.max(...rectangleProjections) >= Math.min(...triangleProjections)
    );
  });
}

export function updateTraps(dt, traps, players, levelState, camera, sfx) {
  for (const trap of traps) {
    let justArmed = false;
    if (trap.state === "idle") {
      const triggered = players.some((p) => {
        if (p.dead) return false;
        if (trap.type === "falling_floor") {
          const closeToFloor = Math.abs(p.y + p.h - trap.y) <= 24;
          const nearFloor = p.x + p.w >= trap.x - 12 && p.x <= trap.x + trap.w + 12;
          return closeToFloor && nearFloor;
        }
        return p.x + p.w >= trap.triggerX;
      });
      if (triggered) {
        trap.state = "armed";
        trap.timer = trap.type === "falling_floor"
          ? 0.3
          : trap.delay ?? (trap.type === "hidden_spike" ? 0.1 : 0);
        justArmed = true;
        sfx?.play("trap");
      }
    }

    if (trap.state === "armed" && !justArmed) {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.state = "active";
        if (trap.type === "falling_floor") {
          trap.collapseTimer = 0;
        } else if (trap.type === "hidden_spike") {
          trap.triggeredSpike = true;
          trap.spikeTimer = 0;
          trap.spikeHeight = 0;
          camera?.shake(0.2, 2);
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
      if (trap.type === "reverse_gravity") {
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
      } else if (trap.type === "hidden_spike") {
        trap.spikeTimer = Math.min(0.12, trap.spikeTimer + dt);
        const progress = trap.spikeTimer / 0.12;
        trap.spikeHeight = 1 - (1 - progress) ** 3;
      }
    }

    if (trap.type === "falling_floor") {
      if (trap.state === "active") {
        trap.collapseTimer += dt;
        while (trap.collapseIndex < trap.floorTiles.length && trap.collapseTimer >= 0.08) {
          trap.collapseTimer -= 0.08;
          const tile = trap.floorTiles[trap.collapseIndex++];
          tile.state = "falling";
          tile.vy = 0;
          for (let i = 0; i < 4; i++) {
            trap.particles.push({
              x: tile.x + Math.random() * tile.w,
              y: tile.y + Math.random() * tile.h,
              vx: (Math.random() - 0.5) * 100,
              vy: -Math.random() * 110,
              size: 3 + Math.random() * 3,
              life: 0.45
            });
          }
        }
      }

      const bounds = camera?.getVisibleWorldBounds();
      for (const tile of trap.floorTiles) {
        if (tile.state !== "falling") continue;
        tile.vy += 980 * dt;
        tile.y += tile.vy * dt;
        if (bounds && tile.y > bounds.bottom + tile.h) tile.state = "gone";
      }
      for (const particle of trap.particles) {
        particle.vy += 520 * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.life -= dt;
      }
      trap.particles = trap.particles.filter((particle) => particle.life > 0);

      if (
        trap.state === "active" &&
        trap.collapseIndex === trap.floorTiles.length &&
        trap.floorTiles.every((tile) => tile.state === "gone")
      ) {
        trap.state = "done";
      }
    }

    for (const p of players) {
      if (p.dead || p.finished) continue;
      if (trap.type === "hidden_spike" && trap.spikeHeight > 0.5) {
        const visibleHeight = trap.h * trap.spikeHeight;
        const baseY = trap.y;
        const triangle = [
          { x: trap.x, y: baseY },
          { x: trap.x + trap.w / 2, y: baseY - visibleHeight },
          { x: trap.x + trap.w, y: baseY }
        ];
        if (triangleIntersectsRect(triangle, p)) p.dead = true;
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
