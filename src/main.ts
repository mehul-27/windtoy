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
import { Q, E, W, CS2 } from "./solver/constants";

const NX = 200;
const NY = 80;

const TAU = 0.55;
const OMEGA = 1 / TAU;
const U_INLET = 0.1;
const MAX_SPEED = 0.25;

function fillEq(texture: WebGLTexture, texIdx: number, uInlet: number): void {
  gl.activeTexture(gl.TEXTURE0 + texIdx);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const data = new Float32Array(NX * NY * 4);
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const off = (y * NX + x) * 4;
      const ux = uInlet;
      const uy = 0;
      const usq = ux * ux + uy * uy;
      for (let ch = 0; ch < 4; ch++) {
        const i = texIdx * 4 + ch;
        if (i >= Q) { data[off + ch] = 0; continue; }
        const eiux = E[i][0] * ux + E[i][1] * uy;
        data[off + ch] =
          W[i] * 1.0 *
          (1 + eiux / CS2 + (eiux * eiux) / (2 * CS2 * CS2) - usq / (2 * CS2));
      }
    }
  }
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NX, NY, gl.RGBA, gl.FLOAT, data);
}

const canvas = document.getElementById("glcanvas") as HTMLCanvasElement;
const gl = createContext(canvas);

const collideProg = createCollideProgram(gl);
const streamProg = createStreamProgram(gl);
createDisplayProgram(gl);

const pp = createPingPong(gl, NX, NY);

for (let t = 0; t < 3; t++) {
  fillEq(pp.read.tex[t], t, U_INLET);
}

const solid = generateCircleMask(50, 40, 12, NX, NY);

const solidTex = gl.createTexture()!;
gl.activeTexture(gl.TEXTURE3);
gl.bindTexture(gl.TEXTURE_2D, solidTex);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R8, NX, NY);
const solidData = new Uint8Array(NX * NY);
for (let i = 0; i < NX * NY; i++) solidData[i] = solid[i] ? 255 : 0;
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NX, NY, gl.RED, gl.UNSIGNED_BYTE, solidData);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

function resize(): void {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

const STEPS_PER_FRAME = 5;

function frame(): void {
  resize();

  for (let s = 0; s < STEPS_PER_FRAME; s++) {
    runCollide(gl, collideProg, pp.read, pp.write, OMEGA, NX, NY);
    runStream(gl, streamProg, pp.write, pp.read, U_INLET, NX, NY, solidTex);
  }

  runDisplay(
    gl, pp.read, solidTex, NX, NY,
    canvas.width, canvas.height, MAX_SPEED,
  );

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
