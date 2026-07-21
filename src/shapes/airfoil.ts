import { HALF_DIAG } from "./rasterize";

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
  const halfThick = thickness / 2 + HALF_DIAG;

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
      const lx = dx * cosA + dy * sinA + chord * 0.25;
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
      if (Math.abs(ly) <= yt + HALF_DIAG) {
        solid[y * nx + x] = true;
      }
    }
  }
  return solid;
}

export function getNACAOutlinePoints(
  cx: number, cy: number,
  chord: number, aoaDeg: number,
  n: number,
): [number, number][] {
  const aoa = aoaDeg * Math.PI / 180;
  const cosA = Math.cos(aoa);
  const sinA = Math.sin(aoa);
  const t = 0.12;
  const factor = 5 * t;
  const pts: [number, number][] = [];
  const nacaY = (xc: number) => factor * chord * (
    0.2969 * Math.sqrt(xc)
    - 0.1260 * xc
    - 0.3516 * xc * xc
    + 0.2843 * xc * xc * xc
    - 0.1015 * xc * xc * xc * xc
  );

  // Upper surface: LE → TE
  for (let i = 0; i <= n; i++) {
    const xc = i / n;
    const yt = nacaY(xc);
    const lx = xc * chord - chord * 0.25;
    const ly = yt;
    pts.push([lx * cosA - ly * sinA + cx, lx * sinA + ly * cosA + cy]);
  }
  // Lower surface: TE → LE
  for (let i = n; i >= 0; i--) {
    const xc = i / n;
    const yt = nacaY(xc);
    const lx = xc * chord - chord * 0.25;
    const ly = -yt;
    pts.push([lx * cosA - ly * sinA + cx, lx * sinA + ly * cosA + cy]);
  }
  return pts;
}

export function getFlatPlateOutlinePoints(
  cx: number, cy: number,
  chord: number, aoaDeg: number,
): [number, number][] {
  const aoa = aoaDeg * Math.PI / 180;
  const cosA = Math.cos(aoa);
  const sinA = Math.sin(aoa);
  const halfChord = chord / 2;
  const h = 1.5;
  const corners: [number, number][] = [
    [-halfChord, -h],
    [halfChord, -h],
    [halfChord, h],
    [-halfChord, h],
  ];
  return corners.map(([lx, ly]) => [
    lx * cosA - ly * sinA + cx,
    lx * sinA + ly * cosA + cy,
  ]);
}
