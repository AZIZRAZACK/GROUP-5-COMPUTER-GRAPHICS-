export class ClipSlot {
  constructor() {
    this.spotlightActive = false;
    this.spotlightRadius = 120;
    this.hiddenTileIds = new Set();
  }

  reset() {
    this.spotlightActive = false;
    this.spotlightRadius = 120;
    this.hiddenTileIds.clear();
  }

  enableSpotlight(radius = 110) {
    this.spotlightActive = true;
    this.spotlightRadius = radius;
  }

  hideVisual(tileId) {
    this.hiddenTileIds.add(tileId);
  }

  applyMask(ctx, player, viewSlot) {
    if (!this.spotlightActive) return;

    ctx.beginPath();
    const screenX = player.x + player.w / 2 - viewSlot.x;
    const screenY = viewSlot.flipped
      ? viewSlot.height - (player.y + player.h / 2)
      : player.y + player.h / 2;

    ctx.arc(screenX, screenY, this.spotlightRadius, 0, Math.PI * 2);
    ctx.clip();
  }

  shouldRender(tile) {
    return !this.hiddenTileIds.has(tile.id);
  }
}
