export function drawDemonParallax(ctx, viewport, camX, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(viewport.x, viewport.y, viewport.w, viewport.h);
  ctx.clip();

  const grad = ctx.createLinearGradient(0, viewport.y, 0, viewport.y + viewport.h);
  grad.addColorStop(0, "#090306");
  grad.addColorStop(0.6, "#26050a");
  grad.addColorStop(1, "#5c0b0e");
  ctx.fillStyle = grad;
  ctx.fillRect(viewport.x, viewport.y, viewport.w, viewport.h);

  ctx.fillStyle = "#140407";
  const span = 240;
  const offsetFar = -((camX * 0.2) % span);
  for (let x = viewport.x + offsetFar - span; x < viewport.x + viewport.w + span; x += span) {
    ctx.beginPath();
    ctx.moveTo(x, viewport.y + viewport.h);
    ctx.lineTo(x + 60, viewport.y + viewport.h * 0.45);
    ctx.lineTo(x + 120, viewport.y + viewport.h * 0.72);
    ctx.lineTo(x + 180, viewport.y + viewport.h * 0.38);
    ctx.lineTo(x + 240, viewport.y + viewport.h);
    ctx.closePath();
    ctx.fill();
  }

  const step = 28;
  const offsetFire = -((camX * 0.45) % step);
  const baseBottom = viewport.y + viewport.h;
  for (let x = viewport.x + offsetFire - step; x < viewport.x + viewport.w + step; x += step) {
    const h = 20 + 10 * Math.sin(time * 8 + x * 0.09);
    ctx.fillStyle = "#ff2a00";
    ctx.beginPath();
    ctx.moveTo(x, baseBottom);
    ctx.quadraticCurveTo(x + step * 0.5, baseBottom - h, x + step, baseBottom);
    ctx.fill();
  }

  ctx.restore();
}

export function renderWorldInCamera(ctx, camera, levelState, players, time) {
  drawDemonParallax(ctx, camera.viewport, camera.x, time);
  camera.applyToContext(ctx);

  const bounds = camera.getVisibleWorldBounds();
  const totalTiles = levelState.tiles.length;
  let drawnTiles = 0;

  for (const tile of levelState.tiles) {
    const intersects =
      tile.x + tile.w >= bounds.left &&
      tile.x <= bounds.right &&
      tile.y + tile.h >= bounds.top &&
      tile.y <= bounds.bottom;
    if (!intersects) continue;

    drawnTiles++;
    ctx.fillStyle = "#1b090e";
    ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(tile.x, tile.y, tile.w, 4);
  }

  for (const trap of levelState.traps) {
    if (trap.type === "falling_floor") {
      ctx.fillStyle = trap.state === "idle" ? "#3f1d24" : "#f97316";
      ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
    } else if (trap.type === "hidden_spike" && trap.triggeredSpike) {
      ctx.fillStyle = "#ff2400";
      ctx.beginPath();
      ctx.moveTo(trap.x, trap.y + trap.h);
      ctx.lineTo(trap.x + trap.w * 0.5, trap.y);
      ctx.lineTo(trap.x + trap.w, trap.y + trap.h);
      ctx.fill();
    } else if (trap.type === "fake_checkpoint") {
      ctx.fillStyle = trap.lethal ? "#ef4444" : "#eab308";
      ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
    } else if (trap.type === "crusher") {
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
      ctx.fillStyle = "#fca5a5";
      ctx.fillRect(trap.x, trap.y + trap.h - 6, trap.w, 6);
    } else if (trap.type === "invisible_block" && trap.visible) {
      ctx.fillStyle = "rgba(248, 113, 113, 0.55)";
      ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
    } else if (trap.type === "reverse_gravity") {
      ctx.strokeStyle = "rgba(168, 85, 247, 0.45)";
      ctx.strokeRect(trap.x, trap.y, trap.w, trap.h);
    }
  }

  const g = levelState.goal;
  ctx.fillStyle = "#f97316";
  ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.fillStyle = "#fde047";
  ctx.fillRect(g.x + 6, g.y + 6, g.w - 12, g.h - 12);

  for (const p of players) {
    if (p.dead) continue;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "#090306";
    ctx.fillRect(p.x + 14, p.y + 8, 4, 4);
  }

  camera.restoreContext(ctx);

  const { x: vx, y: vy, w: vw, h: vh } = camera.viewport;
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 2;
  ctx.strokeRect(vx, vy, vw, vh);

  ctx.fillStyle = "#fde68a";
  ctx.font = "11px monospace";
  ctx.fillText(`Culled Tiles: ${drawnTiles} / ${totalTiles}`, vx + 10, vy + vh - 10);

  return { drawnTiles, totalTiles };
}

export function renderMinimap(ctx, miniRect, levelState, players, worldWidth = 2240, worldHeight = 520) {
  ctx.save();
  ctx.fillStyle = "rgba(10, 3, 6, 0.88)";
  ctx.fillRect(miniRect.x, miniRect.y, miniRect.w, miniRect.h);
  ctx.strokeStyle = "#f97316";
  ctx.strokeRect(miniRect.x, miniRect.y, miniRect.w, miniRect.h);

  const sx = miniRect.w / worldWidth;
  const sy = miniRect.h / worldHeight;

  ctx.fillStyle = "#991b1b";
  for (const t of levelState.tiles) {
    ctx.fillRect(miniRect.x + t.x * sx, miniRect.y + t.y * sy, Math.max(1, t.w * sx), Math.max(1, t.h * sy));
  }

  ctx.fillStyle = "#fde047";
  ctx.fillRect(miniRect.x + levelState.goal.x * sx, miniRect.y + levelState.goal.y * sy, 4, 5);

  for (const p of players) {
    ctx.fillStyle = p.color;
    ctx.fillRect(miniRect.x + p.x * sx, miniRect.y + p.y * sy, 4, 4);
  }
  ctx.restore();
}
