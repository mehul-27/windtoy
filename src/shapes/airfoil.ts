export function generateFlatPlate(
  cx: number, cy: number,
  chord: number, aoaDeg: number,
  nx: number, ny: number, thickness = 2,
): boolean[] {
  const solid = new Array(nx * ny).fill(false);
  const aoa = aoaDeg * Math.PI / 180;
  const cosA = Math.cos(aoa);
  const sinA = Math.sin(aoa);
  const halfChord = chord / 2;
  const halfThick = thickness / 2;

  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const lx = dx * cosA + dy * sinA;
      const ly = -dx * sinA + dy * cosA;
      if (Math.abs(lx) <= halfChord && Math.abs(ly) <= halfThick) {
        solid[y * nx + x] = true;
      }
    }
  }
  return solid;
}

export function generateNACA0012(
  cx: number, cy: number,
  chord: number, aoaDeg: number,
  nx: number, ny: number,
): boolean[] {
  const solid = new Array(nx * ny).fill(false);
  const aoa = aoaDeg * Math.PI / 180;
  const cosA = Math.cos(aoa);
  const sinA = Math.sin(aoa);
  const t = 0.12;
  const factor = 5 * t;

  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const lx = dx * cosA + dy * sinA + chord / 2;
      const ly = -dx * sinA + dy * cosA;
      if (lx < 0 || lx > chord) continue;
      const xc = lx / chord;
      const yt = factor * chord * (
        0.2969 * Math.sqrt(xc)
        - 0.1260 * xc
        - 0.3516 * xc * xc
        + 0.2843 * xc * xc * xc
        - 0.1015 * xc * xc * xc * xc
      );
      if (Math.abs(ly) <= yt) {
        solid[y * nx + x] = true;
      }
    }
  }
  return solid;
}
