import { Q, E, W, CS2, OPPOSITE, REFLECT_Y } from "./constants";

export interface LBMState {
  f: Float64Array;
  _fPost: Float64Array;
  _fNew: Float64Array;
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
  const cellCount = nx * ny * Q;
  const f = new Float64Array(cellCount);
  const state: LBMState = {
    f,
    _fPost: new Float64Array(cellCount),
    _fNew: new Float64Array(cellCount),
    nx,
    ny,
    tau,
    uInlet,
  };
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      setEquilibrium(state, x, y, 1.0, uInlet, 0);
    }
  }
  return state;
}

export function setEquilibrium(
  { f, nx }: { f: Float64Array; nx: number },
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

function fillEq(
  f: Float64Array,
  nx: number,
  x: number,
  y: number,
  rho: number,
  ux: number,
  uy: number,
): void {
  const usq = ux * ux + uy * uy;
  for (let i = 0; i < Q; i++) {
    const eiux = E[i][0] * ux + E[i][1] * uy;
    f[idx(nx, x, y, i)] =
      W[i] *
      rho *
      (1 + eiux / CS2 + (eiux * eiux) / (2 * CS2 * CS2) - usq / (2 * CS2));
  }
}

export function step(state: LBMState, solid?: boolean[]): void {
  const { f, _fPost: fPost, _fNew: fNew, nx, ny, tau, uInlet } = state;
  const omega = 1 / tau;
  const ncells = nx * ny * Q;

  for (let i = 0; i < ncells; i++) fNew[i] = 0;

  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      if (solid && solid[y * nx + x]) continue;
      let rho = 0;
      let ux = 0;
      let uy = 0;
      for (let d = 0; d < Q; d++) {
        const fi = f[idx(nx, x, y, d)];
        rho += fi;
        ux += fi * E[d][0];
        uy += fi * E[d][1];
      }
      ux /= rho;
      uy /= rho;
      const usq = ux * ux + uy * uy;
      for (let d = 0; d < Q; d++) {
        const eiux = E[d][0] * ux + E[d][1] * uy;
        const feq =
          W[d] * rho *
          (1 + eiux / CS2 + (eiux * eiux) / (2 * CS2 * CS2) - usq / (2 * CS2));
        fPost[idx(nx, x, y, d)] = f[idx(nx, x, y, d)] + omega * (feq - f[idx(nx, x, y, d)]);
      }
    }
  }

  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      if (solid && solid[y * nx + x]) continue;
      for (let d = 0; d < Q; d++) {
        const nx2 = x + E[d][0];
        const ny2 = y + E[d][1];
        if (solid && nx2 >= 0 && nx2 < nx && ny2 >= 0 && ny2 < ny && solid[ny2 * nx + nx2]) {
          fNew[idx(nx, x, y, OPPOSITE[d])] += fPost[idx(nx, x, y, d)];
        } else if (nx2 >= 0 && nx2 < nx && ny2 >= 0 && ny2 < ny) {
          fNew[idx(nx, nx2, ny2, d)] += fPost[idx(nx, x, y, d)];
        }
      }
    }
  }

  for (let y = 0; y < ny; y++) {
    fillEq(fNew, nx, 0, y, 1.0, uInlet, 0);
  }

  for (let y = 0; y < ny; y++) {
    const dstOff = y * nx + (nx - 1);
    const srcOff = y * nx + (nx - 2);
    for (let d = 0; d < Q; d++) {
      fNew[dstOff * Q + d] = fNew[srcOff * Q + d];
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

  state._fNew = state.f;
  state.f = fNew;
}

export function computeForces(state: LBMState, solid: boolean[]): { drag: number; lift: number } {
  const { f, nx, ny, tau } = state;
  const omega = 1 / tau;
  let fx = 0, fy = 0;
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const ci = y * nx + x;
      if (solid[ci]) continue;
      let isBoundary = false;
      for (let d = 0; d < Q; d++) {
        const nx2 = x + E[d][0], ny2 = y + E[d][1];
        if (nx2 >= 0 && nx2 < nx && ny2 >= 0 && ny2 < ny && solid[ny2 * nx + nx2]) {
          isBoundary = true; break;
        }
      }
      if (!isBoundary) continue;
      let rho = 0, ux = 0, uy = 0;
      for (let d = 0; d < Q; d++) {
        const fi = f[idx(nx, x, y, d)];
        rho += fi; ux += fi * E[d][0]; uy += fi * E[d][1];
      }
      if (rho <= 0) continue;
      ux /= rho; uy /= rho;
      const usq = ux * ux + uy * uy;
      for (let d = 0; d < Q; d++) {
        const nx2 = x + E[d][0], ny2 = y + E[d][1];
        if (!(nx2 >= 0 && nx2 < nx && ny2 >= 0 && ny2 < ny && solid[ny2 * nx + nx2])) continue;
        const eiux = E[d][0] * ux + E[d][1] * uy;
        const feq = W[d] * rho * (1 + eiux / CS2 + (eiux * eiux) / (2 * CS2 * CS2) - usq / (2 * CS2));
        const fPost = f[idx(nx, x, y, d)] + omega * (feq - f[idx(nx, x, y, d)]);
        fx += 2 * fPost * E[d][0];
        fy += 2 * fPost * E[d][1];
      }
    }
  }
  return { drag: fx, lift: -fy };
}
