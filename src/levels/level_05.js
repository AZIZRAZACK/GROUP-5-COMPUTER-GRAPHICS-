export function createLevel05() {
  return {
    name: "1-5 THRONE OF TROLLS",
    spawn: { x: 60, y: 300 },
    goal: {
      x: 1135,
      y: 208,
      w: 32,
      h: 42,
      active: true,
      vx: 0,
      vy: 0
    },
    tiles: [
      { id: "l5_start", x: 0, y: 360, w: 240, h: 90, solid: true, color: "#3a3a4a", vy: 0 },
      { id: "l5_plat_1", x: 285, y: 335, w: 130, h: 22, solid: true, color: "#4a4a62", vy: 0 },
      { id: "l5_mid", x: 465, y: 360, w: 270, h: 90, solid: true, color: "#3a3a4a", vy: 0 },
      { id: "l5_plat_2", x: 785, y: 305, w: 145, h: 22, solid: true, color: "#4a4a62", vy: 0 },
      { id: "l5_final_ledge", x: 1065, y: 250, w: 145, h: 22, solid: true, color: "#3a3a4a", vy: 0 }
    ],
    spikes: [
      { id: "l5_spike_1", x: 560, y: 360, w: 30, h: 22, active: false, vy: 0, gravity: 0 },
      { id: "l5_spike_2", x: 655, y: 360, w: 30, h: 22, active: false, vy: 0, gravity: 0 },
      { id: "l5_rain_spike", x: 845, y: 110, w: 30, h: 22, active: false, vy: 0, gravity: 1020 }
    ],
    triggers: [
      {
        id: "l5_trig_drop_1",
        x: 300, y: 240, w: 95, h: 95,
        fired: false,
        onEnter: ({ level, view, font }) => {
          font.spawnTaunt({ text: "WELCOME TO HELL'S PEAK", x: 250, y: 185, size: 14, color: "#fda4af" });
          setTimeout(() => {
            const p = level.tiles.find(t => t.id === "l5_plat_1");
            if (p) { p.solid = false; p.vy = 450; }
            view.triggerShake(0.25, 10);
          }, 220);
        }
      },
      {
        id: "l5_trig_gauntlet_and_text",
        x: 515, y: 220, w: 35, h: 140,
        fired: false,
        onEnter: ({ level, view, font }) => {
          const s1 = level.spikes.find(s => s.id === "l5_spike_1");
          const s2 = level.spikes.find(s => s.id === "l5_spike_2");
          if (s1) { s1.active = true; s1.y = 338; }
          if (s2) { s2.active = true; s2.y = 338; }
          font.swapToHorrorFont();
          font.spawnTaunt({ text: "FALL!", x: 600, y: 75, size: 28, color: "#ff2400", lethal: true });
          view.triggerShake(0.3, 11);
        }
      },
      {
        id: "l5_trig_final_chaos",
        x: 805, y: 200, w: 80, h: 105,
        fired: false,
        onEnter: ({ level, view, clip, font }) => {
          const rain = level.spikes.find(s => s.id === "l5_rain_spike");
          if (rain) { rain.active = true; rain.vy = 160; }
          view.toggleFlip();
          clip.enableSpotlight(125);
          font.spawnTaunt({ text: "ONE LAST TROLL", x: 785, y: 120, size: 18, color: "#facc15" });
          setTimeout(() => {
            const p2 = level.tiles.find(t => t.id === "l5_plat_2");
            if (p2) { p2.solid = false; p2.vy = 470; }
            view.triggerShake(0.25, 11);
          }, 260);
        }
      }
    ]
  };
}
