import { ensureQuad, compileShader, linkProgram } from "./lbm-shader";

const BLUR_VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  gl_Position = vec4(a_pos, 0, 1);
  v_uv = a_pos * 0.5 + 0.5;
}
`;

const BLUR_FS = `#version 300 es
precision highp float;

uniform sampler2D u_tex;
uniform sampler2D u_solid;
uniform vec2 u_uvStep;

in vec2 v_uv;
out vec4 outColor;

const float w[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.0540541, 0.0162162);

bool isSolid(vec2 uv) {
  return texture(u_solid, uv).r > 0.5;
}

void main() {
  vec4 c = texture(u_tex, v_uv) * w[0];
  float tw = w[0];

  for (int i = 1; i <= 4; i++) {
    vec2 off = u_uvStep * float(i);
    vec2 uvp = v_uv + off;
    vec2 uvn = v_uv - off;

    if (!isSolid(uvp)) { c += texture(u_tex, uvp) * w[i]; tw += w[i]; }
    if (!isSolid(uvn)) { c += texture(u_tex, uvn) * w[i]; tw += w[i]; }
  }

  outColor = tw > 0.0 ? c / tw : vec4(0);
}
`;

const COMPOSITE_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tight;
uniform sampler2D u_wide;
uniform float u_wideWeight;
uniform float u_saturation;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec3 tight = texture(u_tight, v_uv).rgb;
  vec3 wide = texture(u_wide, v_uv).rgb;
  vec3 c = mix(tight, wide, u_wideWeight);
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(luma), c, u_saturation);
  outColor = vec4(c, 1.0);
}
`;

let blurProg: WebGLProgram | null = null;
let u_tex: WebGLUniformLocation | null = null;
let u_solid: WebGLUniformLocation | null = null;
let u_uvStep: WebGLUniformLocation | null = null;

let compProg: WebGLProgram | null = null;
let u_compTight: WebGLUniformLocation | null = null;
let u_compWide: WebGLUniformLocation | null = null;
let u_compWideWeight: WebGLUniformLocation | null = null;
let u_compSaturation: WebGLUniformLocation | null = null;

export function createBlurProgram(gl: WebGL2RenderingContext): void {
  const vs = compileShader(gl, gl.VERTEX_SHADER, BLUR_VS);

  const fs = compileShader(gl, gl.FRAGMENT_SHADER, BLUR_FS);
  blurProg = linkProgram(gl, vs, fs);
  u_tex = gl.getUniformLocation(blurProg, "u_tex");
  u_solid = gl.getUniformLocation(blurProg, "u_solid");
  u_uvStep = gl.getUniformLocation(blurProg, "u_uvStep");

  const cifs = compileShader(gl, gl.FRAGMENT_SHADER, COMPOSITE_FS);
  compProg = linkProgram(gl, vs, cifs);
  u_compTight = gl.getUniformLocation(compProg, "u_tight");
  u_compWide = gl.getUniformLocation(compProg, "u_wide");
  u_compWideWeight = gl.getUniformLocation(compProg, "u_wideWeight");
  u_compSaturation = gl.getUniformLocation(compProg, "u_saturation");
}

export function runBlurPass(
  gl: WebGL2RenderingContext,
  srcTex: WebGLTexture,
  solidTex: WebGLTexture,
  dstFbo: WebGLFramebuffer | null,
  uvStepX: number,
  uvStepY: number,
  width: number,
  height: number,
): void {
  if (dstFbo) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  gl.viewport(0, 0, width, height);
  gl.useProgram(blurProg!);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, srcTex);
  gl.uniform1i(u_tex!, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, solidTex);
  gl.uniform1i(u_solid!, 1);

  gl.uniform2f(u_uvStep!, uvStepX, uvStepY);

  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  const vao = ensureQuad(gl);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export function runComposite(
  gl: WebGL2RenderingContext,
  tightTex: WebGLTexture,
  wideTex: WebGLTexture,
  wideWeight: number,
  saturation: number,
  width: number,
  height: number,
): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, width, height);
  gl.useProgram(compProg!);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tightTex);
  gl.uniform1i(u_compTight!, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, wideTex);
  gl.uniform1i(u_compWide!, 1);

  gl.uniform1f(u_compWideWeight!, wideWeight);
  gl.uniform1f(u_compSaturation!, saturation);

  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  const vao = ensureQuad(gl);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
