import { Player, checkAABB } from "./engine/physics.js";
import { ViewSlot } from "./slots/ViewSlot.js";
import { ClipSlot } from "./slots/ClipSlot.js";
import { FontSlot } from "./slots/FontSlot.js";
import { createLevel01 } from "./levels/level_01.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const viewSlot = new ViewSlot(canvas.width, canvas.height);
const clipSlot = new ClipSlot();
const fontSlot = new FontSlot();

let level = createLevel01();
let player = new Player(level.spawn.x, level.spawn.y);
let deaths = 0;
let won = false;

const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "KeyR") resetLevel();
});
window.addEventListener("keyup", (e) => (keys[e.code] = false));

function resetLevel() {
  level = createLevel01();
  player.reset();
  viewSlot.reset();
  clipSlot.reset();
  fontSlot.reset();
  won = false;
}

let lastTime = performance.now();

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (!won) {
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

    if (checkAABB(player, level.goal)) {
      won = true;
      fontSlot.spawnTaunt({ text: "YOU SURVIVED! (PRESS R)", x: 880, y: 180, size: 20, color: "#4ade80" });
    }

    if (player.dead) {
      deaths++;
      resetLevel();
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  clipSlot.applyMask(ctx, player, viewSlot);
  viewSlot.apply(ctx);

  ctx.fillStyle = "#4ade80";
  ctx.fillRect(level.goal.x, level.goal.y, level.goal.w, level.goal.h);

  for (const tile of level.tiles) {
    if (!clipSlot.shouldRender(tile)) continue;
    ctx.fillStyle = tile.color;
    ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
  }

  ctx.fillStyle = "#ff3e3e";
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

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
