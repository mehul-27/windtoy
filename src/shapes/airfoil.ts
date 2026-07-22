import { HALF_DIAG } from "./rasterize";

// Single shared rotation: rotate point around pivot (cx,cy) by AoA.
// toLocal=true:  (px,py) in grid coords → returns (lx,ly) in local coords relative to pivot
// toLocal=false: (lx,ly) in local coords relative to pivot → returns (px,py) in grid coords
function rotatePivot(
  px: number, py: number,
  cx: number, cy: number,
  cosA: number, sinA: number,
  toLocal: boolean,
): [number, number] {
  if (toLocal) {
    const dx = px - cx;
    const dy = py - cy;
    return [dx * cosA + dy * sinA, -dx * sinA + dy * cosA];
  }
  return [px * cosA - py * sinA + cx, px * sinA + py * cosA + cy];
}

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
      const [lx, ly] = rotatePivot(x, y, cx, cy, cosA, sinA, true);
      if (Math.abs(lx) <= halfChord && Math.abs(ly) <= halfThick) {
        solid[y * nx + x] = true;
      }
    }
  }
  return solid;
}

function nacaHalfThickness(xc: number, chord: number): number {
  return 0.6 * chord * (
    0.2969 * Math.sqrt(xc)
    - 0.1260 * xc
    - 0.3516 * xc * xc
    + 0.2843 * xc * xc * xc
    - 0.1015 * xc * xc * xc * xc
  );
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

  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const [lx0, ly] = rotatePivot(x, y, cx, cy, cosA, sinA, true);
      const lx = lx0 + chord * 0.25;
      if (lx < 0 || lx > chord) continue;
      const yt = nacaHalfThickness(lx / chord, chord);
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
  const pts: [number, number][] = [];

  // Upper surface: LE → TE
  for (let i = 0; i <= n; i++) {
    const xc = i / n;
    const yt = nacaHalfThickness(xc, chord);
    const [gx, gy] = rotatePivot(
      xc * chord - chord * 0.25, yt,
      cx, cy, cosA, sinA, false,
    );
    pts.push([gx, gy]);
  }
  // Lower surface: TE → LE
  for (let i = n; i >= 0; i--) {
    const xc = i / n;
    const yt = nacaHalfThickness(xc, chord);
    const [gx, gy] = rotatePivot(
      xc * chord - chord * 0.25, -yt,
      cx, cy, cosA, sinA, false,
    );
    pts.push([gx, gy]);
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
  return corners.map(([lx, ly]) =>
    rotatePivot(lx, ly, cx, cy, cosA, sinA, false),
  );
}
