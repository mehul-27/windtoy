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
  const turboColors = [
    "#20143b", "#384fcc", "#2a8fd6", "#37c784",
    "#a7d62d", "#fdc93b", "#eb6637",
  ];

  panel.innerHTML = `
    <div><span style="color:#7fc8f8">Drag</span> <span id="drag-val" style="color:#e6e8ec">—</span></div>
    <div style="margin-top:2px"><span style="color:#f8a07c">Lift</span> <span id="lift-val" style="color:#e6e8ec">—</span></div>
    <div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--line,#272c34)">
      <div style="font:10px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;color:var(--dim,#9aa3af);text-align:left;margin-bottom:2px">Velocity magnitude</div>
      <canvas id="legend-canvas" width="100" height="12"></canvas>
      <div style="display:flex;justify-content:space-between;font:9px monospace;color:var(--dim,#9aa3af)">
        <span>0</span>
        <span>${(maxSpeed/2).toFixed(2)}</span>
        <span id="legend-max">${maxSpeed.toFixed(2)}</span>
      </div>
    </div>
  `;

  const cvs = panel.querySelector("#legend-canvas") as HTMLCanvasElement;
  const ctx = cvs.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 100, 0);
  for (let i = 0; i < 7; i++) {
    grad.addColorStop(i / 6, turboColors[i]);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 2, 100, 8);
  ctx.strokeStyle = "#272c34";
  ctx.lineWidth = 1;
  for (const x of [0, 50, 100]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 4);
    ctx.stroke();
  }

  return panel;
}

export function updateReadout(drag: number, lift: number): void {
  const d = document.getElementById("drag-val");
  const l = document.getElementById("lift-val");
  if (d) d.textContent = drag.toFixed(4);
  if (l) l.textContent = lift.toFixed(4);
}
