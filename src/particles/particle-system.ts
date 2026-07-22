import { NX, NY } from "../solver/constants";

const COUNT = 800;
const SPEED_SCALE = 1;

const COLORMAP_STOPS: [number, number, number][] = [
  [0.127, 0.050, 0.162],
  [0.220, 0.404, 0.792],
  [0.262, 0.714, 0.761],
  [0.358, 0.904, 0.494],
  [0.710, 0.957, 0.207],
  [0.970, 0.657, 0.122],
  [0.838, 0.118, 0.069],
];

function colormap(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t)) * 6;
  const i = Math.floor(t);
  const f = t - i;
  const a = COLORMAP_STOPS[i];
  const b = COLORMAP_STOPS[Math.min(i + 1, 6)];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

export interface Particle {
  x: number;
  y: number;
}

export class ParticleSystem {
  particles: Particle[] = [];
  private fieldX = new Float32Array(NX * NY);
  private fieldY = new Float32Array(NX * NY);

  constructor() {
    this.particles = new Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      this.particles[i] = this.spawn((i / COUNT) * NX);
    }
  }

  private spawn(x = 0): Particle {
    const y = Math.random() * NY;
    return { x, y };
  }

  // Feed raw RGBA32F data from readPixels (strides of 4 floats per cell).
  setVelocityField(data: Float32Array): void {
    for (let i = 0; i < NX * NY; i++) {
      const off = i * 4;
      this.fieldX[i] = isFinite(data[off]) ? data[off] : 0;
      this.fieldY[i] = isFinite(data[off + 1]) ? data[off + 1] : 0;
    }
  }

  private sampleVx(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ix1 = Math.min(ix + 1, NX - 1);
    const iy1 = Math.min(iy + 1, NY - 1);
    return (
      this.fieldX[iy * NX + ix] * (1 - fx) * (1 - fy) +
      this.fieldX[iy * NX + ix1] * fx * (1 - fy) +
      this.fieldX[iy1 * NX + ix] * (1 - fx) * fy +
      this.fieldX[iy1 * NX + ix1] * fx * fy
    );
  }

  private sampleVy(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ix1 = Math.min(ix + 1, NX - 1);
    const iy1 = Math.min(iy + 1, NY - 1);
    return (
      this.fieldY[iy * NX + ix] * (1 - fx) * (1 - fy) +
      this.fieldY[iy * NX + ix1] * fx * (1 - fy) +
      this.fieldY[iy1 * NX + ix] * (1 - fx) * fy +
      this.fieldY[iy1 * NX + ix1] * fx * fy
    );
  }

  update(solid: boolean[]): void {
    for (const p of this.particles) {
      if (!isFinite(p.x) || !isFinite(p.y)) {
        Object.assign(p, this.spawn());
        continue;
      }

      let gx = Math.floor(p.x);
      let gy = Math.floor(p.y);
      gx = Math.max(0, Math.min(NX - 1, gx));
      gy = Math.max(0, Math.min(NY - 1, gy));

      if (solid[gy * NX + gx]) {
        Object.assign(p, this.spawn());
        continue;
      }

      const ux = this.sampleVx(p.x, p.y);
      const uy = this.sampleVy(p.x, p.y);
      if (!isFinite(ux) || !isFinite(uy)) {
        Object.assign(p, this.spawn());
        continue;
      }
      p.x += ux * SPEED_SCALE;
      p.y += uy * SPEED_SCALE;

      if (p.x < 0 || p.x >= NX || p.y < 0 || p.y >= NY) {
        Object.assign(p, this.spawn());
      }
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    gx: (x: number) => number,
    gy: (y: number) => number,
    maxSpeed: number,
    vw: number,
    vh: number,
  ): void {
    const VISUAL_LENGTH = 14;
    const PX_PER_CELL_X = vw / NX;
    const PX_PER_CELL_Y = vh / NY;
    ctx.lineCap = 'round';
    for (const p of this.particles) {
      const ex = gx(p.x), ey = gy(p.y);
      const ux = this.sampleVx(p.x, p.y);
      const uy = this.sampleVy(p.x, p.y);
      if (!isFinite(ux) || !isFinite(uy) || (Math.abs(ux) < 1e-8 && Math.abs(uy) < 1e-8)) continue;
      const dx = ux * PX_PER_CELL_X;
      const dy = -uy * PX_PER_CELL_Y;
      const d = Math.hypot(dx, dy);
      const nx = dx / d, ny = dy / d;
      const sx = ex - nx * VISUAL_LENGTH;
      const sy = ey - ny * VISUAL_LENGTH;
      const spd = Math.hypot(ux, uy);
      const t = Math.min(spd / maxSpeed, 1);
      const [r, g, b] = colormap(t);
      const alpha = Math.min(0.3 + t * 0.5, 0.8);

      const og = ctx.createLinearGradient(ex, ey, sx, sy);
      og.addColorStop(0, 'rgba(0,0,0,0.35)');
      og.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = og;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(sx, sy);
      ctx.stroke();

      const cg = ctx.createLinearGradient(ex, ey, sx, sy);
      cg.addColorStop(0, `rgba(${r * 255 | 0},${g * 255 | 0},${b * 255 | 0},${alpha})`);
      cg.addColorStop(1, `rgba(${r * 255 | 0},${g * 255 | 0},${b * 255 | 0},0)`);
      ctx.strokeStyle = cg;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
  }
}
