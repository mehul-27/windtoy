export type ShapeKind = "circle" | "flat-plate" | "naca-airfoil";

export interface SimConfig {
  uInlet: number;
  tau: number;
  shapeKind: ShapeKind;
  aoaDeg: number;
  shapeRadius: number;
  onUpdate: () => void;
}

const BTN = "background:var(--panel,#171a1f);color:var(--fg,#e6e8ec);border:1px solid var(--line,#272c34);border-radius:4px;padding:4px 10px;font:12px/1.4 monospace;cursor:pointer";
const SLR_FILL = "width:100%;height:4px;-webkit-appearance:none;appearance:none;background:linear-gradient(to right,var(--accent,#5eb0ef) var(--val,0%),var(--line,#272c34) var(--val,0%));border-radius:2px;outline:none;margin:4px 0";
const SLR_THUMB = "-webkit-appearance:none;appearance:none;width:12px;height:12px;border-radius:50%;background:var(--accent,#5eb0ef);cursor:pointer;border:none";

export function createControlsPanel(config: SimConfig): HTMLDivElement {
  const outer = document.createElement("div");
  outer.style.cssText = `
    position:fixed; top:12px; left:12px; z-index:10;
    font:12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    user-select:none;
  `;

  const toggle = document.createElement("button");
  toggle.textContent = "☰";
  toggle.title = "Toggle controls";
  toggle.style.cssText = `
    width:30px;height:30px;border:none;border-radius:4px;
    background:rgba(14,16,19,0.8);color:var(--fg,#e6e8ec);font-size:16px;
    cursor:pointer;display:none;align-items:center;justify-content:center;
  `;
  outer.appendChild(toggle);

  const panel = document.createElement("div");
  panel.id = "ctrl";
  panel.style.cssText = `
    background:rgba(14,16,19,0.85);
    backdrop-filter:blur(8px);
    border:1px solid var(--line,#272c34);
    border-radius:8px;
    padding:10px 14px;
    min-width:210px;
    box-shadow:0 4px 24px rgba(0,0,0,0.5);
    color:var(--fg,#e6e8ec);
  `;

  const titleRow = document.createElement("div");
  titleRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:6px";

  const title = document.createElement("span");
  title.textContent = "windtoy";
  title.style.cssText = "font-weight:700;font-size:14px;color:var(--accent,#5eb0ef);margin-right:auto";
  titleRow.appendChild(title);

  const paused = { value: false };

  const pauseBtn = document.createElement("button");
  pauseBtn.id = "btn-pause";
  pauseBtn.textContent = "⏸";
  pauseBtn.title = "Pause / Resume (Space)";
  pauseBtn.style.cssText = BTN + ";padding:2px 8px";
  pauseBtn.addEventListener("click", () => {
    paused.value = !paused.value;
    pauseBtn.textContent = paused.value ? "▶" : "⏸";
  });
  titleRow.appendChild(pauseBtn);

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "↺";
  resetBtn.title = "Reset (R)";
  resetBtn.style.cssText = BTN + ";padding:2px 8px";
  resetBtn.addEventListener("click", () => (window as any).__resetSim?.());
  titleRow.appendChild(resetBtn);

  const hideBtn = document.createElement("button");
  hideBtn.textContent = "✕";
  hideBtn.title = "Collapse panel";
  hideBtn.style.cssText = "background:none;border:none;color:var(--dim,#9aa3af);cursor:pointer;font-size:14px;padding:2px 4px";
  hideBtn.addEventListener("click", () => {
    panel.style.display = "none";
    toggle.style.display = "flex";
  });
  titleRow.appendChild(hideBtn);

  panel.appendChild(titleRow);

  const sep = (): HTMLHRElement => {
    const r = document.createElement("hr");
    r.style.cssText = "border:none;border-top:1px solid var(--line,#272c34);margin:5px 0";
    return r;
  };

  function makeSlider(
    min: number, max: number, step: number, init: number,
    onChange: (v: number) => void,
  ): HTMLInputElement {
    const inp = document.createElement("input");
    inp.type = "range";
    inp.min = String(min);
    inp.max = String(max);
    inp.step = String(step);
    inp.value = String(init);
    const pct = ((init - min) / (max - min)) * 100;
    inp.style.cssText = SLR_FILL;
    inp.style.setProperty("--val", pct.toFixed(1) + "%");
    const styleId = "__sliderStyle";
    if (!document.getElementById(styleId)) {
      const st = document.createElement("style");
      st.id = styleId;
      st.textContent =
        `#ctrl input[type=range]::-webkit-slider-thumb { ${SLR_THUMB} } ` +
        `#ctrl input[type=range]::-moz-range-thumb { ${SLR_THUMB} }`;
      document.head.appendChild(st);
    }
    inp.addEventListener("input", () => {
      const v = parseFloat(inp.value);
      const p = ((v - min) / (max - min)) * 100;
      inp.style.setProperty("--val", p.toFixed(1) + "%");
      onChange(v);
    });
    inp.style.width = "100%";
    return inp;
  }

  panel.appendChild(sep());

  const sel = document.createElement("select");
  sel.title = "Select obstacle geometry";
  sel.style.cssText = "width:100%;background:var(--panel,#171a1f);color:var(--fg,#e6e8ec);border:1px solid var(--line,#272c34);border-radius:3px;padding:2px 4px;font:11px monospace";
  for (const o of ["circle", "flat-plate", "naca-airfoil"]) {
    const opt = document.createElement("option");
    opt.value = o; opt.textContent = o;
    if (o === config.shapeKind) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    config.shapeKind = sel.value as ShapeKind;
    aoaRow.style.display = sel.value === "circle" ? "none" : "";
    config.onUpdate();
  });

  const shapeRow = document.createElement("div");
  shapeRow.title = "Select obstacle geometry";
  shapeRow.style.cssText = "margin-bottom:4px";
  const shapeLbl = document.createElement("div");
  shapeLbl.textContent = "Shape";
  shapeLbl.style.cssText = "color:var(--dim,#9aa3af);font-size:11px;margin-bottom:2px";
  shapeRow.appendChild(shapeLbl);
  shapeRow.appendChild(sel);
  panel.appendChild(shapeRow);

  const aoaRow = document.createElement("div");
  aoaRow.title = "Angle of attack — positive = nose up";
  aoaRow.style.cssText = "margin-bottom:4px";
  const aoaLbl = document.createElement("div");
  aoaLbl.textContent = "AoA";
  aoaLbl.style.cssText = "color:var(--dim,#9aa3af);font-size:11px";
  const aoaVal = document.createElement("span");
  aoaVal.textContent = `${config.aoaDeg.toFixed(1)}°`;
  aoaVal.style.cssText = "color:var(--fg,#e6e8ec);font-size:11px;float:right";
  aoaLbl.appendChild(aoaVal);
  aoaRow.appendChild(aoaLbl);
  const aoaInp = makeSlider(-20, 20, 0.5, config.aoaDeg, (v) => {
    config.aoaDeg = v;
    aoaVal.textContent = v.toFixed(1) + "°";
    config.onUpdate();
  });
  aoaRow.appendChild(aoaInp);
  panel.appendChild(aoaRow);
  if (config.shapeKind === "circle") aoaRow.style.display = "none";

  const speedRow = document.createElement("div");
  speedRow.title = "Inlet flow velocity";
  speedRow.style.cssText = "margin-bottom:4px";
  const speedLbl = document.createElement("div");
  speedLbl.textContent = "Speed";
  speedLbl.style.cssText = "color:var(--dim,#9aa3af);font-size:11px";
  const speedVal = document.createElement("span");
  speedVal.textContent = config.uInlet.toFixed(3);
  speedVal.style.cssText = "color:var(--fg,#e6e8ec);font-size:11px;float:right";
  speedLbl.appendChild(speedVal);
  speedRow.appendChild(speedLbl);
  const speedInp = makeSlider(0.01, 0.25, 0.001, config.uInlet, (v) => {
    config.uInlet = v;
    speedVal.textContent = v.toFixed(3);
    config.onUpdate();
  });
  speedRow.appendChild(speedInp);
  panel.appendChild(speedRow);

  const charLen = config.shapeRadius * 2;
  const reInit = Math.round(config.uInlet * charLen / ((1 / 3) * (config.tau - 0.5)));
  const reRow = document.createElement("div");
  reRow.title = "Reynolds number — adjusts inlet speed";
  reRow.style.cssText = "margin-bottom:2px";
  const reLbl = document.createElement("div");
  reLbl.textContent = "Re";
  reLbl.style.cssText = "color:var(--dim,#9aa3af);font-size:11px";
  const reVal = document.createElement("span");
  reVal.textContent = String(reInit);
  reVal.style.cssText = "color:var(--fg,#e6e8ec);font-size:11px;float:right";
  reLbl.appendChild(reVal);
  reRow.appendChild(reLbl);
  const reInp = makeSlider(1, 200, 1, reInit, (v) => {
    const nu = (1 / 3) * (config.tau - 0.5);
    config.uInlet = Math.min(0.25, Math.max(0.01, v * nu / charLen));
    speedVal.textContent = config.uInlet.toFixed(3);
    reVal.textContent = String(Math.round(v));
    speedInp.value = String(config.uInlet);
    config.onUpdate();
  });
  reRow.appendChild(reInp);
  panel.appendChild(reRow);

  toggle.addEventListener("click", () => {
    panel.style.display = "";
    toggle.style.display = "none";
  });

  (panel as any).__paused = paused;
  outer.appendChild(panel);
  return outer;
}
