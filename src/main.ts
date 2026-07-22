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
import { generateFlatPlate, generateNACA0012, getNACAOutlinePoints, getFlatPlateOutlinePoints } from "./shapes/airfoil";
import { createControlsPanel, SimConfig, ShapeKind } from "./ui/controls-panel";
import { createReadoutPanel, updateReadout } from "./ui/readout-panel";
import { Q, E, W, CS2 } from "./solver/constants";

const NX = 400;
const NY = 150;
const CIRCLE_RADIUS = 24;
const CHORD = 48;
const SHAPE_CX = 110;
const SHAPE_CY = 75;
const MAX_SPEED = 0.25;
const STEPS_PER_FRAME = 5;

const canvas = document.getElementById("glcanvas") as HTMLCanvasElement;
const vecCanvas = document.getElementById("vec-canvas") as HTMLCanvasElement;
const vctx = vecCanvas.getContext("2d")!;
const gl = createContext(canvas);

const collideProg = createCollideProgram(gl);
const streamProg = createStreamProgram(gl);
createDisplayProgram(gl);
const pp = createPingPong(gl, NX, NY);

let shapeKind: ShapeKind = "circle";
let aoaDeg = 0;
let solid = generateCircleMask(SHAPE_CX, SHAPE_CY, CIRCLE_RADIUS, NX, NY);
let solidTex = createSolidTexture(solid, gl.NEAREST);
let solidTexDisplay = createSolidTexture(solid, gl.LINEAR);

function createSolidTexture(solid: boolean[], filter: number): WebGLTexture {
  const t = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R8, NX, NY);
  const d = new Uint8Array(NX * NY);
  for (let i = 0; i < NX * NY; i++) d[i] = solid[i] ? 255 : 0;
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NX, NY, gl.RED, gl.UNSIGNED_BYTE, d);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
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
  gl.deleteTexture(solidTexDisplay);
  solidTex = createSolidTexture(solid, gl.NEAREST);
  solidTexDisplay = createSolidTexture(solid, gl.LINEAR);
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

const ctrlPanel = createControlsPanel(config);
document.body.appendChild(ctrlPanel);
document.body.appendChild(createReadoutPanel(MAX_SPEED));
initTextures(uInlet);

(window as any).__resetSim = () => {
  initTextures(uInlet);
  frameCount = 0;
};

document.addEventListener("keydown", (ev: KeyboardEvent) => {
  if (ev.key === " " || ev.key === "p") {
    ev.preventDefault();
    const p = (ctrlPanel as any).__paused;
    if (p) {
      p.value = !p.value;
      const btn = document.getElementById("btn-pause");
      if (btn) btn.textContent = p.value ? "▶" : "⏸";
    }
  } else if (ev.key === "ArrowUp") {
    ev.preventDefault();
    config.aoaDeg = Math.min(20, config.aoaDeg + 1);
    config.onUpdate();
  } else if (ev.key === "ArrowDown") {
    ev.preventDefault();
    config.aoaDeg = Math.max(-20, config.aoaDeg - 1);
    config.onUpdate();
  } else if (ev.key === "r") {
    (window as any).__resetSim?.();
  } else if (ev.key === "[") {
    config.uInlet = Math.max(0.01, config.uInlet - 0.01);
    config.onUpdate();
  } else if (ev.key === "]") {
    config.uInlet = Math.min(0.25, config.uInlet + 0.01);
    config.onUpdate();
  }
});

const tmpFb = gl.createFramebuffer()!;
let frameCount = 0;
let paused = false;

function computeForces(): { drag: number; lift: number } {
  let fx = 0, fy = 0;
  const extent = shapeKind === "circle" ? CIRCLE_RADIUS + 2 : CHORD / 2 + 4;
  const minX = Math.max(0, SHAPE_CX - extent);
  const maxX = Math.min(NX - 1, SHAPE_CX + extent);
  const minY = Math.max(0, SHAPE_CY - extent);
  const maxY = Math.min(NY - 1, SHAPE_CY + extent);
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const bufSize = bw * bh * 4;
  const texData = [new Float32Array(bufSize), new Float32Array(bufSize), new Float32Array(bufSize)];
  for (let t = 0; t < 3; t++) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, tmpFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pp.read.tex[t], 0);
    gl.readPixels(minX, minY, bw, bh, gl.RGBA, gl.FLOAT, texData[t]);
  }
  const allF = new Float32Array(Q);
  for (let y = minY; y <= maxY; y++) {
    const yOff = (y - minY) * bw * 4;
    for (let x = minX; x <= maxX; x++) {
      const idx = y * NX + x;
      if (solid[idx]) continue;
      for (let t = 0; t < 3; t++) {
        const base = yOff + (x - minX) * 4;
        for (let ch = 0; ch < 4; ch++) {
          const i = t * 4 + ch;
          if (i < Q) allF[i] = texData[t][base + ch];
        }
      }
      let isBoundary = false;
      for (let d = 0; d < 9; d++) {
        const nx2 = x + E[d][0], ny2 = y + E[d][1];
        if (nx2 >= 0 && nx2 < NX && ny2 >= 0 && ny2 < NY && solid[ny2 * NX + nx2]) {
          isBoundary = true; break;
        }
      }
      if (!isBoundary) continue;
      let rho = 0, ux = 0, uy = 0;
      for (let d = 0; d < 9; d++) { rho += allF[d]; ux += allF[d] * E[d][0]; uy += allF[d] * E[d][1]; }
      if (rho <= 0) continue;
      ux /= rho; uy /= rho;
      const usq = ux * ux + uy * uy;
      for (let d = 0; d < 9; d++) {
        const nx2 = x + E[d][0], ny2 = y + E[d][1];
        if (!(nx2 >= 0 && nx2 < NX && ny2 >= 0 && ny2 < NY && solid[ny2 * NX + nx2])) continue;
        const eiux = E[d][0] * ux + E[d][1] * uy;
        const feq = W[d] * rho * (1 + eiux / CS2 + (eiux * eiux) / (2 * CS2 * CS2) - usq / (2 * CS2));
        const fPost = allF[d] + omega * (feq - allF[d]);
        fx += 2 * fPost * E[d][0];
        fy += 2 * fPost * E[d][1];
      }
    }
  }
  return { drag: fx, lift: -fy };
}

