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
const SLR = "width:100%;height:4px;-webkit-appearance:none;appearance:none;background:var(--line,#272c34);border-radius:2px;outline:none;margin:4px 0";
const SLR_THUMB = "-webkit-appearance:none;appearance:none;width:12px;height:12px;border-radius:50%;background:var(--accent,#5eb0ef);cursor:pointer";

export function createControlsPanel(config: SimConfig): HTMLDivElement {
  const panel = document.createElement("div");
  panel.id = "ctrl";
  panel.style.cssText = `
    position:fixed; top:0; left:0; right:0; z-index:10;
    display:flex;align-items:center;gap:12px;
    padding:6px 14px;
    background:rgba(14,16,19,0.85);
    backdrop-filter:blur(6px);
    font:12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    color:var(--fg,#e6e8ec);
    user-select:none;
    border-bottom:1px solid var(--line,#272c34);
  `;

  const title = document.createElement("span");
  title.textContent = "windtoy";
  title.style.cssText = "font-weight:700;font-size:14px;color:var(--accent,#5eb0ef);margin-right:4px";
  panel.appendChild(title);

  const paused = { value: false };

  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = "⏸";
  pauseBtn.title = "Pause / Resume (Space)";
  pauseBtn.style.cssText = BTN;
  pauseBtn.addEventListener("click", () => {
    paused.value = !paused.value;
    pauseBtn.textContent = paused.value ? "▶" : "⏸";
  });
  panel.appendChild(pauseBtn);

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "↺";
  resetBtn.title = "Reset (R)";
  resetBtn.style.cssText = BTN;
  resetBtn.addEventListener("click", () => (window as any).__resetSim?.());
  panel.appendChild(resetBtn);

  panel.appendChild(sep());

  const shapeLbl = document.createElement("span");
  shapeLbl.textContent = "Shape";
  shapeLbl.style.cssText = "color:var(--dim,#9aa3af);font-size:11px";
  panel.appendChild(shapeLbl);

  const sel = document.createElement("select");
  sel.style.cssText = `background:var(--panel,#171a1f);color:var(--fg,#e6e8ec);border:1px solid var(--line,#272c34);border-radius:3px;padding:2px 4px;font:11px monospace`;
  for (const o of ["circle", "flat-plate", "naca-airfoil"]) {
    const opt = document.createElement("option");
    opt.value = o; opt.textContent = o;
    if (o === config.shapeKind) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    config.shapeKind = sel.value as ShapeKind;
    config.onUpdate();
  });
  panel.appendChild(sel);

  panel.appendChild(sep());

  const aoaRow = slGroup("AoA", `${config.aoaDeg.toFixed(1)}°`);
  const aoaVal = aoaRow.val;
  const aoaInp = makeSlider(-20, 20, 0.5, config.aoaDeg, (v) => {
    config.aoaDeg = v;
    aoaVal.textContent = v.toFixed(1) + "°";
    config.onUpdate();
  });
  aoaRow.group.appendChild(aoaInp);
  panel.appendChild(aoaRow.group);

  panel.appendChild(sep());

  const speedRow = slGroup("Speed", config.uInlet.toFixed(3));
  const speedVal = speedRow.val;
  const speedInp = makeSlider(0.01, 0.25, 0.001, config.uInlet, (v) => {
    config.uInlet = v;
    speedVal.textContent = v.toFixed(3);
    config.onUpdate();
  });
  speedRow.group.appendChild(speedInp);
  panel.appendChild(speedRow.group);

  panel.appendChild(sep());

  const charLen = config.shapeRadius * 2;
  const reInit = Math.round(config.uInlet * charLen / ((1 / 3) * (config.tau - 0.5)));
  const reRow = slGroup("Re", String(reInit));
  const reVal = reRow.val;
  const reInp = makeSlider(1, 200, 1, reInit, (v) => {
    const nu = (1 / 3) * (config.tau - 0.5);
    config.uInlet = Math.min(0.25, Math.max(0.01, v * nu / charLen));
    speedVal.textContent = config.uInlet.toFixed(3);
    reVal.textContent = String(Math.round(v));
    speedInp.value = String(config.uInlet);
    config.onUpdate();
  });
  reRow.group.appendChild(reInp);
  panel.appendChild(reRow.group);

  (panel as any).__paused = paused;
  return panel;

  function sep(): HTMLSpanElement {
    const s = document.createElement("span");
    s.textContent = "│";
    s.style.cssText = "color:var(--line,#272c34);font-size:14px";
    return s;
  }

  function slGroup(label: string, initVal: string): { group: HTMLDivElement; val: HTMLSpanElement } {
    const g = document.createElement("div");
    g.style.cssText = "display:flex;align-items:center;gap:6px";
    const lbl = document.createElement("span");
    lbl.textContent = label;
    lbl.style.cssText = "color:var(--dim,#9aa3af);font-size:11px;min-width:28px";
    const v = document.createElement("span");
    v.textContent = initVal;
    v.style.cssText = "color:var(--fg,#e6e8ec);font-size:11px;min-width:36px;text-align:right";
    g.appendChild(lbl);
    g.appendChild(v);
    return { group: g, val: v };
  }

  function makeSlider(min: number, max: number, step: number, init: number, onChange: (v: number) => void): HTMLInputElement {
    const inp = document.createElement("input");
    inp.type = "range";
    inp.min = String(min);
    inp.max = String(max);
    inp.step = String(step);
    inp.value = String(init);
    inp.style.cssText = SLR;
    const styleId = "__sliderStyle";
    if (!document.getElementById(styleId)) {
      const st = document.createElement("style");
      st.id = styleId;
      st.textContent = `#ctrl input[type=range]::-webkit-slider-thumb { ${SLR_THUMB} } #ctrl input[type=range]::-moz-range-thumb { ${SLR_THUMB} }`;
      document.head.appendChild(st);
    }
    inp.addEventListener("input", () => onChange(parseFloat(inp.value)));
    inp.style.width = "70px";
    return inp;
  }
}
