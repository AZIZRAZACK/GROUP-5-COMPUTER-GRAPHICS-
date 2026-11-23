export function createLevel03() {
  return {
    name: "1-3 FALLING WORDS",
    spawn: { x: 60, y: 300 },
    goal: {
      x: 1125,
      y: 238,
      w: 32,
      h: 42,
      active: true,
      vx: 0,
      vy: 0
    },
    tiles: [
      { id: "l3_start", x: 0, y: 360, w: 270, h: 90, solid: true, color: "#3a3a4a", vy: 0 },
      { id: "l3_bridge_1", x: 315, y: 335, w: 135, h: 22, solid: true, color: "#4a4a62", vy: 0 },
      { id: "l3_mid", x: 500, y: 360, w: 290, h: 90, solid: true, color: "#3a3a4a", vy: 0 },
      { id: "l3_upper_step", x: 840, y: 295, w: 150, h: 22, solid: true, color: "#3a3a4a", vy: 0 },
      { id: "l3_goal_ledge", x: 1060, y: 280, w: 140, h: 22, solid: true, color: "#3a3a4a", vy: 0 }
    ],
    spikes: [
      { id: "l3_spike_1", x: 610, y: 360, w: 30, h: 22, active: false, vy: 0, gravity: 0 },
      { id: "l3_spike_2", x: 710, y: 360, w: 30, h: 22, active: false, vy: 0, gravity: 0 }
    ],
    triggers: [
      {
        id: "l3_trig_lethal_text",
        x: 330, y: 220, w: 100, h: 115,
        fired: false,
        onEnter: ({ font, view }) => {
          font.swapToHorrorFont();
          font.spawnTaunt({ text: "CRUSH!", x: 345, y: 80, size: 26, color: "#ff2400", lethal: true });
          view.triggerShake(0.25, 8);
        }
      },
      {
        id: "l3_trig_double_spike",
        x: 555, y: 240, w: 35, h: 120,
        fired: false,
        onEnter: ({ level, view, font }) => {
          const s1 = level.spikes.find(s => s.id === "l3_spike_1");
          const s2 = level.spikes.find(s => s.id === "l3_spike_2");
          if (s1) { s1.active = true; s1.y = 338; }
          if (s2) { s2.active = true; s2.y = 338; }
          view.triggerShake(0.22, 9);
          font.spawnTaunt({ text: "TWO OF THEM", x: 560, y: 165, size: 20, color: "#facc15" });
        }
      },
      {
        id: "l3_trig_flip_spotlight",
        x: 800, y: 210, w: 35, h: 150,
        fired: false,
        onEnter: ({ view, clip, font }) => {
          view.toggleFlip();
          clip.enableSpotlight(135);
          font.spawnTaunt({ text: "UPSIDE DOWN DREAD", x: 790, y: 120, size: 18, color: "#fb7185" });
        }
      }
    ]
  };
}
