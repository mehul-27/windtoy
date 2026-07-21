# windtoy

Browser-based 2D lattice Boltzmann fluid flow visualizer using TypeScript + WebGL2.

## Features

- D2Q9 BGK solver (CPU reference + GPU WebGL2 implementation with ping-pong FBOs)
- Obstacles: circle, flat plate, NACA0012 airfoil (angle-of-attack control)
- Bounce-back boundary condition on obstacle surfaces
- Free-slip top/bottom walls, fixed-velocity inlet, zero-gradient outlet
- Live lift/drag readout via momentum-exchange method
- Jet colormap velocity visualization

## Controls

| Control | Description |
|---------|-------------|
| ☰ toggle | Collapse / expand controls |
| ⏸ / ▶ | Pause / resume |
| ↺ | Reset simulation |
| Shape | Select circle, flat plate, or NACA airfoil |
| AoA | Angle of attack (−20° to 20°) |
| Inlet speed | Upstream velocity (0.01–0.25) |
| Reynolds # | Linked to speed + obstacle characteristic length |

## Build

```bash
npm install
npm run dev    # dev server
npm run build  # production build
npm test       # CPU solver validation
```

Grid: 200×80, default τ = 0.55, u_inlet = 0.1.
