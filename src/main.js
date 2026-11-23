import levelsData from "./data/levels.json" with { type: "json" };
import { Camera } from "./engine/camera.js";
import { Player, aabb, createTrapRuntime, updateTraps } from "./engine/physics.js";
import { renderWorldInCamera, renderMinimap } from "./engine/renderer.js";
import { SoundFX } from "./engine/sound.js";
import { LevelEditor } from "./engine/editor.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const sfx = new SoundFX();
const editor = new LevelEditor();

let allLevels = structuredClone(levelsData.levels);
const tileSize = levelsData.tileSize || 40;

let currentLevelIdx = 0;
let splitScreenMode = false;
let deaths = 0;
let runTimer = 0;
let leaderboard = JSON.parse(localStorage.getItem("troll_leaderboard") || "[]");

let levelState = null;
let players = [];
let cameras = [];

const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "KeyR") restartLevel();
  if (e.code === "KeyE") editor.toggle();
  if (editor.enabled) {
    if (e.code === "Digit1") editor.tool = "tile";
    if (e.code === "Digit2") editor.tool = "falling_floor";
    if (e.code === "Digit3") editor.tool = "hidden_spike";
    if (e.code === "Digit4") editor.tool = "erase";
  }
});
window.addEventListener("keyup", (e) => (keys[e.code] = false));

canvas.addEventListener("click", (e) => {
  if (!editor.enabled) return;
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const cam = cameras[0];
  const worldPos = cam.screenToWorld(sx, sy);
  editor.handleClick(worldPos, levelState);
});

function buildLevelState(levelDef) {
  const tiles = [];
  let spawn = { x: 80, y: 260 };
  let goal = { x: 1800, y: 240, w: 36, h: 48 };

  levelDef.grid.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      const x = c * tileSize;
      const y = r * tileSize;
      if (ch === "#") {
        tiles.push({ x, y, w: tileSize, h: tileSize, solid: true });
      } else if (ch === "P") {
        spawn = { x, y: y - 8 };
      } else if (ch === "G") {
        goal = { x: x + 2, y: y - 8, w: 36, h: 48 };
      }
    }
  });

  const traps = (levelDef.traps || []).map(createTrapRuntime);
  return { id: levelDef.id, name: levelDef.name, spawn, goal, tiles, traps };
}

function setupCameras() {
  if (splitScreenMode) {
    const halfH = Math.floor(canvas.height / 2);
    cameras = [
      new Camera({ x: 0, y: 0, w: canvas.width, h: halfH }, { zoom: 0.92 }),
      new Camera({ x: 0, y: halfH, w: canvas.width, h: halfH }, { zoom: 0.92 })
    ];
    players = [
      new Player(levelState.spawn.x, levelState.spawn.y, "#38bdf8", "P1"),
      new Player(levelState.spawn.x, levelState.spawn.y - 40, "#4ade80", "P2")
    ];
  } else {
    cameras = [
      new Camera({ x: 0, y: 0, w: canvas.width, h: canvas.height }, { zoom: 1.0 })
    ];
    players = [
      new Player(levelState.spawn.x, levelState.spawn.y, "#38bdf8", "P1")
    ];
  }
}

function loadLevel(idx) {
  currentLevelIdx = (idx + allLevels.length) % allLevels.length;
  levelState = buildLevelState(allLevels[currentLevelIdx]);
  setupCameras();
  document.getElementById("levelSelect").value = String(currentLevelIdx);
}

function restartLevel() {
  loadLevel(currentLevelIdx);
}

function recordLeaderboard() {
  leaderboard.push({
    time: Number(runTimer.toFixed(2)),
    deaths,
    date: new Date().toLocaleDateString()
  });
  leaderboard.sort((a, b) => a.time - b.time || a.deaths - b.deaths);
  leaderboard = leaderboard.slice(0, 5);
  localStorage.setItem("troll_leaderboard", JSON.stringify(leaderboard));
}

function populateLevelSelect() {
  const sel = document.getElementById("levelSelect");
  sel.innerHTML = "";
  allLevels.forEach((lvl, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = lvl.name;
    sel.appendChild(opt);
  });
}

