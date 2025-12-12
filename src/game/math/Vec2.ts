export class Vec2 {
  constructor(
    public readonly x: number,
    public readonly y: number,
  ) {}

  static zero(): Vec2 {
    return new Vec2(0, 0);
  }

  add(o: Vec2): Vec2 {
    return new Vec2(this.x + o.x, this.y + o.y);
  }

  sub(o: Vec2): Vec2 {
    return new Vec2(this.x - o.x, this.y - o.y);
  }

  mul(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  len(): number {
    return Math.hypot(this.x, this.y);
  }

  norm(): Vec2 {
    const l = this.len();
    if (l <= 1e-6) return Vec2.zero();
    return this.mul(1 / l);
  }

  rot(rad: number): Vec2 {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  dot(o: Vec2): number {
    return this.x * o.x + this.y * o.y;
  }

  withLen(target: number): Vec2 {
    const l = this.len();
    if (l <= 1e-6) return new Vec2(target, 0);
    return this.mul(target / l);
  }
}
