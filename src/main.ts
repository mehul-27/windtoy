import { createContext } from "./render/gl-context";
import { createPingPong, PingPong } from "./render/ping-pong";
import {
  createCollideProgram,
  createStreamProgram,
  runCollide,
  runStream,
} from "./render/lbm-shader";
import { createState, step } from "./solver/lbm-cpu";
import { Q } from "./solver/constants";

const NX = 100;
const NY = 50;
const TAU = 0.6;
const U_INLET = 0.1;
const OMEGA = 1 / TAU;
const STEPS = 100;

function fillEquilibrium(
  gl: WebGL2RenderingContext,
  tex: WebGLTexture,
  texIdx: number,
  nx: number,
  ny: number,
  getVal: (x: number, y: number, i: number) => number,
): void {
  gl.activeTexture(gl.TEXTURE0 + texIdx);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const data = new Float32Array(nx * ny * 4);
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const off = (y * nx + x) * 4;
      data[off + 0] = getVal(x, y, texIdx * 4 + 0);
      data[off + 1] = getVal(x, y, texIdx * 4 + 1);
      data[off + 2] = getVal(x, y, texIdx * 4 + 2);
      data[off + 3] = getVal(x, y, texIdx * 4 + 3);
    }
  }
  gl.texSubImage2D(
    gl.TEXTURE_2D, 0, 0, 0, nx, ny, gl.RGBA, gl.FLOAT, data,
  );
}

function initGpuTextures(
  gl: WebGL2RenderingContext,
  pp: PingPong,
  nx: number,
  ny: number,
  uInlet: number,
): void {
  const state = createState(nx, ny, TAU, uInlet);
  const { f } = state;
  for (let t = 0; t < 3; t++) {
    fillEquilibrium(gl, pp.read.tex[t], t, nx, ny, (x, y, i) => {
      if (i < Q) return f[(y * nx + x) * Q + i];
      return 0;
    });
  }
}

function readBackF(
  gl: WebGL2RenderingContext,
  tex: [WebGLTexture, WebGLTexture, WebGLTexture],
  nx: number,
  ny: number,
): Float64Array {
  const result = new Float64Array(nx * ny * Q);
  const pixels = new Float32Array(nx * ny * 4);
  const fb = gl.createFramebuffer()!;

  for (let t = 0; t < 3; t++) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex[t], 0);
    gl.readPixels(0, 0, nx, ny, gl.RGBA, gl.FLOAT, pixels);

    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const srcOff = (y * nx + x) * 4;
        const dstOff = (y * nx + x) * Q + t * 4;
        result[dstOff + 0] = pixels[srcOff + 0];
        result[dstOff + 1] = pixels[srcOff + 1];
        result[dstOff + 2] = pixels[srcOff + 2];
        result[dstOff + 3] = pixels[srcOff + 3];
      }
    }
  }

  gl.deleteFramebuffer(fb);
  return result;
}

const canvas = document.getElementById("glcanvas") as HTMLCanvasElement;
canvas.width = NX;
canvas.height = NY;
const gl = createContext(canvas);

const collideProg = createCollideProgram(gl);
const streamProg = createStreamProgram(gl);
const pp = createPingPong(gl, NX, NY);
initGpuTextures(gl, pp, NX, NY, U_INLET);

for (let s = 0; s < STEPS; s++) {
  runCollide(gl, collideProg, pp.read, pp.write, OMEGA, NX, NY);
  runStream(gl, streamProg, pp.write, pp.read, U_INLET, NX, NY);
}

const gpuF = readBackF(gl, pp.read.tex, NX, NY);

const cpuState = createState(NX, NY, TAU, U_INLET);
for (let s = 0; s < STEPS; s++) {
  step(cpuState);
}

let maxDiff = 0;
for (let y = 0; y < NY; y++) {
  for (let x = 0; x < NX; x++) {
    const cpuIdx = (y * NX + x) * Q;
    for (let i = 0; i < Q; i++) {
      const diff = Math.abs(gpuF[cpuIdx + i] - cpuState.f[cpuIdx + i]);
      if (diff > maxDiff) maxDiff = diff;
    }
  }
}

const p = document.createElement("pre");
p.style.cssText = "position:fixed;bottom:0;left:0;color:lime;background:#000a;padding:8px;font:14px monospace;z-index:10";
const passed = maxDiff < 1e-4;
p.textContent = passed
  ? `Step 3 validation: PASSED (max diff = ${maxDiff.toExponential(3)} after ${STEPS} steps)`
  : `Step 3 validation: FAILED (max diff = ${maxDiff.toExponential(3)} after ${STEPS} steps, threshold = 1e-4)`;
p.style.color = passed ? "lime" : "red";
document.body.appendChild(p);