document.getElementById("levelSelect").addEventListener("change", (e) => {
  loadLevel(Number(e.target.value));
});
document.getElementById("btnMode1P").addEventListener("click", () => {
  splitScreenMode = false;
  loadLevel(currentLevelIdx);
});
document.getElementById("btnMode2P").addEventListener("click", () => {
  splitScreenMode = true;
  loadLevel(currentLevelIdx);
});
document.getElementById("btnEditor").addEventListener("click", () => {
  editor.toggle();
});
document.getElementById("btnSaveJson").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ tileSize, levels: allLevels }, null, 2)], {
    type: "application/json"
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "levels_custom.json";
  a.click();
});
document.getElementById("btnLoadJson").addEventListener("click", () => {
  document.getElementById("fileInput").click();
});
document.getElementById("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const parsed = JSON.parse(await file.text());
  if (Array.isArray(parsed.levels) && parsed.levels.length > 0) {
    allLevels = parsed.levels;
    populateLevelSelect();
    loadLevel(0);
  }
});

populateLevelSelect();
loadLevel(0);

let lastTime = performance.now();
let elapsed = 0;

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  elapsed += dt;

  if (!editor.enabled) {
    runTimer += dt;
  }

  const p1Controls = {
    left: Boolean(keys["KeyA"]),
    right: Boolean(keys["KeyD"]),
    jump: Boolean(keys["KeyW"] || keys["Space"])
  };
  const p2Controls = {
    left: Boolean(keys["ArrowLeft"]),
    right: Boolean(keys["ArrowRight"]),
    jump: Boolean(keys["ArrowUp"])
  };

  if (!editor.enabled) {
    const dynamicSolids = [
      ...levelState.tiles,
      ...levelState.traps.filter(
        (tr) => tr.type === "falling_floor" && tr.state !== "active"
      )
    ];

    if (players[0]) players[0].update(dt, p1Controls, dynamicSolids, sfx);
    if (players[1]) players[1].update(dt, p2Controls, dynamicSolids, sfx);

    updateTraps(dt, levelState.traps, players, levelState, cameras[0], sfx);

    for (const p of players) {
      if (p.dead) {
        deaths++;
        sfx.play("death");
        restartLevel();
        break;
      }
      if (aabb(p, levelState.goal)) {
        sfx.play("win");
        if (currentLevelIdx + 1 < allLevels.length) {
          loadLevel(currentLevelIdx + 1);
        } else {
          recordLeaderboard();
          runTimer = 0;
          deaths = 0;
          loadLevel(0);
        }
        break;
      }
    }
  }

  for (let i = 0; i < cameras.length; i++) {
    const targetPlayer = players[i] || players[0];
    cameras[i].update(dt, targetPlayer);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < cameras.length; i++) {
    renderWorldInCamera(ctx, cameras[i], levelState, players, elapsed);
  }

  renderMinimap(ctx, { x: canvas.width - 210, y: 46, w: 196, h: 68 }, levelState, players);

  ctx.fillStyle = "rgba(9, 3, 6, 0.78)";
  ctx.fillRect(0, 0, canvas.width, 36);
  ctx.fillStyle = "#fff";
  ctx.font = "12px monospace";
  ctx.fillText(
    `${levelState.name} | Time: ${runTimer.toFixed(1)}s | Deaths: ${deaths} | ${
      splitScreenMode ? "2P (WASD vs Arrows)" : "1P (WASD / Space)"
    }`,
    12,
    22
  );

  if (leaderboard.length > 0) {
    const best = leaderboard[0];
    ctx.fillStyle = "#fde047";
    ctx.fillText(`Best: ${best.time}s (${best.deaths}d)`, canvas.width - 375, 22);
  }

  if (editor.enabled) {
    ctx.fillStyle = "#4ade80";
    ctx.fillText(
      `EDITOR ON [Tool: ${editor.tool}] — 1:Tile  2:FallFloor  3:Spike  4:Erase  E:Exit`,
      12,
      54
    );
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
