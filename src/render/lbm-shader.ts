const COLLIDE_VS = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0, 1); }
`;

const COLLIDE_FS = `#version 300 es
precision highp float;

uniform sampler2D u_f0;
uniform sampler2D u_f1;
uniform sampler2D u_f2;
uniform float u_omega;

layout(location = 0) out vec4 out0;
layout(location = 1) out vec4 out1;
layout(location = 2) out vec4 out2;

const float CS2 = 1.0 / 3.0;
const float w[9] = float[9](4.0/9.0, 1.0/9.0, 1.0/9.0, 1.0/9.0, 1.0/9.0, 1.0/36.0, 1.0/36.0, 1.0/36.0, 1.0/36.0);
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
  for (int i = 0; i < 9; i++) {
    rho += f[i];
    vel += f[i] * e[i];
  }
  vel /= rho;

  float usq = dot(vel, vel);
  float feq[9];
  for (int i = 0; i < 9; i++) {
    float eiux = dot(e[i], vel);
    feq[i] = w[i] * rho * (1.0 + eiux / CS2 + (eiux * eiux) / (2.0 * CS2 * CS2) - usq / (2.0 * CS2));
  }

  out0 = vec4(
    f[0] + u_omega * (feq[0] - f[0]),
    f[1] + u_omega * (feq[1] - f[1]),
    f[2] + u_omega * (feq[2] - f[2]),
    f[3] + u_omega * (feq[3] - f[3])
  );
  out1 = vec4(
    f[4] + u_omega * (feq[4] - f[4]),
    f[5] + u_omega * (feq[5] - f[5]),
    f[6] + u_omega * (feq[6] - f[6]),
    f[7] + u_omega * (feq[7] - f[7])
  );
  out2 = vec4(
    f[8] + u_omega * (feq[8] - f[8]),
    0, 0, 0
  );
}
`;

const STREAM_VS = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0, 1); }
`;

const STREAM_FS = `#version 300 es
precision highp float;

uniform sampler2D u_f0;
uniform sampler2D u_f1;
uniform sampler2D u_f2;
uniform sampler2D u_solid;
uniform float u_uInlet;
uniform ivec2 u_gridSize;

layout(location = 0) out vec4 out0;
layout(location = 1) out vec4 out1;
layout(location = 2) out vec4 out2;

const float CS2 = 1.0 / 3.0;
const float w[9] = float[9](4.0/9.0, 1.0/9.0, 1.0/9.0, 1.0/9.0, 1.0/9.0, 1.0/36.0, 1.0/36.0, 1.0/36.0, 1.0/36.0);
const vec2 e[9] = vec2[9](
  vec2(0,0), vec2(1,0), vec2(0,1), vec2(-1,0), vec2(0,-1),
  vec2(1,1), vec2(-1,1), vec2(-1,-1), vec2(1,-1)
);
const int opp[9] = int[9](0, 3, 4, 1, 2, 7, 8, 5, 6);
const int reflY[9] = int[9](0, 1, 4, 3, 2, 8, 7, 6, 5);

float readF(ivec2 pos, int i) {
  if (i < 4) {
    vec4 t = texelFetch(u_f0, pos, 0);
    return i == 0 ? t.x : (i == 1 ? t.y : (i == 2 ? t.z : t.w));
  } else if (i < 8) {
    vec4 t = texelFetch(u_f1, pos, 0);
    return i == 4 ? t.x : (i == 5 ? t.y : (i == 6 ? t.z : t.w));
  } else {
    return texelFetch(u_f2, pos, 0).x;
  }
}

float equilibrium(int i, float rho, vec2 vel) {
  float eiux = dot(e[i], vel);
  float usq = dot(vel, vel);
  return w[i] * rho * (1.0 + eiux / CS2 + (eiux * eiux) / (2.0 * CS2 * CS2) - usq / (2.0 * CS2));
}

bool isSolid(ivec2 p) {
  return texelFetch(u_solid, p, 0).r > 0.5;
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 g = u_gridSize;
  float f[9];

  for (int i = 0; i < 9; i++) {
    ivec2 src = p - ivec2(e[i]);

    if (src.x >= 0 && src.x < g.x && src.y >= 0 && src.y < g.y && isSolid(src)) {
      f[i] = readF(p, opp[i]);
    } else if (p.x == 0) {
      f[i] = equilibrium(i, 1.0, vec2(u_uInlet, 0.0));
    } else if (src.x < 0) {
      f[i] = equilibrium(i, 1.0, vec2(u_uInlet, 0.0));
    } else if (src.x >= g.x) {
      f[i] = readF(ivec2(g.x - 2, src.y), i);
    } else if (src.y < 0 || src.y >= g.y) {
      int yr = reflY[i];
      f[i] = readF(ivec2(src.x, src.y < 0 ? 0 : g.y - 1), yr);
    } else {
      f[i] = readF(src, i);
    }
  }

  if (p.x == g.x - 1) {
    for (int i = 0; i < 9; i++) {
      f[i] = readF(ivec2(g.x - 2, p.y), i);
    }
  }

  out0 = vec4(f[0], f[1], f[2], f[3]);
  out1 = vec4(f[4], f[5], f[6], f[7]);
  out2 = vec4(f[8], 0, 0, 0);
}
`;

