import levelsData from "./data/levels.json" with { type: "json" };
import { Camera } from "./engine/camera.js";
import { Player, aabb, createTrapRuntime, resetTriggeredTraps, updateTraps } from "./engine/physics.js";
import { renderWorldInCamera, renderMinimap } from "./engine/renderer.js";
import { BackgroundMusic, SoundFX } from "./engine/sound.js";
import { LevelEditor } from "./engine/editor.js";
import { PALETTE } from "./engine/palette.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let pixelRatio = 1;
let viewportWidth = canvas.clientWidth;
let viewportHeight = canvas.clientHeight;
for (const [name, color] of Object.entries(PALETTE)) {
  const cssName = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  document.documentElement.style.setProperty(`--palette-${cssName}`, color);
}
const sfx = new SoundFX();
const music = new BackgroundMusic();
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
const deathTimers = new Map();

function resizeCanvas() {
  viewportWidth = Math.max(1, canvas.clientWidth);
  viewportHeight = Math.max(1, canvas.clientHeight);
  pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.round(viewportWidth * pixelRatio);
  canvas.height = Math.round(viewportHeight * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function isSplitScreenActive() {
  return splitScreenMode && window.innerWidth >= 700;
}

function startMusicOnFirstInteraction() {
  if (!music.started && players.some((player) => !player.dead) && deathTimers.size === 0) {
    music.startRun(true);
  }
}

const keys = {};
window.addEventListener("keydown", (e) => {
  startMusicOnFirstInteraction();
  sfx.ensureCtx();
  keys[e.code] = true;
  if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === "KeyM" && !e.repeat) updateMuteButton(music.toggleMute());
  if (e.code === "KeyN" && !e.repeat) music.nextTrack();
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
window.addEventListener("pointerdown", (event) => {
  sfx.ensureCtx();
  if (isTouchDevice && event.pointerType === "touch" && respawnDeadPlayer()) return;
  startMusicOnFirstInteraction();
});
window.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
window.addEventListener("gesturestart", (event) => event.preventDefault(), { passive: false });
window.addEventListener("dblclick", (event) => event.preventDefault());

const isTouchDevice = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
if (isTouchDevice) document.body.classList.add("touch-device");

const pressedControls = {
  left: new Set(),
  right: new Set(),
  jump: new Set()
};
for (const button of document.querySelectorAll("[data-control]")) {
  const control = button.dataset.control;
  const release = (event) => {
    pressedControls[control].delete(event.pointerId);
    if (pressedControls[control].size === 0) button.classList.remove("is-pressed");
  };
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    pressedControls[control].add(event.pointerId);
    button.classList.add("is-pressed");
  });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}

function clearInputs() {
  for (const code of Object.keys(keys)) keys[code] = false;
  for (const pointers of Object.values(pressedControls)) pointers.clear();
  for (const button of document.querySelectorAll("[data-control]")) {
    button.classList.remove("is-pressed");
  }
}

window.addEventListener("blur", clearInputs);
document.addEventListener("visibilitychange", () => {
  music.onVisibilityChange();
  if (document.hidden) clearInputs();
});

function updateMuteButton(muted = music.muted) {
  const button = document.getElementById("btnMute");
  button.textContent = muted ? "🔇" : "🔊";
  button.setAttribute("aria-label", muted ? "Unmute music" : "Mute music");
  button.title = `${muted ? "Unmute" : "Mute"} music (M)`;
}

canvas.addEventListener("click", (e) => {
  if (!editor.enabled) return;
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left - canvas.clientLeft;
  const sy = e.clientY - rect.top - canvas.clientTop;
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
  const solidTiles = tiles.filter(
    (tile) => !traps.some((trap) => trap.type === "falling_floor" && aabb(tile, trap))
  );
  return {
    id: levelDef.id,
    name: levelDef.name,
    spawn,
    goal,
    initialGoal: { ...goal },
    tiles: solidTiles,
    traps
  };
}

function setupCameras(resetPlayers = false) {
  const split = isSplitScreenActive();
  const playerCount = split ? 2 : 1;
  const viewports = split
    ? [
        { x: 0, y: 0, w: viewportWidth, h: Math.floor(viewportHeight / 2) },
        { x: 0, y: Math.floor(viewportHeight / 2), w: viewportWidth, h: viewportHeight - Math.floor(viewportHeight / 2) }
      ]
    : [{ x: 0, y: 0, w: viewportWidth, h: viewportHeight }];

  if (resetPlayers || players.length === 0) {
    players = [new Player(levelState.spawn.x, levelState.spawn.y, PALETTE.player1, "P1")];
  }
  if (players.length > playerCount) players = players.slice(0, playerCount);
  if (players.length < playerCount) {
    players.push(new Player(levelState.spawn.x, levelState.spawn.y - 40, PALETTE.player2, "P2"));
  }

  if (resetPlayers || cameras.length !== viewports.length) {
    cameras = viewports.map((viewport) => new Camera(viewport, { zoom: split ? 0.92 : 1.0 }));
  } else {
    cameras.forEach((camera, index) => {
      camera.viewport = viewports[index];
    });
  }
}

function handleCanvasResize() {
  resizeCanvas();
  if (levelState) setupCameras();
}

window.addEventListener("resize", handleCanvasResize);
window.addEventListener("orientationchange", handleCanvasResize);
window.visualViewport?.addEventListener("resize", handleCanvasResize);

function loadLevel(idx) {
  currentLevelIdx = (idx + allLevels.length) % allLevels.length;
  levelState = buildLevelState(allLevels[currentLevelIdx]);
  deathTimers.clear();
  setupCameras(true);
  if (music.started && !music.runActive) music.startRun(true);
  document.getElementById("levelSelect").value = String(currentLevelIdx);
}

function restartLevel() {
  loadLevel(currentLevelIdx);
  music.startRun(true);
}

function clearPlayerInputs(playerIndex) {
  const codes = playerIndex === 0
    ? ["KeyA", "KeyD", "KeyW", "Space"]
    : ["ArrowLeft", "ArrowRight", "ArrowUp"];
  for (const code of codes) keys[code] = false;
  if (playerIndex === 0) {
    for (const pointers of Object.values(pressedControls)) pointers.clear();
    for (const button of document.querySelectorAll("[data-control]")) {
      button.classList.remove("is-pressed");
    }
  }
}

function resetAfterDeath(player, playerIndex) {
  const activatedTraps = levelState.traps.filter((trap) => trap.state !== "idle");
  if (activatedTraps.some((trap) => trap.type === "runaway_door")) {
    levelState.goal = { ...levelState.initialGoal };
  }
  if (activatedTraps.some((trap) => trap.type === "screen_flip") && cameras[0]) {
    cameras[0].flipped = false;
  }
  if (activatedTraps.some((trap) => trap.type === "reverse_gravity")) {
    for (const activePlayer of players) {
      activePlayer.gravityDir = 1;
      activePlayer.gravityOverrideTimer = 0;
    }
  }
  resetTriggeredTraps(levelState.traps);
  player.reset();
  clearPlayerInputs(playerIndex);
}

function respawnPlayer(player) {
  const playerIndex = players.indexOf(player);
  if (playerIndex < 0 || !deathTimers.has(player)) return false;
  deathTimers.delete(player);
  resetAfterDeath(player, playerIndex);
  music.startRun(true, true);
  return true;
}

function respawnDeadPlayer() {
  const player = players.find((candidate) => deathTimers.has(candidate));
  return player ? respawnPlayer(player) : false;
}

function updateTrackNotice() {
  const notice = document.getElementById("trackNotice");
  const text = music.getTrackNotice();
  notice.textContent = text;
  notice.hidden = !text;
}

function updateDeathTimers(dt, newlyDead) {
  for (const [player, remaining] of deathTimers) {
    if (newlyDead.has(player)) continue;
    const next = remaining - dt;
    if (next <= 0) respawnPlayer(player);
    else deathTimers.set(player, next);
  }
}

function drawDeathOverlays() {
  for (const [player] of deathTimers) {
    const viewport = cameras[players.indexOf(player)]?.viewport;
    if (!viewport) continue;
    const boxWidth = Math.min(360, viewport.w - 24);
    const boxHeight = 104;
    const x = viewport.x + (viewport.w - boxWidth) / 2;
    const y = viewport.y + (viewport.h - boxHeight) / 2;

    ctx.save();
    ctx.fillStyle = PALETTE.deathPanel;
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.strokeStyle = PALETTE.danger;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, boxWidth, boxHeight);
    ctx.textAlign = "center";
    ctx.fillStyle = PALETTE.danger;
    ctx.font = "bold 28px monospace";
    ctx.fillText("YOU DIED", viewport.x + viewport.w / 2, y + 42);
    ctx.font = "bold 16px monospace";
    ctx.fillText(`Deaths: ${deaths}`, viewport.x + viewport.w / 2, y + 74);
    ctx.restore();
  }
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
document.getElementById("btnMute").addEventListener("click", () => {
  updateMuteButton(music.toggleMute());
});
document.getElementById("btnNextSong").addEventListener("click", () => {
  startMusicOnFirstInteraction();
  music.nextTrack();
});
const fullscreenButton = document.getElementById("btnFullscreen");
fullscreenButton.addEventListener("click", () => {
  const request = document.fullscreenElement
    ? document.exitFullscreen?.()
    : document.documentElement.requestFullscreen?.();
  if (!request) {
    fullscreenButton.title = "Fullscreen is not supported by this browser";
    return;
  }
  request.catch((error) => {
    fullscreenButton.title = "Fullscreen request failed";
    console.error("Fullscreen request failed:", error);
  });
});
document.addEventListener("fullscreenchange", () => {
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");
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

resizeCanvas();
populateLevelSelect();
loadLevel(0);
updateMuteButton();

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
    left: Boolean(keys["KeyA"] || pressedControls.left.size),
    right: Boolean(keys["KeyD"] || pressedControls.right.size),
    jump: Boolean(keys["KeyW"] || keys["Space"] || pressedControls.jump.size)
  };
  const p2Controls = {
    left: Boolean(keys["ArrowLeft"]),
    right: Boolean(keys["ArrowRight"]),
    jump: Boolean(keys["ArrowUp"])
  };

  if (!editor.enabled) {
    const dynamicSolids = [
      ...levelState.tiles,
      ...levelState.traps
        .filter((trap) => trap.type === "falling_floor")
        .flatMap((trap) => trap.floorTiles.filter((tile) => tile.state === "intact"))
    ];

    if (players[0]) players[0].update(dt, p1Controls, dynamicSolids, sfx);
    if (players[1]) players[1].update(dt, p2Controls, dynamicSolids, sfx);

    updateTraps(dt, levelState.traps, players, levelState, cameras[0], sfx);

    const newlyDead = new Set();
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.dead) {
        if (!deathTimers.has(p)) {
          deaths++;
          sfx.play("death");
          deathTimers.set(p, 1);
          newlyDead.add(p);
          clearPlayerInputs(i);
          music.pauseRun();
        }
        continue;
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
    updateDeathTimers(dt, newlyDead);
  }

  for (let i = 0; i < cameras.length; i++) {
    const targetPlayer = players[i] || players[0];
    cameras[i].update(dt, targetPlayer);
  }

  ctx.clearRect(0, 0, viewportWidth, viewportHeight);

  for (let i = 0; i < cameras.length; i++) {
    renderWorldInCamera(ctx, cameras[i], levelState, players, elapsed);
  }

  renderMinimap(ctx, { x: viewportWidth - 210, y: 46, w: 196, h: 68 }, levelState, players);

  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, viewportWidth, 36);
  ctx.fillStyle = PALETTE.ui;
  ctx.font = "12px monospace";
  ctx.fillText(
    `${levelState.name} | Time: ${runTimer.toFixed(1)}s | Deaths: ${deaths} | ${
      isSplitScreenActive() ? "2P (WASD vs Arrows)" : "1P (WASD / Space)"
    }`,
    12,
    22
  );

  if (leaderboard.length > 0) {
    const best = leaderboard[0];
    ctx.fillStyle = PALETTE.exit;
    ctx.fillText(`Best: ${best.time}s (${best.deaths}d)`, Math.max(12, viewportWidth - 375), 22);
  }

  if (editor.enabled) {
    ctx.fillStyle = PALETTE.ui;
    ctx.fillText(
      `EDITOR ON [Tool: ${editor.tool}] — 1:Tile  2:FallFloor  3:Spike  4:Erase  E:Exit`,
      12,
      54
    );
  }

  drawDeathOverlays();
  updateTrackNotice();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
