import { PALETTE } from "../engine/palette.js";

export function createLevel04() {
  return {
    name: "1-4 BLIND FAITH",
    spawn: { x: 60, y: 300 },
    goal: {
      x: 1130,
      y: 218,
      w: 32,
      h: 42,
      active: true,
      vx: 0,
      vy: 0
    },
    tiles: [
      { id: "l4_start", x: 0, y: 360, w: 250, h: 90, solid: true, color: PALETTE.tile, vy: 0 },
      { id: "l4_hidden_bridge", x: 295, y: 340, w: 145, h: 22, solid: true, color: PALETTE.tile, vy: 0 },
      { id: "l4_mid", x: 490, y: 360, w: 260, h: 90, solid: true, color: PALETTE.tile, vy: 0 },
      { id: "l4_drop_ledge", x: 800, y: 300, w: 155, h: 22, solid: true, color: PALETTE.tile, vy: 0 },
      { id: "l4_end_ledge", x: 1065, y: 260, w: 145, h: 22, solid: true, color: PALETTE.tile, vy: 0 }
    ],
    spikes: [
      { id: "l4_drop_spike", x: 865, y: 120, w: 30, h: 22, active: false, vy: 0, gravity: 950 },
      { id: "l4_mid_spike", x: 620, y: 360, w: 30, h: 22, active: false, vy: 0, gravity: 0 }
    ],
    triggers: [
      {
        id: "l4_trig_hide_and_spot",
        x: 245, y: 220, w: 30, h: 140,
        fired: false,
        onEnter: ({ clip, font }) => {
          clip.hideVisual("l4_hidden_bridge");
          clip.enableSpotlight(115);
          font.spawnTaunt({ text: "TRUST THE SPOTLIGHT", x: 210, y: 160, size: 15, color: PALETTE.player1 });
        }
      },
      {
        id: "l4_trig_mid_trap",
        x: 540, y: 240, w: 35, h: 120,
        fired: false,
        onEnter: ({ level, view, font }) => {
          const spike = level.spikes.find(s => s.id === "l4_mid_spike");
          if (spike) { spike.active = true; spike.y = 338; }
          view.triggerShake(0.25, 10);
          font.swapToHorrorFont();
          font.spawnTaunt({ text: "SURPRISE!", x: 550, y: 165, size: 24, color: PALETTE.danger });
        }
      },
      {
        id: "l4_trig_ledge_collapse",
        x: 820, y: 210, w: 80, h: 90,
        fired: false,
        onEnter: ({ level, view, font }) => {
          const dropSpike = level.spikes.find(s => s.id === "l4_drop_spike");
          if (dropSpike) { dropSpike.active = true; dropSpike.vy = 150; }
          font.spawnTaunt({ text: "TOO SLOW", x: 810, y: 145, size: 16, color: PALETTE.exit });
          setTimeout(() => {
            const ledge = level.tiles.find(t => t.id === "l4_drop_ledge");
            if (ledge) {
              ledge.solid = false;
              ledge.vy = 460;
            }
            view.triggerShake(0.25, 10);
          }, 230);
        }
      }
    ]
  };
}
