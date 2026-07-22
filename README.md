# windtoy

Browser-based 2D lattice Boltzmann fluid flow visualizer. GPU-accelerated
(D2Q9 BGK solver via WebGL2) with live force readout, blur-enhanced colormap,
velocity streak particles, and a draggable obstacle.

https://github.com/user-attachments/assets/… — demo

## Features

- **D2Q9 BGK solver** — collide-and-stream on GPU (WebGL2 ping-pong FBOs),
  CPU reference implementation for validation
- **Obstacles** — circle, flat plate, NACA0012 airfoil with live angle-of-attack
  (arrow keys or slider)
- **Draggable obstacle** — click and drag any shape around the domain; the
  simulation responds in real time without resetting the flow field
- **Bounce-back** — no-slip boundary condition on obstacle surfaces
- **Boundary conditions** — free-slip top/bottom walls, fixed-velocity inlet,
  zero-gradient outlet
- **Live lift/drag** — momentum-exchange force integration, updated every 6 frames
- **Velocity colormap** — jet-like palette with dual separable Gaussian blur
  (tight + wide composite) and saturation boost
- **Particle streaks** — 800 advective tracer particles with velocity-direction
  streaks, motion-blur fade via linear gradient, dark outline for contrast
  across all flow speeds
- **Controls** — collapsible glass-morphism panel, keyboard shortcuts

## Controls

| Control | Description |
|---------|-------------|
| ☰ / ✕ | Expand / collapse panel |
| ⏸ / ▶ (Space/P) | Pause / resume |
| ↺ (R) | Reset simulation (reinitializes flow + resets position) |
| Shape | Circle, flat plate, or NACA0012 airfoil |
| AoA (↑/↓) | Angle of attack (−20° to 20°) |
| Speed ([/]) | Inlet velocity (0.01–0.15) |
| Re | Reynolds number (linked to speed × chord) |
| Particles | Toggle velocity streak overlay |
| **Drag obstacle** | Click anywhere on the shape and drag — cursor changes to grab |

## Build

```bash
npm install
npm run dev      # dev server (hot reload)
npm run build    # production build → dist/
npm test         # CPU solver validation (vitest)
```

Grid: 400×150, τ = 0.55, u_inlet = 0.01–0.15.

## Credits

Inspired by [kutta](https://github.com/crgimenes/kutta) — a Go-based 2D LBM
solver that served as the reference for this project's physics.
