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
import { createControlsPanel, SimConfig } from "./ui/controls-panel";
import { Q, E, W, CS2 } from "./solver/constants";

const NX = 200;
const NY = 80;
const CIRCLE_RADIUS = 12;
const MAX_SPEED = 0.25;
const STEPS_PER_FRAME = 5;

const canvas = document.getElementById("glcanvas") as HTMLCanvasElement;
const gl = createContext(canvas);

const collideProg = createCollideProgram(gl);
const streamProg = createStreamProgram(gl);
createDisplayProgram(gl);
const pp = createPingPong(gl, NX, NY);

let solid = generateCircleMask(50, 40, CIRCLE_RADIUS, NX, NY);
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

let uInlet = 0.1;
let tau = 0.55;
let omega = 1 / tau;

const config: SimConfig = {
  uInlet,
  tau,
  shapeRadius: CIRCLE_RADIUS,
  onUpdate: () => {
    uInlet = config.uInlet;
    tau = config.tau;
    omega = 1 / tau;
    initTextures(uInlet);
  },
};

initTextures(uInlet);
document.body.appendChild(createControlsPanel(config));

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
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
