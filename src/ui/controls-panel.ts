export type ShapeKind = "circle" | "flat-plate" | "naca-airfoil";

export interface SimConfig {
  uInlet: number;
  tau: number;
  shapeKind: ShapeKind;
  aoaDeg: number;
  shapeRadius: number;
  onUpdate: () => void;
}

export function createControlsPanel(config: SimConfig): HTMLDivElement {
  const panel = document.createElement("div");
  panel.id = "controls-panel";
  panel.style.cssText = `
    position:fixed; top:12px; left:12px; z-index:10;
    background:rgba(0,0,0,0.7); color:#ddd;
    padding:14px 18px; border-radius:8px;
    font:13px/1.5 monospace; min-width:200px;
    user-select:none;
  `;

  const title = document.createElement("div");
  title.textContent = "windtoy";
  title.style.cssText = "font-weight:bold;font-size:15px;margin-bottom:8px;color:#fff";
  panel.appendChild(title);

  function addSlider(
    label: string,
    min: number,
    max: number,
    step: number,
    initial: number,
    fmt: (v: number) => string,
    onChange: (v: number) => void,
  ): HTMLInputElement {
    const row = document.createElement("div");
    row.style.cssText = "margin-bottom:6px";

    const lbl = document.createElement("div");
    lbl.style.cssText = "display:flex;justify-content:space-between";
    const name = document.createElement("span");
    name.textContent = label;
    const val = document.createElement("span");
    val.textContent = fmt(initial);
    lbl.appendChild(name);
    lbl.appendChild(val);

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(initial);
    input.style.cssText = "width:100%;margin:2px 0";
    input.addEventListener("input", () => {
      const v = parseFloat(input.value);
      val.textContent = fmt(v);
      onChange(v);
    });

    row.appendChild(lbl);
    row.appendChild(input);
    panel.appendChild(row);
    return input;
  }

  const charLen = config.shapeRadius * 2;

  const selRow = document.createElement("div");
  selRow.style.cssText = "margin-bottom:6px";
  const selLbl = document.createElement("div");
  selLbl.textContent = "Shape";
  selLbl.style.cssText = "margin-bottom:2px";
  const sel = document.createElement("select");
  sel.style.cssText = "width:100%;background:#333;color:#ddd;border:1px solid #555;border-radius:3px;padding:2px 4px;font:12px monospace";
  const opts = ["circle", "flat-plate", "naca-airfoil"];
  for (const o of opts) {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    if (o === config.shapeKind) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    config.shapeKind = sel.value as ShapeKind;
    config.onUpdate();
  });
  selRow.appendChild(selLbl);
  selRow.appendChild(sel);
  panel.appendChild(selRow);

  addSlider(
    "AoA (deg)", -20, 20, 0.5, config.aoaDeg,
    (v) => v.toFixed(1) + "°",
    (v) => { config.aoaDeg = v; config.onUpdate(); },
  );

  addSlider(
    "Inlet speed", 0.01, 0.25, 0.001, config.uInlet,
    (v) => v.toFixed(3),
    (v) => { config.uInlet = v; config.onUpdate(); },
  );

  addSlider(
    "Reynolds #", 1, 200, 1,
    Math.round(config.uInlet * charLen / ((1 / 3) * (config.tau - 0.5))),
    (v) => String(Math.round(v)),
    (v) => {
      const nu = (1 / 3) * (config.tau - 0.5);
      config.uInlet = Math.min(0.25, Math.max(0.01, v * nu / charLen));
      config.onUpdate();
    },
  );

  return panel;
}
