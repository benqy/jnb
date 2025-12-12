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

    this.gfx.circle(0, 0, this.radius);
    this.gfx.fill({ color: opts.color, alpha: 0.9 });
    this.gfx.circle(0, 0, this.radius + 6);
    this.gfx.fill({ color: opts.color, alpha: 0.22 });

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
    this.display.rotation += dt * 7;
  }
}
