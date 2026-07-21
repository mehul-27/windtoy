const DISPLAY_VS = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0, 1); }
`;

const DISPLAY_FS = `#version 300 es
precision highp float;

uniform sampler2D u_f0;
uniform sampler2D u_f1;
uniform sampler2D u_f2;
uniform sampler2D u_solid;
uniform vec2 u_texScale;
uniform vec2 u_invScreen;
uniform float u_maxSpeed;

out vec4 outColor;

const vec2 e[9] = vec2[9](
  vec2(0,0), vec2(1,0), vec2(0,1), vec2(-1,0), vec2(0,-1),
  vec2(1,1), vec2(-1,1), vec2(-1,-1), vec2(1,-1)
);

vec3 colormap(float t) {
  const vec3 c[7] = vec3[7](
    vec3(0.127, 0.050, 0.162),
    vec3(0.220, 0.404, 0.792),
    vec3(0.262, 0.714, 0.761),
    vec3(0.358, 0.904, 0.494),
    vec3(0.710, 0.957, 0.207),
    vec3(0.970, 0.657, 0.122),
    vec3(0.838, 0.118, 0.069)
  );
  t = clamp(t, 0.0, 1.0) * 6.0;
  int i = int(floor(t));
  float f = t - float(i);
  return mix(c[i], c[min(i + 1, 6)], f);
}

bool isSolid(vec2 uv) {
  return texture(u_solid, uv).r > 0.5;
}

vec2 calcVel(ivec2 p) {
  vec4 t0 = texelFetch(u_f0, p, 0);
  vec4 t1 = texelFetch(u_f1, p, 0);
  vec4 t2 = texelFetch(u_f2, p, 0);
  float rho = t0.x + t0.y + t0.z + t0.w + t1.x + t1.y + t1.z + t1.w + t2.x;
  vec2 vel = vec2(
    t0.y + t1.y + t2.x - t0.w - t1.z - t1.w,
    t0.z + t1.y + t1.z - t1.x - t1.w - t2.x
  );
  if (rho > 0.0) vel /= rho;
  return vel;
}

void main() {
  vec2 uv = gl_FragCoord.xy * u_invScreen;
  ivec2 p = ivec2(gl_FragCoord.xy * u_texScale);

  if (isSolid(uv)) {
    outColor = vec4(0.25, 0.25, 0.26, 1.0);
    return;
  }

  vec2 vel = calcVel(p);
  float speed = length(vel);
  float t = speed / u_maxSpeed;
  outColor = vec4(colormap(t), 1.0);
}
`;

import { ensureQuad } from "./lbm-shader";

let displayProg: WebGLProgram | null = null;
let u_f0: WebGLUniformLocation | null = null;
let u_f1: WebGLUniformLocation | null = null;
let u_f2: WebGLUniformLocation | null = null;
let u_solid: WebGLUniformLocation | null = null;
let u_texScale: WebGLUniformLocation | null = null;
let u_invScreen: WebGLUniformLocation | null = null;
let u_maxSpeed: WebGLUniformLocation | null = null;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "compile error");
  return s;
}

export function createDisplayProgram(gl: WebGL2RenderingContext): void {
  const vs = compile(gl, gl.VERTEX_SHADER, DISPLAY_VS);
  const fs = compile(gl, gl.FRAGMENT_SHADER, DISPLAY_FS);

  displayProg = gl.createProgram()!;
  gl.attachShader(displayProg, vs);
  gl.attachShader(displayProg, fs);
  gl.linkProgram(displayProg);
  if (!gl.getProgramParameter(displayProg, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(displayProg) || "link error");

  u_f0 = gl.getUniformLocation(displayProg, "u_f0");
  u_f1 = gl.getUniformLocation(displayProg, "u_f1");
  u_f2 = gl.getUniformLocation(displayProg, "u_f2");
  u_solid = gl.getUniformLocation(displayProg, "u_solid");
  u_texScale = gl.getUniformLocation(displayProg, "u_texScale");
  u_invScreen = gl.getUniformLocation(displayProg, "u_invScreen");
  u_maxSpeed = gl.getUniformLocation(displayProg, "u_maxSpeed");
}

export function runDisplay(
  gl: WebGL2RenderingContext,
  ppRead: { tex: [WebGLTexture, WebGLTexture, WebGLTexture] },
  solidTexDisplay: WebGLTexture | null,
  nx: number,
  ny: number,
  canvasW: number,
  canvasH: number,
  maxSpeed: number,
): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvasW, canvasH);
  gl.useProgram(displayProg!);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ppRead.tex[0]);
  gl.uniform1i(u_f0!, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, ppRead.tex[1]);
  gl.uniform1i(u_f1!, 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, ppRead.tex[2]);
  gl.uniform1i(u_f2!, 2);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, solidTexDisplay);
  gl.uniform1i(u_solid!, 3);

  gl.uniform2f(u_texScale!, nx / canvasW, ny / canvasH);
  gl.uniform2f(u_invScreen!, 1 / canvasW, 1 / canvasH);
  gl.uniform1f(u_maxSpeed!, maxSpeed);

  gl.disable(gl.BLEND);
  const vao = ensureQuad(gl);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
