export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function sample<T>(arr: readonly T[]): T {
  return arr[(Math.random() * arr.length) | 0];
}

export function pickN<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = (Math.random() * copy.length) | 0;
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}
