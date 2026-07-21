import { describe, it, expect } from "vitest";
import { createState, step, macroscopic, computeForces } from "./lbm-cpu";
import { generateCircleMask } from "../shapes/rasterize";
import { generateNACA0012 } from "../shapes/airfoil";

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

describe("Cylinder wake", () => {
  const NX = 120;
  const NY = 50;
  const CX = 35;
  const CY = 25;
  const RADIUS = 8;

  it(
    "low Re steady symmetric wake (§9 test 2)",
    () => {
      const TAU = 0.6;
      const U_INLET = 0.03;
      const state = createState(NX, NY, TAU, U_INLET);
      const solid = generateCircleMask(CX, CY, RADIUS, NX, NY);
      const probeX = CX + RADIUS + 20;
      const probeY = CY;

      for (let s = 0; s < 2000; s++) {
        step(state, solid);
      }

      const { uy: uy1 } = macroscopic(state, probeX, probeY);
      const { uy: uy2 } = macroscopic(state, probeX, probeY - 6);
      const { uy: uy3 } = macroscopic(state, probeX, probeY + 6);

      expect(Math.abs(uy1)).toBeLessThan(0.01);
      expect(uy2 * uy3).toBeGreaterThan(-0.001);
    },
    120_000,
  );

  it(
    "high Re vortex shedding (§9 test 3)",
    () => {
      const TAU = 0.55;
      const U_INLET = 0.1;
      const state = createState(NX, NY, TAU, U_INLET);
      const solid = generateCircleMask(CX, CY, RADIUS, NX, NY);
      const probeX = CX + RADIUS + 20;
      const probeY = CY;

      for (let s = 0; s < 3000; s++) {
        step(state, solid);
      }

      let signChanges = 0;
      let prevSign = 0;
      for (let s = 0; s < 800; s++) {
        step(state, solid);
        const { uy } = macroscopic(state, probeX, probeY);
        const sign = Math.sign(uy);
        if (prevSign !== 0 && sign !== 0 && sign !== prevSign) {
          signChanges++;
        }
        prevSign = sign;
      }

      expect(signChanges).toBeGreaterThan(2);
    },
    180_000,
  );
});

describe("NACA airfoil lift", () => {
  const NX = 120;
  const NY = 50;
  const CX = 35;
  const CY = 25;
  const CHORD = 24;

  it(
    "lift increases with angle of attack (§9 test 4)",
    () => {
      const TAU = 0.6;
      const U_INLET = 0.05;
      const STEPS = 4000;

      const lifts: number[] = [];
      for (const aoa of [2, 6, 10]) {
        const state = createState(NX, NY, TAU, U_INLET);
        const solid = generateNACA0012(CX, CY, CHORD, aoa, NX, NY);
        for (let s = 0; s < STEPS; s++) {
          step(state, solid);
        }
        const { lift } = computeForces(state, solid);
        lifts.push(lift);
      }

      expect(lifts[0]).toBeGreaterThan(0);
      expect(lifts[2]).toBeGreaterThan(lifts[1]);
      expect(lifts[1]).toBeGreaterThan(lifts[0]);
    },
    300_000,
  );
});
