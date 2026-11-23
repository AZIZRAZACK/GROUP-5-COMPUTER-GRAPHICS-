import { Player, checkAABB } from "./engine/physics.js";
import { ViewSlot } from "./slots/ViewSlot.js";
import { ClipSlot } from "./slots/ClipSlot.js";
import { FontSlot } from "./slots/FontSlot.js";
import { createLevel01 } from "./levels/level_01.js";
import { createLevel02 } from "./levels/level_02.js";
import { createLevel03 } from "./levels/level_03.js";
import { createLevel04 } from "./levels/level_04.js";
import { createLevel05 } from "./levels/level_05.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const viewSlot = new ViewSlot(canvas.width, canvas.height);
const clipSlot = new ClipSlot();
const fontSlot = new FontSlot();

const levels = [
  createLevel01,
  createLevel02,
  createLevel03,
  createLevel04,
  createLevel05
];
let currentLevelIndex = 0;
let level = levels[currentLevelIndex]();
let player = new Player(level.spawn.x, level.spawn.y);
let deaths = 0;
let gameCompleted = false;
let elapsed = 0;

const embers = Array.from({ length: 55 }, () => ({
  x: Math.random() * 1300,
  y: Math.random() * canvas.height,
  r: 1.5 + Math.random() * 3,
  vy: 35 + Math.random() * 75,
  vx: (Math.random() - 0.5) * 28,
  alpha: 0.35 + Math.random() * 0.65
}));

const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "KeyR") {
    if (gameCompleted) {
      deaths = 0;
      gameCompleted = false;
      loadLevel(0);
    } else {
      resetLevel();
    }
  }
});
window.addEventListener("keyup", (e) => (keys[e.code] = false));

function loadLevel(index) {
  currentLevelIndex = index;
  level = levels[currentLevelIndex]();
  player = new Player(level.spawn.x, level.spawn.y);
  viewSlot.reset();
  clipSlot.reset();
  fontSlot.reset();
  gameCompleted = false;
}

function resetLevel() {
  loadLevel(currentLevelIndex);
}

