import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { Vec2 } from '../math/Vec2';
import { clamp, lerp, randRange } from '../math/util';

type Particle = {
  node: Container;
  vel: Vec2;
  life: number;
  maxLife: number;
  rotVel: number;
  scaleFrom?: number;
  scaleTo?: number;
  onUpdate?: (node: Container, t01: number, dt: number) => void;
};

export class ParticleSystem {
  readonly container = new Container();
  private particles: Particle[] = [];

  update(dt: number): void {
    const alive: Particle[] = [];

    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) {
        p.node.destroy();
        continue;
      }

      const t = 1 - p.life / p.maxLife;
      p.node.x += p.vel.x * dt;
      p.node.y += p.vel.y * dt;
      p.node.rotation += p.rotVel * dt;
      p.node.alpha = clamp(1 - t, 0, 1);

      if (p.scaleFrom !== undefined && p.scaleTo !== undefined) {
        const s = lerp(p.scaleFrom, p.scaleTo, t);
        p.node.scale.set(s);
      }

      p.onUpdate?.(p.node, t, dt);

      alive.push(p);
    }

    this.particles = alive;
  }

  shockwave(opts: { pos: Vec2; radius: number; color: number; life: number }): void {
    const g = new Graphics();
    g.circle(0, 0, 1);
    g.stroke({ width: 0.18, color: opts.color, alpha: 0.85 });

    const node = new Container();
    node.x = opts.pos.x;
    node.y = opts.pos.y;
    node.blendMode = 'add';
    node.addChild(g);

    this.container.addChild(node);
    this.particles.push({
      node,
      vel: Vec2.zero(),
      life: opts.life,
      maxLife: opts.life,
      rotVel: 0,
      scaleFrom: 8,
      scaleTo: opts.radius,
      onUpdate: (n, t01) => {
        // thicken early, fade late
        const alpha = (1 - t01) * 0.9;
        n.alpha = alpha;
      },
    });
  }

  beam(opts: { from: Vec2; to: Vec2; color: number; life: number; width: number }): void {
    const g = new Graphics();
    g.moveTo(opts.from.x, opts.from.y);
    g.lineTo(opts.to.x, opts.to.y);
    g.stroke({ width: opts.width, color: opts.color, alpha: 0.9 });

    // outer glow
    g.moveTo(opts.from.x, opts.from.y);
    g.lineTo(opts.to.x, opts.to.y);
    g.stroke({ width: opts.width * 3, color: opts.color, alpha: 0.18 });

    const node = new Container();
    node.blendMode = 'add';
    node.addChild(g);

    this.container.addChild(node);
    this.particles.push({
      node,
      vel: Vec2.zero(),
      life: opts.life,
      maxLife: opts.life,
      rotVel: 0,
    });
  }

  bladeSlash(opts: { pos: Vec2; angle: number; color: number; life: number }): void {
    const g = new Graphics();
    // a small diamond blade
    g.poly([
      0, -10,
      6, 0,
      0, 10,
      -6, 0,
    ]);
    g.fill({ color: opts.color, alpha: 0.95 });
    g.poly([
      0, -16,
      2, 0,
      0, 16,
      -2, 0,
    ]);
    g.fill({ color: opts.color, alpha: 0.22 });

    const node = new Container();
    node.x = opts.pos.x;
    node.y = opts.pos.y;
    node.rotation = opts.angle;
    node.blendMode = 'add';
    node.addChild(g);

    this.container.addChild(node);
    this.particles.push({
      node,
      vel: Vec2.zero(),
      life: opts.life,
      maxLife: opts.life,
      rotVel: randRange(-10, 10),
    });
  }

  hitSpark(opts: { pos: Vec2; color: number; strength: number }): void {
    const count = Math.floor(10 + opts.strength * 10);
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const r = randRange(1.5, 4.5);
      g.circle(0, 0, r);
      g.fill({ color: opts.color, alpha: 0.95 });

      const node = new Container();
      node.x = opts.pos.x;
      node.y = opts.pos.y;
      node.addChild(g);

      const a = Math.random() * Math.PI * 2;
      const sp = randRange(140, 520) * (0.6 + opts.strength * 0.4);
      const vel = new Vec2(Math.cos(a), Math.sin(a)).mul(sp);

      this.container.addChild(node);
      this.particles.push({
        node,
        vel,
        life: randRange(0.12, 0.25),
        maxLife: 0.25,
        rotVel: randRange(-8, 8),
      });
    }
  }

  burstText(opts: {
    pos: Vec2;
    text: string;
    color: number;
    count: number;
    speed: number;
    life: number;
  }): void {
    for (let i = 0; i < opts.count; i++) {
      const t = new Text({
        text: opts.text,
        style: { fill: opts.color, fontSize: randRange(12, 22) },
      });
      t.anchor.set(0.5);

      const node = new Container();
      node.x = opts.pos.x;
      node.y = opts.pos.y;
      node.addChild(t);

      const a = Math.random() * Math.PI * 2;
      const sp = randRange(opts.speed * 0.6, opts.speed);
      const vel = new Vec2(Math.cos(a), Math.sin(a)).mul(sp);

      this.container.addChild(node);
      this.particles.push({
        node,
        vel,
        life: opts.life,
        maxLife: opts.life,
        rotVel: randRange(-10, 10),
      });
    }
  }

  afterImage(opts: {
    x: number;
    y: number;
    texture: Texture;
    rotation: number;
    scaleX: number;
    scaleY: number;
    tint: number;
    alpha: number;
    life: number;
  }): void {
    const s = new Sprite(opts.texture);
    s.anchor.set(0.5);
    s.x = opts.x;
    s.y = opts.y;
    s.rotation = opts.rotation;
    s.scale.set(opts.scaleX, opts.scaleY);
    s.tint = opts.tint;
    s.alpha = opts.alpha;

    const node = new Container();
    node.addChild(s);

    this.container.addChild(node);
    this.particles.push({
      node,
      vel: new Vec2(0, 0),
      life: opts.life,
      maxLife: opts.life,
      rotVel: 0,
    });
  }
}
