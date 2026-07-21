export interface PingPong {
  read: PongTextures;
  write: PongTextures;
  swap: () => void;
}

export interface PongTextures {
  fbo: WebGLFramebuffer;
  tex: [WebGLTexture, WebGLTexture, WebGLTexture];
}

function makeHalf(gl: WebGL2RenderingContext, nx: number, ny: number): PongTextures {
  const tex: [WebGLTexture, WebGLTexture, WebGLTexture] = [0, 0, 0].map(() => {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, nx, ny);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }) as [WebGLTexture, WebGLTexture, WebGLTexture];

  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex[0], 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, tex[1], 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, tex[2], 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`Framebuffer incomplete: ${status}`);
  }

  return { fbo, tex };
}

export function createPingPong(
  gl: WebGL2RenderingContext,
  nx: number,
  ny: number,
): PingPong {
  const a = makeHalf(gl, nx, ny);
  const b = makeHalf(gl, nx, ny);
  let read = a;
  let write = b;

  return {
    get read() { return read; },
    get write() { return write; },
    swap() {
      const tmp = read;
      read = write;
      write = tmp;
    },
  };
}
