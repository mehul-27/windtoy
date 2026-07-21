export function createReadoutPanel(maxSpeed: number): HTMLDivElement {
  const panel = document.createElement("div");
  panel.id = "readout-panel";
  panel.style.cssText = `
    position:fixed; top:12px; right:12px; z-index:10;
    background:rgba(0,0,0,0.7); color:#ddd;
    padding:10px 14px; border-radius:6px;
    font:12px/1.6 monospace; min-width:110px;
    user-select:none; text-align:right;
  `;
  panel.innerHTML = `
    <div><span style="color:#8cf">Drag</span> <span id="drag-val">—</span></div>
    <div><span style="color:#f8a">Lift</span> <span id="lift-val">—</span></div>
    <div style="margin-top:10px;padding-top:8px;border-top:1px solid #444">
      <canvas id="legend-canvas" width="120" height="16"></canvas>
      <div style="display:flex;justify-content:space-between;font:10px monospace;color:#999">
        <span>0</span>
        <span id="legend-max">${maxSpeed.toFixed(2)}</span>
      </div>
    </div>
  `;

  const cvs = panel.querySelector("#legend-canvas") as HTMLCanvasElement;
  const ctx = cvs.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 120, 0);
  grad.addColorStop(0.00, "#000080");
  grad.addColorStop(0.17, "#0000ff");
  grad.addColorStop(0.33, "#00ffff");
  grad.addColorStop(0.50, "#00ff00");
  grad.addColorStop(0.67, "#ffff00");
  grad.addColorStop(0.83, "#ff8000");
  grad.addColorStop(1.00, "#ff0000");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 120, 16);

  return panel;
}

export function updateReadout(drag: number, lift: number): void {
  const d = document.getElementById("drag-val");
  const l = document.getElementById("lift-val");
  if (d) d.textContent = drag.toFixed(4);
  if (l) l.textContent = lift.toFixed(4);
}
