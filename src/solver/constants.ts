export const NX = 400;
export const NY = 150;

export const Q = 9;

export const E: readonly [number, number][] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
];

export const W: readonly number[] = [
  4 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 36,
  1 / 36,
  1 / 36,
  1 / 36,
];

export const CS2 = 1 / 3;

export const OPPOSITE: readonly number[] = [0, 3, 4, 1, 2, 7, 8, 5, 6];

export const REFLECT_Y: readonly number[] = [0, 1, 4, 3, 2, 8, 7, 6, 5];
