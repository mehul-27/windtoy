import { createContext } from "./render/gl-context";
import { createPingPong } from "./render/ping-pong";
import {
  createCollideProgram,
  createStreamProgram,
  runCollide,
  runStream,
} from "./render/lbm-shader";
import { createDisplayProgram, runDisplay } from "./render/colormap-shader";
import { generateCircleMask } from "./shapes/rasterize";
import { generateFlatPlate, generateNACA0012 } from "./shapes/airfoil";
import { createControlsPanel, SimConfig, ShapeKind } from "./ui/controls-panel";
import { createReadoutPanel, updateReadout } from "./ui/readout-panel";
import { Q, E, W, CS2 } from "./solver/constants";

const NX = 200;
const NY = 80;
const CIRCLE_RADIUS = 12;
const CHORD = 24;
const SHAPE_CX = 55;
const SHAPE_CY = 40;
const MAX_SPEED = 0.25;
const STEPS_PER_FRAME = 5;

const canvas = document.getElementById("glcanvas") as HTMLCanvasElement;
const gl = createContext(canvas);

const collideProg = createCollideProgram(gl);
const streamProg = createStreamProgram(gl);
createDisplayProgram(gl);
const pp = createPingPong(gl, NX, NY);

let shapeKind: ShapeKind = "circle";
let aoaDeg = 0;
let solid = generateCircleMask(SHAPE_CX, SHAPE_CY, CIRCLE_RADIUS, NX, NY);
let solidTex = createSolidTexture(solid);

function createSolidTexture(solid: boolean[]): WebGLTexture {
  const t = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R8, NX, NY);
  const d = new Uint8Array(NX * NY);
  for (let i = 0; i < NX * NY; i++) d[i] = solid[i] ? 255 : 0;
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NX, NY, gl.RED, gl.UNSIGNED_BYTE, d);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function initTextures(uInlet: number): void {
  for (let t = 0; t < 3; t++) {
    gl.activeTexture(gl.TEXTURE0 + t);
    gl.bindTexture(gl.TEXTURE_2D, pp.read.tex[t]);
    const data = new Float32Array(NX * NY * 4);
    for (let y = 0; y < NY; y++) {
      for (let x = 0; x < NX; x++) {
        const off = (y * NX + x) * 4;
        for (let ch = 0; ch < 4; ch++) {
          const i = t * 4 + ch;
          if (i >= Q) { data[off + ch] = 0; continue; }
          const eiux = E[i][0] * uInlet + E[i][1] * 0;
          data[off + ch] =
            W[i] * 1.0 *
            (1 + eiux / CS2 + (eiux * eiux) / (2 * CS2 * CS2) - (uInlet * uInlet) / (2 * CS2));
        }
      }
    }
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NX, NY, gl.RGBA, gl.FLOAT, data);
  }
}

function regenerateSolid(): void {
  if (shapeKind === "circle") {
    solid = generateCircleMask(SHAPE_CX, SHAPE_CY, CIRCLE_RADIUS, NX, NY);
  } else if (shapeKind === "flat-plate") {
    solid = generateFlatPlate(SHAPE_CX, SHAPE_CY, CHORD, aoaDeg, NX, NY);
  } else {
    solid = generateNACA0012(SHAPE_CX, SHAPE_CY, CHORD, aoaDeg, NX, NY);
  }
  gl.activeTexture(gl.TEXTURE3);
  gl.deleteTexture(solidTex);
  solidTex = createSolidTexture(solid);
}

let uInlet = 0.1;
let tau = 0.55;
let omega = 1 / tau;

const config: SimConfig = {
  uInlet,
  tau,
  shapeKind,
  aoaDeg,
  shapeRadius: CIRCLE_RADIUS,
  onUpdate: () => {
    uInlet = config.uInlet;
    tau = config.tau;
    omega = 1 / tau;
    shapeKind = config.shapeKind;
    aoaDeg = config.aoaDeg;
    regenerateSolid();
    initTextures(uInlet);
  },
};

initTextures(uInlet);
document.body.appendChild(createControlsPanel(config));
document.body.appendChild(createReadoutPanel());

const tmpFb = gl.createFramebuffer()!;
const pixelBuf = new Float32Array(4);

function getF(x: number, y: number): Float64Array {
  const f = new Float64Array(Q);
  for (let t = 0; t < 3; t++) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, tmpFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pp.read.tex[t], 0);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.FLOAT, pixelBuf);
    for (let ch = 0; ch < 4; ch++) {
      const i = t * 4 + ch;
      if (i < Q) f[i] = pixelBuf[ch];
    }
  }
  return f;
}

function computeForces(): { drag: number; lift: number } {
  let fx = 0;
  let fy = 0;

  const extent = shapeKind === "circle" ? CIRCLE_RADIUS + 2 : CHORD / 2 + 4;
  const minX = Math.max(0, SHAPE_CX - extent);
  const maxX = Math.min(NX - 1, SHAPE_CX + extent);
  const minY = Math.max(0, SHAPE_CY - extent);
  const maxY = Math.min(NY - 1, SHAPE_CY + extent);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * NX + x;
      if (solid[idx]) continue;
      let isBoundary = false;
      for (let d = 0; d < 9; d++) {
        const nx2 = x + E[d][0];
        const ny2 = y + E[d][1];
        if (nx2 >= 0 && nx2 < NX && ny2 >= 0 && ny2 < NY && solid[ny2 * NX + nx2]) {
          isBoundary = true;
          break;
        }
      }
      if (!isBoundary) continue;

      const f = getF(x, y);
      let rho = 0;
      let ux = 0;
      let uy = 0;
      for (let d = 0; d < 9; d++) {
        rho += f[d];
        ux += f[d] * E[d][0];
        uy += f[d] * E[d][1];
      }
      if (rho <= 0) continue;
      ux /= rho;
      uy /= rho;
      const usq = ux * ux + uy * uy;

      for (let d = 0; d < 9; d++) {
        const nx2 = x + E[d][0];
        const ny2 = y + E[d][1];
        if (!(nx2 >= 0 && nx2 < NX && ny2 >= 0 && ny2 < NY && solid[ny2 * NX + nx2])) continue;
        const eiux = E[d][0] * ux + E[d][1] * uy;
        const feq = W[d] * rho * (1 + eiux / CS2 + (eiux * eiux) / (2 * CS2 * CS2) - usq / (2 * CS2));
        const fPost = f[d] + omega * (feq - f[d]);
        fx += 2 * fPost * E[d][0];
        fy += 2 * fPost * E[d][1];
      }
    }
  }

  return { drag: fx, lift: fy };
}

let frameCount = 0;

function resize(): void {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function frame(): void {
  resize();
  for (let s = 0; s < STEPS_PER_FRAME; s++) {
    runCollide(gl, collideProg, pp.read, pp.write, omega, NX, NY);
    runStream(gl, streamProg, pp.write, pp.read, uInlet, NX, NY, solidTex);
  }

  runDisplay(gl, pp.read, solidTex, NX, NY, canvas.width, canvas.height, MAX_SPEED);

  if (frameCount++ % 6 === 0) {
    const { drag, lift } = computeForces();
    updateReadout(drag, lift);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
