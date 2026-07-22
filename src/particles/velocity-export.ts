import { ensureQuad, compileShader, linkProgram } from "../render/lbm-shader";

const VEL_VS = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0, 1); }
`;

const VEL_FS = `#version 300 es
precision highp float;

uniform sampler2D u_f0;
uniform sampler2D u_f1;
uniform sampler2D u_f2;

out vec4 outColor;

const vec2 e[9] = vec2[9](
  vec2(0,0), vec2(1,0), vec2(0,1), vec2(-1,0), vec2(0,-1),
  vec2(1,1), vec2(-1,1), vec2(-1,-1), vec2(1,-1)
);

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 t0 = texelFetch(u_f0, p, 0);
  vec4 t1 = texelFetch(u_f1, p, 0);
  vec4 t2 = texelFetch(u_f2, p, 0);
  float f[9] = float[9](t0.x, t0.y, t0.z, t0.w, t1.x, t1.y, t1.z, t1.w, t2.x);

  float rho = 0.0;
  vec2 vel = vec2(0.0);
  for (int i = 0; i < 9; i++) { rho += f[i]; vel += f[i] * e[i]; }
  if (rho > 0.0) vel /= rho;

  outColor = vec4(vel.x, vel.y, length(vel), 0.0);
}
`;

let velProg: WebGLProgram | null = null;
let u_f0: WebGLUniformLocation | null = null;
let u_f1: WebGLUniformLocation | null = null;
let u_f2: WebGLUniformLocation | null = null;

export function createVelocityExportProgram(gl: WebGL2RenderingContext): void {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VEL_VS);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, VEL_FS);
  velProg = linkProgram(gl, vs, fs);
  u_f0 = gl.getUniformLocation(velProg, "u_f0");
  u_f1 = gl.getUniformLocation(velProg, "u_f1");
  u_f2 = gl.getUniformLocation(velProg, "u_f2");
}

function makeVelTex(gl: WebGL2RenderingContext, nx: number, ny: number): WebGLTexture {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, nx, ny);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

export interface VelExportBuffers {
  tex: [WebGLTexture, WebGLTexture];
  fbo: [WebGLFramebuffer, WebGLFramebuffer];
  readIdx: number;
  data: Float32Array;
}

export function createVelExportBuffers(gl: WebGL2RenderingContext, nx: number, ny: number): VelExportBuffers {
  const tex0 = makeVelTex(gl, nx, ny);
  const tex1 = makeVelTex(gl, nx, ny);

  const fbo0 = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex0, 0);

  const fbo1 = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo1);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex1, 0);

  return {
    tex: [tex0, tex1],
    fbo: [fbo0, fbo1],
    readIdx: 0,
    data: new Float32Array(nx * ny * 4),
  };
}

// Export velocity to the write buffer; readIdx toggles after each frame.
export function runVelocityExport(
  gl: WebGL2RenderingContext,
  buf: VelExportBuffers,
  ppRead: { tex: [WebGLTexture, WebGLTexture, WebGLTexture] },
  nx: number,
  ny: number,
): void {
  const writeIdx = 1 - buf.readIdx;
  gl.bindFramebuffer(gl.FRAMEBUFFER, buf.fbo[writeIdx]);
  gl.viewport(0, 0, nx, ny);
  gl.useProgram(velProg!);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ppRead.tex[0]);
  gl.uniform1i(u_f0!, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, ppRead.tex[1]);
  gl.uniform1i(u_f1!, 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, ppRead.tex[2]);
  gl.uniform1i(u_f2!, 2);

  gl.disable(gl.BLEND);
  const vao = ensureQuad(gl);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// Read back the PREVIOUS frame's velocity data (non-blocking for this frame).
export function readVelocityBack(
  gl: WebGL2RenderingContext,
  buf: VelExportBuffers,
  nx: number,
  ny: number,
): Float32Array {
  const readFbo = buf.fbo[buf.readIdx];
  gl.bindFramebuffer(gl.FRAMEBUFFER, readFbo);
  gl.readPixels(0, 0, nx, ny, gl.RGBA, gl.FLOAT, buf.data);
  buf.readIdx = 1 - buf.readIdx;
  return buf.data;
}
