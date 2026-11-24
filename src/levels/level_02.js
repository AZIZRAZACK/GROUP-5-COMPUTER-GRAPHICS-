import { PALETTE } from "../engine/palette.js";

export function createLevel02() {
  return {
    name: "1-2 INFERNAL DETOUR",
    spawn: { x: 60, y: 300 },
    goal: {
      x: 1120,
      y: 238,
      w: 32,
      h: 42,
      active: true,
      vx: 0,
      vy: 0
    },
    tiles: [
      { id: "l2_start", x: 0, y: 360, w: 260, h: 90, solid: true, color: PALETTE.tile, vy: 0 },
      { id: "l2_vanish_plat", x: 310, y: 330, w: 140, h: 22, solid: true, color: PALETTE.tile, vy: 0 },
      { id: "l2_mid", x: 500, y: 360, w: 270, h: 90, solid: true, color: PALETTE.tile, vy: 0 },
      { id: "l2_high_ledge", x: 820, y: 290, w: 160, h: 22, solid: true, color: PALETTE.tile, vy: 0 },
      { id: "l2_end_ledge", x: 1050, y: 280, w: 150, h: 22, solid: true, color: PALETTE.tile, vy: 0 }
    ],
    spikes: [
      { id: "l2_ceil_spike", x: 365, y: 120, w: 30, h: 22, active: false, vy: 0, gravity: 900 },
      { id: "l2_floor_spike", x: 650, y: 360, w: 30, h: 22, active: false, vy: 0, gravity: 0 }
    ],
    triggers: [
      {
        id: "l2_trig_drop",
        x: 325, y: 240, w: 100, h: 90,
        fired: false,
        onEnter: ({ level, view, font }) => {
          font.spawnTaunt({ text: "LOOK UP", x: 330, y: 190, size: 16, color: PALETTE.danger });
          const ceilSpike = level.spikes.find(s => s.id === "l2_ceil_spike");
          if (ceilSpike) {
            ceilSpike.active = true;
            ceilSpike.vy = 120;
          }
          setTimeout(() => {
            const plat = level.tiles.find(t => t.id === "l2_vanish_plat");
            if (plat) {
              plat.solid = false;
              plat.vy = 450;
            }
            view.triggerShake(0.25, 9);
          }, 220);
        }
      },
      {
        id: "l2_trig_spike",
        x: 580, y: 240, w: 30, h: 120,
        fired: false,
        onEnter: ({ level, clip, font }) => {
          const spike = level.spikes.find(s => s.id === "l2_floor_spike");
          spike.active = true;
          spike.y = 338;
          clip.enableSpotlight(130);
          font.swapToHorrorFont();
          font.spawnTaunt({ text: "NO MERCY", x: 585, y: 165, size: 24, lethal: false });
        }
      }
    ]
  };
}
