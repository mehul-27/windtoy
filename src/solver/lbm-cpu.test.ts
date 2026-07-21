import { describe, it, expect } from "vitest";
import { createState, step, macroscopic } from "./lbm-cpu";

describe("CPU reference solver", () => {
  const NX = 50;
  const NY = 25;
  const TAU = 0.6;
  const U_INLET = 0.1;
  const STEPS = 200;

  it(
    "uniform flow stays uniform with no obstacle (§9 test 1)",
    () => {
      const state = createState(NX, NY, TAU, U_INLET);
      for (let s = 0; s < STEPS; s++) {
        step(state);
      }

      let maxRhoErr = 0;
      let maxUxErr = 0;
      let maxUyErr = 0;

      for (let y = 0; y < NY; y++) {
        for (let x = 0; x < NX; x++) {
          const { rho, ux, uy } = macroscopic(state, x, y);
          maxRhoErr = Math.max(maxRhoErr, Math.abs(rho - 1));
          maxUxErr = Math.max(maxUxErr, Math.abs(ux - U_INLET));
          maxUyErr = Math.max(maxUyErr, Math.abs(uy - 0));
        }
      }

      expect(maxRhoErr).toBeLessThan(1e-10);
      expect(maxUxErr).toBeLessThan(1e-10);
      expect(maxUyErr).toBeLessThan(1e-10);
    },
    30_000,
  );
});
