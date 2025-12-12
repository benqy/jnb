import { Container, Graphics } from 'pixi.js';
import { Vec2 } from '../math/Vec2';

export class Projectile {
  readonly display: Container;
  readonly gfx: Graphics;

  pos: Vec2;
  vel: Vec2;

  radius: number;
  damage: number;
  pierce: number;

  life = 1.5;
  dead = false;

  hitColor: number;
  knockbackDir: Vec2;
  knockback: number;

  onHit?: (monster: unknown) => void;

  private spinSpeed = 7;

  constructor(opts: {
    pos: Vec2;
    vel: Vec2;
    radius: number;
    damage: number;
    pierce: number;
    life: number;
    color: number;
    knockbackDir: Vec2;
    knockback: number;
    shape?: 'orb' | 'shard';
    spin?: number;
  }) {
    this.pos = opts.pos;
    this.vel = opts.vel;
    this.radius = opts.radius;
    this.damage = opts.damage;
    this.pierce = opts.pierce;
    this.life = opts.life;
    this.hitColor = opts.color;
    this.knockbackDir = opts.knockbackDir;
    this.knockback = opts.knockback;

    this.display = new Container();
    this.gfx = new Graphics();

    const shape = opts.shape ?? 'orb';
    this.spinSpeed = opts.spin ?? (shape === 'orb' ? 7 : 0);

    this.gfx.clear();

    if (shape === 'shard') {
      const len = this.radius * 2.6;
      const w = this.radius * 0.9;

      // icy diamond shard
      this.gfx.poly([
        0, -len,
        w, 0,
        0, len,
        -w, 0,
      ]);
      this.gfx.fill({ color: opts.color, alpha: 0.9 });
      this.gfx.stroke({ width: 2, color: 0xe7fbff, alpha: 0.55 });

      // glow
      this.gfx.poly([
        0, -len * 1.28,
        w * 1.25, 0,
        0, len * 1.28,
        -w * 1.25, 0,
      ]);
      this.gfx.stroke({ width: 3.5, color: opts.color, alpha: 0.12 });

      // align to travel direction
      this.display.rotation = Math.atan2(this.vel.y, this.vel.x) + Math.PI / 2;
    } else {
      // default orb
      this.gfx.circle(0, 0, this.radius);
      this.gfx.fill({ color: opts.color, alpha: 0.9 });
      this.gfx.circle(0, 0, this.radius + 6);
      this.gfx.fill({ color: opts.color, alpha: 0.22 });
    }

    this.display.addChild(this.gfx);

    this.display.x = this.pos.x;
    this.display.y = this.pos.y;
  }

  update(dt: number): void {
    if (this.dead) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    this.pos = this.pos.add(this.vel.mul(dt));
    this.display.x = this.pos.x;
    this.display.y = this.pos.y;

    // spin
    this.display.rotation += dt * this.spinSpeed;
  }
}
