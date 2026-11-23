export function createLevel01() {
  return {
    name: "1-1 TRUST ISSUES",
    spawn: { x: 60, y: 300 },
    goal: { x: 1080, y: 318, w: 32, h: 42 },
    tiles: [
      { id: "floor_1", x: 0, y: 360, w: 320, h: 90, solid: true, color: "#3a3a4a" },
      { id: "fake_bridge", x: 320, y: 360, w: 140, h: 25, solid: true, color: "#3a3a4a" },
      { id: "floor_2", x: 460, y: 360, w: 320, h: 90, solid: true, color: "#3a3a4a" },
      { id: "invis_step", x: 830, y: 330, w: 100, h: 20, solid: true, color: "#3a3a4a" },
      { id: "floor_3", x: 980, y: 360, w: 220, h: 90, solid: true, color: "#3a3a4a" }
    ],
    spikes: [
      { id: "pop_spike", x: 620, y: 360, w: 30, h: 20, active: false }
    ],
    triggers: [
      {
        id: "trig_bridge",
        x: 315, y: 200, w: 20, h: 160,
        fired: false,
        onEnter: ({ level, view, font }) => {
          const bridge = level.tiles.find(t => t.id === "fake_bridge");
          bridge.solid = false;
          view.triggerShake(0.25, 10);
          font.spawnTaunt({ text: "WATCH YOUR STEP", x: 260, y: 210, size: 16 });
        }
      },
      {
        id: "trig_spike_and_font",
        x: 560, y: 200, w: 20, h: 160,
        fired: false,
        onEnter: ({ level, font }) => {
          const spike = level.spikes.find(s => s.id === "pop_spike");
          spike.active = true;
          spike.y = 340;
          font.swapToHorrorFont();
          font.spawnTaunt({ text: "DODGE THIS!", x: 660, y: 40, size: 28, lethal: true });
        }
      },
      {
        id: "trig_clip_and_flip",
        x: 760, y: 200, w: 20, h: 160,
        fired: false,
        onEnter: ({ view, clip }) => {
          clip.hideVisual("invis_step");
          clip.enableSpotlight(135);
          view.toggleFlip();
        }
      }
    ]
  };
}