function resizeVecCanvas(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (vecCanvas.width !== w || vecCanvas.height !== h) {
    vecCanvas.width = w;
    vecCanvas.height = h;
  }
}

let lastDrag = 0;
let lastLift = 0;
const SCALE = 3;

function gx(x: number): number { return (x / NX) * vecCanvas.width; }
function gy(y: number): number { return (y / NY) * vecCanvas.height; }

function drawShapeOutline(): void {
  vctx.save();
  if (shapeKind === "circle") {
    const cx = gx(SHAPE_CX), cy = gy(SHAPE_CY);
    const r = (CIRCLE_RADIUS / NX) * vecCanvas.width;
    vctx.beginPath();
    vctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else if (shapeKind === "flat-plate") {
    const pts = getFlatPlateOutlinePoints(SHAPE_CX, SHAPE_CY, CHORD, aoaDeg);
    vctx.beginPath();
    const s = pts.map(([px, py]) => [gx(px), gy(py)] as [number, number]);
    vctx.moveTo(s[0][0], s[0][1]);
    for (let i = 1; i < s.length; i++) vctx.lineTo(s[i][0], s[i][1]);
    vctx.closePath();
  } else {
    const pts = getNACAOutlinePoints(SHAPE_CX, SHAPE_CY, CHORD, aoaDeg, 60);
    const s = pts.map(([px, py]) => [gx(px), gy(py)] as [number, number]);
    vctx.beginPath();
    vctx.moveTo(s[0][0], s[0][1]);
    for (let i = 1; i < s.length; i++) vctx.lineTo(s[i][0], s[i][1]);
    vctx.closePath();
  }
  vctx.fillStyle = "rgba(64,64,66,0.85)";
  vctx.strokeStyle = "rgba(255,255,255,0.6)";
  vctx.lineWidth = 1.5;
  vctx.fill();
  vctx.stroke();
  vctx.restore();
}

function drawVectors(drag: number, lift: number): void {
  resizeVecCanvas();
  vctx.clearRect(0, 0, vecCanvas.width, vecCanvas.height);

  drawShapeOutline();

  const ox = gx(SHAPE_CX);
  const oy = gy(SHAPE_CY);

  const maxF = Math.max(1, Math.abs(drag), Math.abs(lift));
  const ld = (drag / maxF) * 60 * SCALE;
  const ll = -(lift / maxF) * 60 * SCALE;

  const arrow = (fromX: number, fromY: number, toX: number, toY: number, color: string): void => {
    const headLen = 8;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    vctx.strokeStyle = color;
    vctx.lineWidth = 2;
    vctx.beginPath();
    vctx.moveTo(fromX, fromY);
    vctx.lineTo(toX, toY);
    vctx.stroke();
    vctx.beginPath();
    vctx.moveTo(toX, toY);
    vctx.lineTo(toX - headLen * Math.cos(angle - 0.4), toY - headLen * Math.sin(angle - 0.4));
    vctx.lineTo(toX - headLen * Math.cos(angle + 0.4), toY - headLen * Math.sin(angle + 0.4));
    vctx.closePath();
    vctx.fillStyle = color;
    vctx.fill();
  };

  arrow(ox, oy, ox + ld, oy, "#7fc8f8");
  arrow(ox, oy, ox, oy + ll, "#f8a07c");

  vctx.fillStyle = "rgba(127,200,248,0.7)";
  vctx.font = "11px -apple-system,BlinkMacSystemFont,sans-serif";
  vctx.fillText(`D ${drag.toFixed(4)}`, ox + ld + 8, oy + 4);
  vctx.fillStyle = "rgba(248,160,124,0.7)";
  vctx.fillText(`L ${lift.toFixed(4)}`, ox + 8, oy + ll + 4);
}

function resize(): void {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function frame(): void {
  paused = (ctrlPanel as any).__paused.value;
  resize();
  if (!paused) {
    for (let s = 0; s < STEPS_PER_FRAME; s++) {
      runCollide(gl, collideProg, pp.read, pp.write, omega, NX, NY);
      runStream(gl, streamProg, pp.write, pp.read, uInlet, NX, NY, solidTex);
    }
  }

  runDisplay(gl, pp.read, solidTexDisplay, NX, NY, canvas.width, canvas.height, MAX_SPEED);

  if (frameCount++ > 60 && frameCount % 6 === 0) {
    const { drag, lift } = computeForces();
    lastDrag = drag; lastLift = lift;
    updateReadout(drag, lift);
  }

  drawVectors(lastDrag, lastLift);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
