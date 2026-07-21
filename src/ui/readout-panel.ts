export function createReadoutPanel(maxSpeed: number): HTMLDivElement {
  const panel = document.createElement("div");
  panel.id = "readout";
  panel.style.cssText = `
    position:fixed; bottom:14px; right:14px; z-index:10;
    background:rgba(14,16,19,0.8);
    backdrop-filter:blur(6px);
    padding:10px 14px; border-radius:6px;
    font:12px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    color:var(--fg,#e6e8ec);
    user-select:none; text-align:right;
    border:1px solid var(--line,#272c34);
    min-width:100px;
  `;
  panel.innerHTML = `
    <div><span style="color:#7fc8f8">Drag</span> <span id="drag-val" style="color:#e6e8ec">—</span></div>
    <div style="margin-top:2px"><span style="color:#f8a07c">Lift</span> <span id="lift-val" style="color:#e6e8ec">—</span></div>
    <div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--line,#272c34)">
      <canvas id="legend-canvas" width="100" height="10"></canvas>
      <div style="display:flex;justify-content:space-between;font:10px monospace;color:var(--dim,#9aa3af)">
        <span>0</span>
        <span id="legend-max">${maxSpeed.toFixed(2)}</span>
      </div>
    </div>
  `;

  const cvs = panel.querySelector("#legend-canvas") as HTMLCanvasElement;
  const ctx = cvs.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 100, 0);
  grad.addColorStop(0.00, "#000080");
  grad.addColorStop(0.17, "#0000ff");
  grad.addColorStop(0.33, "#00ffff");
  grad.addColorStop(0.50, "#00ff00");
  grad.addColorStop(0.67, "#ffff00");
  grad.addColorStop(0.83, "#ff8000");
  grad.addColorStop(1.00, "#ff0000");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 100, 10);

  return panel;
}

export function updateReadout(drag: number, lift: number): void {
  const d = document.getElementById("drag-val");
  const l = document.getElementById("lift-val");
  if (d) d.textContent = drag.toFixed(4);
  if (l) l.textContent = lift.toFixed(4);
}
