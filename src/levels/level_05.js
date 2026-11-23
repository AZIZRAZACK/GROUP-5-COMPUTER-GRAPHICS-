export function createLevel05() {
  return {
    name: "1-5 MASTER OF THE ABYSS",
    isFinalLevel: true,
    spawn: { x: 60, y: 300 },
    // Starts as a bait goal near the end, then shifts when triggered
    goal: {
      x: 1140,
      y: 208,
      w: 32,
      h: 42,
      active: true,
      vx: 0,
      vy: 0
    },
    tiles: [
      { id: "l5_start", x: 0, y: 360, w: 230, h: 90, solid: true, color: "#3a3a4a", vy: 0 },
      { id: "l5_plat_1", x: 275, y: 335, w: 130, h: 22, solid: true, color: "#4a4a62", vy: 0 },
      { id: "l5_mid", x: 455, y: 360, w: 280, h: 90, solid: true, color: "#3a3a4a", vy: 0 },
      { id: "l5_plat_2", x: 785, y: 305, w: 150, h: 22, solid: true, color: "#4a4a62", vy: 0 },
      { id: "l5_final_ledge", x: 1065, y: 250, w: 145, h: 22, solid: true, color: "#3a3a4a", vy: 0 }
    ],
    spikes: [
      { id: "l5_spike_1", x: 545, y: 360, w: 30, h: 22, active: false, vy: 0, gravity: 0 },
      { id: "l5_spike_2", x: 645, y: 360, w: 30, h: 22, active: false, vy: 0, gravity: 0 },
      { id: "l5_rain_spike", x: 850, y: 100, w: 30, h: 22, active: false, vy: 0, gravity: 1050 },
      { id: "l5_goal_guard_spike", x: 1105, y: 95, w: 30, h: 22, active: false, vy: 0, gravity: 980 }
    ],
    triggers: [
      {
        id: "l5_trig_drop_1",
        x: 290, y: 240, w: 95, h: 95,
        fired: false,
        onEnter: ({ level, view, font }) => {
          font.spawnTaunt({ text: "MASTER TRIAL BEGINS", x: 240, y: 185, size: 14, color: "#fda4af" });
          setTimeout(() => {
            const p = level.tiles.find(t => t.id === "l5_plat_1");
            if (p) { p.solid = false; p.vy = 460; }
            view.triggerShake(0.25, 10);
          }, 210);
        }
      },
      {
        id: "l5_trig_gauntlet_and_text",
        x: 505, y: 220, w: 35, h: 140,
        fired: false,
        onEnter: ({ level, view, font }) => {
          const s1 = level.spikes.find(s => s.id === "l5_spike_1");
          const s2 = level.spikes.find(s => s.id === "l5_spike_2");
          if (s1) { s1.active = true; s1.y = 338; }
          if (s2) { s2.active = true; s2.y = 338; }
          font.swapToHorrorFont();
          font.spawnTaunt({ text: "DROP!", x: 600, y: 70, size: 28, color: "#ff2400", lethal: true });
          view.triggerShake(0.3, 12);
        }
      },
      {
        id: "l5_trig_chaos_and_flip",
        x: 805, y: 200, w: 80, h: 105,
        fired: false,
        onEnter: ({ level, view, clip, font }) => {
          const rain = level.spikes.find(s => s.id === "l5_rain_spike");
          if (rain) { rain.active = true; rain.vy = 160; }
          view.toggleFlip();
          clip.enableSpotlight(130);
          font.spawnTaunt({ text: "THE ABYSS FLIPS!", x: 780, y: 115, size: 18, color: "#facc15" });
          setTimeout(() => {
            const p2 = level.tiles.find(t => t.id === "l5_plat_2");
            if (p2) { p2.solid = false; p2.vy = 480; }
            view.triggerShake(0.25, 11);
          }, 250);
        }
      },
      {
        id: "l5_trig_final_bait",
        x: 1050, y: 170, w: 60, h: 80,
        fired: false,
        onEnter: ({ level, view, font }) => {
          const guard = level.spikes.find(s => s.id === "l5_goal_guard_spike");
          if (guard) {
            guard.active = true;
            guard.vy = 180;
          }
          // Shift goal slightly to punish rushing blindly
          level.goal.x = 1155;
          level.goal.y = 208;
          view.triggerShake(0.28, 12);
          font.spawnTaunt({ text: "ALMOST THERE...", x: 1020, y: 120, size: 15, color: "#4ade80" });
        }
      }
    ]
  };
}
