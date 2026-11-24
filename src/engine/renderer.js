import { PALETTE } from "./palette.js";

export function drawParallax(ctx, viewport, camX) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(viewport.x, viewport.y, viewport.w, viewport.h);
  ctx.clip();

  ctx.fillStyle = PALETTE.sky;
  ctx.fillRect(viewport.x, viewport.y, viewport.w, viewport.h);

  const drawHillLayer = (color, speed, span, heights) => {
    const offset = -((camX * speed) % span);
    ctx.fillStyle = color;
    for (let x = viewport.x + offset - span; x < viewport.x + viewport.w + span; x += span) {
      ctx.beginPath();
      ctx.moveTo(x, viewport.y + viewport.h);
      ctx.lineTo(x + span * 0.25, viewport.y + viewport.h - heights[0]);
      ctx.lineTo(x + span * 0.5, viewport.y + viewport.h - heights[1]);
      ctx.lineTo(x + span * 0.75, viewport.y + viewport.h - heights[2]);
      ctx.lineTo(x + span, viewport.y + viewport.h);
      ctx.closePath();
      ctx.fill();
    }
  };

  drawHillLayer(PALETTE.farHills, 0.2, 360, [viewport.h * 0.52, viewport.h * 0.32, viewport.h * 0.56]);
  drawHillLayer(PALETTE.nearHills, 0.45, 260, [viewport.h * 0.3, viewport.h * 0.45, viewport.h * 0.28]);
  ctx.restore();
}

export function renderWorldInCamera(ctx, camera, levelState, players, time) {
  drawParallax(ctx, camera.viewport, camera.x);
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
    ctx.fillStyle = PALETTE.tile;
    ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
    ctx.fillStyle = PALETTE.tileTop;
    ctx.fillRect(tile.x, tile.y, tile.w, 4);
  }

  for (const trap of levelState.traps) {
    if (trap.type === "falling_floor") {
      for (const tile of trap.floorTiles) {
        if (tile.state === "gone") continue;
        const shaking = trap.state === "armed" && tile.state === "intact";
        const offsetX = shaking ? (Math.random() * 4 - 2) : 0;
        const offsetY = shaking ? (Math.random() * 4 - 2) : 0;
        ctx.fillStyle = PALETTE.tile;
        ctx.fillRect(tile.x + offsetX, tile.y + offsetY, tile.w, tile.h);
        ctx.fillStyle = PALETTE.tileTop;
        ctx.fillRect(tile.x + offsetX, tile.y + offsetY, tile.w, 4);
      }
      for (const particle of trap.particles) {
        ctx.fillStyle = PALETTE.tileTop;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      }
    } else if (trap.type === "hidden_spike" && trap.spikeHeight > 0) {
      const visibleHeight = trap.h * trap.spikeHeight;
      const baseY = trap.y;
      ctx.fillStyle = PALETTE.danger;
      ctx.strokeStyle = PALETTE.ui;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(trap.x, baseY);
      ctx.lineTo(trap.x + trap.w * 0.5, baseY - visibleHeight);
      ctx.lineTo(trap.x + trap.w, baseY);
      ctx.fill();
      ctx.stroke();
    } else if (trap.type === "fake_checkpoint") {
      ctx.fillStyle = trap.lethal ? PALETTE.danger : PALETTE.exit;
      ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
    } else if (trap.type === "crusher") {
      ctx.fillStyle = PALETTE.danger;
      ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
      ctx.fillStyle = PALETTE.ui;
      ctx.fillRect(trap.x, trap.y + trap.h - 6, trap.w, 6);
    } else if (trap.type === "invisible_block" && trap.visible) {
      ctx.fillStyle = PALETTE.danger;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
      ctx.globalAlpha = 1;
    } else if (trap.type === "reverse_gravity") {
      ctx.strokeStyle = PALETTE.panelBorder;
      ctx.strokeRect(trap.x, trap.y, trap.w, trap.h);
    }
  }

  const g = levelState.goal;
  ctx.fillStyle = PALETTE.exitOutline;
  ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.fillStyle = PALETTE.exit;
  ctx.fillRect(g.x + 6, g.y + 6, g.w - 12, g.h - 12);

for (const p of players) {
  if (p.dead) continue;

  // Main body
  ctx.fillStyle = p.color;
  ctx.fillRect(p.x, p.y, p.w, p.h);

  // Little feet along the bottom edge with a subtle step when moving
  const footW = Math.max(4, Math.floor(p.w * 0.22));
  const footH = Math.max(3, Math.floor(p.h * 0.16));
  const footY = p.y + p.h - footH;
  const leftBaseX = p.x + Math.floor(p.w * 0.18);
  const rightBaseX = p.x + p.w - Math.floor(p.w * 0.18) - footW;

  const isMoving = Math.abs(p.vx || 0) > 0.05;
  const stridePhase = isMoving ? Math.sin((p.x + (p.y || 0)) * 0.25) * 3 : 0;

  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(leftBaseX + stridePhase, footY, footW, footH);
  ctx.fillRect(rightBaseX - stridePhase, footY, footW, footH);

  // Eye
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(p.x + 14, p.y + 8, 4, 4);
}

  camera.restoreContext(ctx);

  const { x: vx, y: vy, w: vw, h: vh } = camera.viewport;
  ctx.strokeStyle = PALETTE.panelBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(vx, vy, vw, vh);

  ctx.fillStyle = PALETTE.ui;
  ctx.font = "11px monospace";
  ctx.fillText(`Culled Tiles: ${drawnTiles} / ${totalTiles}`, vx + 10, vy + vh - 10);

  return { drawnTiles, totalTiles };
}

export function renderMinimap(ctx, miniRect, levelState, players, worldWidth = 2240, worldHeight = 520) {
  ctx.save();
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(miniRect.x, miniRect.y, miniRect.w, miniRect.h);
  ctx.strokeStyle = PALETTE.panelBorder;
  ctx.strokeRect(miniRect.x, miniRect.y, miniRect.w, miniRect.h);

  const sx = miniRect.w / worldWidth;
  const sy = miniRect.h / worldHeight;

  ctx.fillStyle = PALETTE.tile;
  for (const t of levelState.tiles) {
    ctx.fillRect(miniRect.x + t.x * sx, miniRect.y + t.y * sy, Math.max(1, t.w * sx), Math.max(1, t.h * sy));
  }

  ctx.fillStyle = PALETTE.exit;
  ctx.fillRect(miniRect.x + levelState.goal.x * sx, miniRect.y + levelState.goal.y * sy, 4, 5);

  for (const p of players) {
    ctx.fillStyle = p.color;
    ctx.fillRect(miniRect.x + p.x * sx, miniRect.y + p.y * sy, 4, 4);
  }
  ctx.restore();
}
