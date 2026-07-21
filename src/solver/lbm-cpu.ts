import { Q, E, W, CS2, OPPOSITE, REFLECT_Y } from "./constants";

export interface LBMState {
  f: Float64Array;
  nx: number;
  ny: number;
  tau: number;
  uInlet: number;
}

function idx(nx: number, x: number, y: number, i: number): number {
  return (y * nx + x) * Q + i;
}

export function createState(
  nx: number,
  ny: number,
  tau: number,
  uInlet: number,
): LBMState {
  const f = new Float64Array(nx * ny * Q);
  const state: LBMState = { f, nx, ny, tau, uInlet };
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      setEquilibrium(state, x, y, 1.0, uInlet, 0);
    }
  }
  return state;
}

export function setEquilibrium(
  { f, nx }: LBMState,
  x: number,
  y: number,
  rho: number,
  ux: number,
  uy: number,
): void {
  const usq = ux * ux + uy * uy;
  for (let i = 0; i < Q; i++) {
    const eiux = E[i][0] * ux + E[i][1] * uy;
    const feq =
      W[i] *
      rho *
      (1 + eiux / CS2 + (eiux * eiux) / (2 * CS2 * CS2) - usq / (2 * CS2));
    f[idx(nx, x, y, i)] = feq;
  }
}

export function macroscopic(
  { f, nx }: LBMState,
  x: number,
  y: number,
): { rho: number; ux: number; uy: number } {
  let rho = 0;
  let ux = 0;
  let uy = 0;
  for (let i = 0; i < Q; i++) {
    const fi = f[idx(nx, x, y, i)];
    rho += fi;
    ux += fi * E[i][0];
    uy += fi * E[i][1];
  }
  ux /= rho;
  uy /= rho;
  return { rho, ux, uy };
}

export function step(state: LBMState, solid?: boolean[]): void {
  const { f, nx, ny, tau, uInlet } = state;
  const omega = 1 / tau;
  const fPost = new Float64Array(nx * ny * Q);

  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      if (solid && solid[y * nx + x]) continue;
      const { rho, ux, uy } = macroscopic(state, x, y);
      const usq = ux * ux + uy * uy;
      for (let i = 0; i < Q; i++) {
        const eiux = E[i][0] * ux + E[i][1] * uy;
        const feq =
          W[i] *
          rho *
          (1 + eiux / CS2 + (eiux * eiux) / (2 * CS2 * CS2) - usq / (2 * CS2));
        fPost[idx(nx, x, y, i)] = f[idx(nx, x, y, i)] + omega * (feq - f[idx(nx, x, y, i)]);
      }
    }
  }

  const fNew = new Float64Array(nx * ny * Q);

  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      if (solid && solid[y * nx + x]) continue;
      for (let i = 0; i < Q; i++) {
        const nx2 = x + E[i][0];
        const ny2 = y + E[i][1];
        if (solid && nx2 >= 0 && nx2 < nx && ny2 >= 0 && ny2 < ny && solid[ny2 * nx + nx2]) {
          const opp = OPPOSITE[i];
          fNew[idx(nx, x, y, opp)] += fPost[idx(nx, x, y, i)];
        } else if (nx2 >= 0 && nx2 < nx && ny2 >= 0 && ny2 < ny) {
          fNew[idx(nx, nx2, ny2, i)] += fPost[idx(nx, x, y, i)];
        }
      }
    }
  }

  for (let y = 0; y < ny; y++) {
    setEquilibrium({ f: fNew, nx }, 0, y, 1.0, uInlet, 0);
  }

  for (let y = 0; y < ny; y++) {
    for (let i = 0; i < Q; i++) {
      fNew[idx(nx, nx - 1, y, i)] = fNew[idx(nx, nx - 2, y, i)];
    }
  }

  for (let x = 0; x < nx; x++) {
    const missingBottom = [2, 5, 6];
    const missingTop = [4, 7, 8];
    for (const ri of missingBottom) {
      fNew[idx(nx, x, 0, ri)] = fNew[idx(nx, x, 0, REFLECT_Y[ri])];
    }
    for (const ri of missingTop) {
      fNew[idx(nx, x, ny - 1, ri)] = fNew[idx(nx, x, ny - 1, REFLECT_Y[ri])];
    }
  }

  state.f.set(fNew);
}
