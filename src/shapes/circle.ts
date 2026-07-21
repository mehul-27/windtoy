import { generateCircleMask } from "./rasterize";

export interface CircleParams {
  cx: number;
  cy: number;
  radius: number;
}

export function generateCircleMaskFromParams(
  params: CircleParams,
  nx: number,
  ny: number,
): boolean[] {
  return generateCircleMask(params.cx, params.cy, params.radius, nx, ny);
}
