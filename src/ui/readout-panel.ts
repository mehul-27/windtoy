export function createReadoutPanel(): HTMLDivElement {
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
  `;
  return panel;
}

export function updateReadout(drag: number, lift: number): void {
  const d = document.getElementById("drag-val");
  const l = document.getElementById("lift-val");
  if (d) d.textContent = drag.toFixed(4);
  if (l) l.textContent = lift.toFixed(4);
}
