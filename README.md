# windtoy

A 2D browser-based wind tunnel / flow visualizer using the Lattice Boltzmann
Method (D2Q9, BGK). Built with TypeScript + WebGL2.

> **Qualitative, physically-motivated flow visualizer — not validated CFD.**
> The simulation captures the correct *shape* of the flow (stagnation point,
> wake, vortex shedding, separation) but does not produce correct real-world
> numbers.

Inspired by [kutta](https://github.com/crgimenes/kutta).

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Test

```bash
npm test
```