function drawDemonBackground(ctx, time, view) {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, "#090306");
  skyGrad.addColorStop(0.55, "#24060b");
  skyGrad.addColorStop(1, "#5c0b0e");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pulse = 0.85 + 0.15 * Math.sin(time * 4.5);
  const fireGlow = ctx.createLinearGradient(0, canvas.height * 0.55, 0, canvas.height);
  fireGlow.addColorStop(0, "rgba(255, 40, 0, 0)");
  fireGlow.addColorStop(1, `rgba(255, 69, 0, ${0.32 * pulse})`);
  ctx.fillStyle = fireGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#120407";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  const peaks = [
    [0, 290], [110, 195], [230, 280], [360, 165],
    [510, 270], [650, 180], [800, 295]
  ];
  for (const [px, py] of peaks) {
    ctx.lineTo(px, py);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();

  for (let x = -20; x < canvas.width + 30; x += 26) {
    const parallaxX = ((x - (view.x * 0.35) % 26) + 26) % 26 - 26 + Math.floor(x / 26) * 26;
    const flameH = 26 + 14 * Math.sin(time * 9 + x * 0.08) + 8 * Math.cos(time * 13 + x * 0.15);
    const fGrad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - flameH);
    fGrad.addColorStop(0, "#ffae00");
    fGrad.addColorStop(0.5, "#ff2a00");
    fGrad.addColorStop(1, "rgba(180, 0, 20, 0)");

    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.moveTo(parallaxX, canvas.height);
    ctx.quadraticCurveTo(parallaxX + 13, canvas.height - flameH * 1.2, parallaxX + 26, canvas.height);
    ctx.fill();
  }

  for (const em of embers) {
    ctx.fillStyle = `rgba(255, 140, 30, ${em.alpha})`;
    ctx.beginPath();
    ctx.arc(em.x, em.y, em.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGameCompleteOverlay(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(9, 3, 6, 0.82)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.font = "28px 'Creepster', cursive";
  ctx.fillStyle = "#ff4d00";
  ctx.fillText("MASTER TRIAL CONQUERED", canvas.width / 2, 165);

  ctx.font = "16px 'Press Start 2P', monospace";
  ctx.fillStyle = "#ffe600";
  ctx.fillText("GAME COMPLETE!", canvas.width / 2, 215);

  ctx.font = "12px 'Press Start 2P', monospace";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`TOTAL FAILS: ${deaths}`, canvas.width / 2, 260);

  ctx.fillStyle = "#4ade80";
  ctx.fillText("PRESS R TO PLAY AGAIN", canvas.width / 2, 310);
  ctx.restore();
}

let lastTime = performance.now();

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  elapsed += dt;

  for (const em of embers) {
    em.y -= em.vy * dt;
    em.x += (em.vx + Math.sin(elapsed * 3 + em.y * 0.03) * 18) * dt;
    if (em.y < -10) {
      em.y = canvas.height + 10;
      em.x = Math.random() * canvas.width;
    }
    if (em.x < -10) em.x = canvas.width + 10;
    if (em.x > canvas.width + 10) em.x = -10;
  }

  if (!gameCompleted) {
    for (const tile of level.tiles) {
      if (tile.vy) {
        tile.y += tile.vy * dt;
      }
    }

    for (const spike of level.spikes) {
      if (!spike.active) continue;
      if (spike.gravity) {
        spike.vy += spike.gravity * dt;
        spike.y += spike.vy * dt;
      }
    }

    player.update(dt, keys, level.tiles);
    viewSlot.update(dt, player);
    fontSlot.update(dt);

    for (const trig of level.triggers) {
      if (!trig.fired && checkAABB(player, trig)) {
        trig.fired = true;
        trig.onEnter({ level, player, view: viewSlot, clip: clipSlot, font: fontSlot });
      }
    }

    for (const spike of level.spikes) {
      if (spike.active && checkAABB(player, spike)) player.dead = true;
    }

    for (const taunt of fontSlot.taunts) {
      if (taunt.lethal && checkAABB(player, taunt)) player.dead = true;
    }

    if (level.goal.active && checkAABB(player, level.goal)) {
      if (currentLevelIndex + 1 < levels.length) {
        loadLevel(currentLevelIndex + 1);
      } else {
        gameCompleted = true;
        viewSlot.reset();
        clipSlot.reset();
      }
    }

    if (player.dead) {
      deaths++;
      resetLevel();
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawDemonBackground(ctx, elapsed, viewSlot);

  ctx.save();
  clipSlot.applyMask(ctx, player, viewSlot);
  viewSlot.apply(ctx);

  if (level.goal.active) {
    ctx.fillStyle = "#ff4d00";
    ctx.fillRect(level.goal.x - 3, level.goal.y - 3, level.goal.w + 6, level.goal.h + 6);
    ctx.fillStyle = "#ffe600";
    ctx.fillRect(level.goal.x + 4, level.goal.y + 4, level.goal.w - 8, level.goal.h - 8);
  }

  for (const tile of level.tiles) {
    if (!clipSlot.shouldRender(tile)) continue;
    ctx.fillStyle = "#18090d";
    ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
    ctx.fillStyle = "#b91c1c";
    ctx.fillRect(tile.x, tile.y, tile.w, 4);
  }

  ctx.fillStyle = "#ff2400";
  for (const spike of level.spikes) {
    if (!spike.active) continue;
    ctx.beginPath();
    ctx.moveTo(spike.x, spike.y + spike.h);
    ctx.lineTo(spike.x + spike.w / 2, spike.y);
    ctx.lineTo(spike.x + spike.w, spike.y + spike.h);
    ctx.fill();
  }

  fontSlot.renderWorldText(ctx);
  player.render(ctx);

  viewSlot.restore(ctx);
  ctx.restore();

  fontSlot.renderHUD(ctx, deaths, level.name);

  if (gameCompleted) {
    drawGameCompleteOverlay(ctx);
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
