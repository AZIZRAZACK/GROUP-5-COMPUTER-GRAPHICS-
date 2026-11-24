import { PALETTE } from "../engine/palette.js";

export function createLevel01() {
  return {
    name: "1-1 DEFINITELY THE EXIT",
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
      { id: "start_floor", x: 0, y: 360, w: 280, h: 90, solid: true, color: PALETTE.tile, vy: 0 },
      { id: "delay_drop_plat", x: 320, y: 340, w: 130, h: 22, solid: true, color: PALETTE.tile, vy: 0 },
      { id: "mid_floor", x: 500, y: 360, w: 260, h: 90, solid: true, color: PALETTE.tile, vy: 0 },
      { id: "bait_ledge", x: 810, y: 310, w: 170, h: 22, solid: true, color: PALETTE.tile, vy: 0 },
      { id: "real_goal_ledge", x: 1060, y: 280, w: 140, h: 22, solid: true, color: PALETTE.tile, vy: 0 }
    ],
    spikes: [
      { id: "bait_drop_spike", x: 890, y: 210, w: 30, h: 22, active: false, vy: 0, gravity: 980 },
      { id: "mid_pop_spike", x: 630, y: 360, w: 30, h: 22, active: false, vy: 0, gravity: 0 }
    ],
    triggers: [
      {
        id: "trig_delay_drop",
        x: 340, y: 260, w: 90, h: 80,
        fired: false,
        onEnter: ({ level, view, font }) => {
          font.spawnTaunt({ text: "COMPLETELY STABLE", x: 295, y: 235, size: 14, color: PALETTE.uiMuted });
          setTimeout(() => {
            const plat = level.tiles.find(t => t.id === "delay_drop_plat");
            if (plat) {
              plat.solid = false;
              plat.vy = 420;
            }
            view.triggerShake(0.22, 8);
          }, 260);
        }
      },
      {
        id: "trig_mid_troll",
        x: 560, y: 240, w: 30, h: 120,
        fired: false,
        onEnter: ({ level, font, view }) => {
          const spike = level.spikes.find(s => s.id === "mid_pop_spike");
          spike.active = true;
          spike.y = 338;
          view.triggerShake(0.2, 7);
          font.swapToHorrorFont();
          font.spawnTaunt({ text: "DIDN'T SEE THAT", x: 540, y: 175, size: 22, lethal: false });
        }
      },
      {
        id: "trig_fake_goal_bait",
        x: 845, y: 210, w: 70, h: 100,
        fired: false,
        onEnter: ({ level, font, view, clip }) => {
          const dropSpike = level.spikes.find(s => s.id === "bait_drop_spike");
          dropSpike.active = true;
          dropSpike.vy = 140;

          // Move the goal away to the real ledge and flip the view as a late-stage troll
          level.goal.x = 1120;
          level.goal.y = 238;

          view.triggerShake(0.3, 11);
          view.toggleFlip();
          clip.enableSpotlight(155);
          font.spawnTaunt({ text: "SIKE! KEEP GOING", x: 790, y: 120, size: 15, color: PALETTE.exit });
        }
      }
    ]
  };
}
