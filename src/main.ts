const canvas = document.getElementById("glcanvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2")!;

if (!gl) {
  document.body.innerHTML = `<p style="color:red;padding:1em">WebGL2 not supported in this browser.</p>`;
  throw new Error("WebGL2 not available");
}


canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

gl.clearColor(0.1, 0.1, 0.25, 1.0);

function frame() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }
  gl.clear(gl.COLOR_BUFFER_BIT);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
