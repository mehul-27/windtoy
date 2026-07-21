export type ShapeKind = "circle" | "flat-plate" | "naca-airfoil";

export interface SimParams {
  nx: number;
  ny: number;
  tau: number;
  uInlet: number;
  shape: ShapeKind;
  shapeParams: Record<string, number>;
}
