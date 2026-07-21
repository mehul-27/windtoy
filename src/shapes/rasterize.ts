export const HALF_DIAG = Math.SQRT2 / 2;

export function generateCircleMask(
  cx: number,
  cy: number,
  radius: number,
  nx: number,
  ny: number,
): boolean[] {
  const mask = new Array<boolean>(nx * ny).fill(false);
  const r2 = (radius + HALF_DIAG) * (radius + HALF_DIAG);
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        mask[y * nx + x] = true;
      }
    }
  }
  return mask;
}