export function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(`Shader compile error: ${gl.getShaderInfoLog(s)}`);
  }
  return s;
}

export function linkProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`Program link error: ${gl.getProgramInfoLog(p)}`);
  }
  return p;
}

export interface CollideProgram {
  prog: WebGLProgram;
  u_f0: WebGLUniformLocation;
  u_f1: WebGLUniformLocation;
  u_f2: WebGLUniformLocation;
  u_omega: WebGLUniformLocation;
}

export interface StreamProgram {
  prog: WebGLProgram;
  u_f0: WebGLUniformLocation;
  u_f1: WebGLUniformLocation;
  u_f2: WebGLUniformLocation;
  u_solid: WebGLUniformLocation;
  u_uInlet: WebGLUniformLocation;
  u_gridSize: WebGLUniformLocation;
}

export function createCollideProgram(gl: WebGL2RenderingContext): CollideProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, COLLIDE_VS);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, COLLIDE_FS);
  const prog = linkProgram(gl, vs, fs);
  return {
    prog,
    u_f0: gl.getUniformLocation(prog, "u_f0")!,
    u_f1: gl.getUniformLocation(prog, "u_f1")!,
    u_f2: gl.getUniformLocation(prog, "u_f2")!,
    u_omega: gl.getUniformLocation(prog, "u_omega")!,
  };
}

export function createStreamProgram(gl: WebGL2RenderingContext): StreamProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, STREAM_VS);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, STREAM_FS);
  const prog = linkProgram(gl, vs, fs);
  return {
    prog,
    u_f0: gl.getUniformLocation(prog, "u_f0")!,
    u_f1: gl.getUniformLocation(prog, "u_f1")!,
    u_f2: gl.getUniformLocation(prog, "u_f2")!,
    u_solid: gl.getUniformLocation(prog, "u_solid")!,
    u_uInlet: gl.getUniformLocation(prog, "u_uInlet")!,
    u_gridSize: gl.getUniformLocation(prog, "u_gridSize")!,
  };
}

const FULLSCREEN_QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

let quadVAO: WebGLVertexArrayObject | null = null;
let quadBuf: WebGLBuffer | null = null;

export function ensureQuad(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
  if (!quadVAO) {
    quadVAO = gl.createVertexArray();
    gl.bindVertexArray(quadVAO);
    quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_QUAD, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }
  gl.bindVertexArray(quadVAO);
  return quadVAO;
}

export function runCollide(
  gl: WebGL2RenderingContext,
  prog: CollideProgram,
  ppRead: { tex: [WebGLTexture, WebGLTexture, WebGLTexture] },
  ppWrite: { fbo: WebGLFramebuffer },
  omega: number,
  nx: number,
  ny: number,
): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, ppWrite.fbo);
  gl.viewport(0, 0, nx, ny);
  gl.useProgram(prog.prog);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ppRead.tex[0]);
  gl.uniform1i(prog.u_f0, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, ppRead.tex[1]);
  gl.uniform1i(prog.u_f1, 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, ppRead.tex[2]);
  gl.uniform1i(prog.u_f2, 2);
  gl.uniform1f(prog.u_omega, omega);

  gl.disable(gl.BLEND);
  const vao = ensureQuad(gl);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export function runStream(
  gl: WebGL2RenderingContext,
  prog: StreamProgram,
  ppRead: { tex: [WebGLTexture, WebGLTexture, WebGLTexture] },
  ppWrite: { fbo: WebGLFramebuffer },
  uInlet: number,
  nx: number,
  ny: number,
  solidTex?: WebGLTexture,
): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, ppWrite.fbo);
  gl.viewport(0, 0, nx, ny);
  gl.useProgram(prog.prog);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ppRead.tex[0]);
  gl.uniform1i(prog.u_f0, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, ppRead.tex[1]);
  gl.uniform1i(prog.u_f1, 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, ppRead.tex[2]);
  gl.uniform1i(prog.u_f2, 2);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, solidTex || null);
  gl.uniform1i(prog.u_solid, 3);
  gl.uniform1f(prog.u_uInlet, uInlet);
  gl.uniform2i(prog.u_gridSize, nx, ny);

  gl.disable(gl.BLEND);
  const vao = ensureQuad(gl);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
