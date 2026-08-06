/**
 * Simple Canvas QR Code matrix renderer for Hacker House Goa 2026 Badges
 * Renders a stylized, scannable-style QR pattern onto a canvas 2D context.
 */

export function drawQrCode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fgColor: string = "#0B5C36",
  bgColor: string = "#FFFFFF"
) {
  ctx.save();

  // Background box
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, size, size);

  ctx.strokeStyle = fgColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, size, size);

  const gridSize = 21;
  const cellSize = size / gridSize;

  ctx.fillStyle = fgColor;

  // Helper to draw finder pattern (top-left, top-right, bottom-left)
  const drawFinder = (fx: number, fy: number) => {
    ctx.fillRect(fx, fy, cellSize * 7, cellSize * 7);
    ctx.fillStyle = bgColor;
    ctx.fillRect(fx + cellSize, fy + cellSize, cellSize * 5, cellSize * 5);
    ctx.fillStyle = fgColor;
    ctx.fillRect(fx + cellSize * 2, fy + cellSize * 2, cellSize * 3, cellSize * 3);
  };

  // Draw 3 Position Finder Patterns
  drawFinder(x, y); // Top Left
  drawFinder(x + (gridSize - 7) * cellSize, y); // Top Right
  drawFinder(x, y + (gridSize - 7) * cellSize); // Bottom Left

  // Deterministic data cell pattern simulation for aesthetic QR structure
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Skip finder pattern zones
      if (r < 8 && c < 8) continue;
      if (r < 8 && c >= gridSize - 8) continue;
      if (r >= gridSize - 8 && c < 8) continue;

      // Deterministic pseudorandom fill based on grid coordinates
      const bit = ((r * 13 + c * 7 + (r ^ c) * 3) % 5) < 3;
      if (bit) {
        ctx.fillRect(
          x + Math.floor(c * cellSize),
          y + Math.floor(r * cellSize),
          Math.ceil(cellSize),
          Math.ceil(cellSize)
        );
      }
    }
  }

  ctx.restore();
}
