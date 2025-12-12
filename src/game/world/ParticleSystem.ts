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

  implosion(opts: { pos: Vec2; radius: number; color: number; life: number }): void {
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
      scaleFrom: opts.radius,
      scaleTo: 8,
      onUpdate: (n, t01) => {
        // brighten at the end as it collapses
        const a = clamp(0.25 + (1 - Math.abs(t01 - 0.7) * 1.4), 0, 1);
        n.alpha = a;
      },
    });
  }

  flamePuff(opts: { pos: Vec2; color: number; life: number; size: number }): void {
    const g = new Graphics();

    // stylized flame: 2 blobs + a teardrop
    g.circle(-opts.size * 0.18, 0, opts.size * 0.42);
    g.fill({ color: opts.color, alpha: 0.16 });
    g.circle(opts.size * 0.12, -opts.size * 0.12, opts.size * 0.3);
    g.fill({ color: opts.color, alpha: 0.22 });
    g.poly([
      0, -opts.size * 0.75,
      opts.size * 0.32, -opts.size * 0.05,
      0, opts.size * 0.45,
      -opts.size * 0.32, -opts.size * 0.05,
    ]);
    g.fill({ color: opts.color, alpha: 0.35 });

    // bright core
    g.circle(0, -opts.size * 0.1, opts.size * 0.16);
    g.fill({ color: 0xfff2c2, alpha: 0.25 });

    const node = new Container();
    node.x = opts.pos.x;
    node.y = opts.pos.y + 18;
    node.blendMode = 'add';
    node.addChild(g);
    this.container.addChild(node);

    this.particles.push({
      node,
      vel: new Vec2(randRange(-18, 18), randRange(-46, -22)),
      life: opts.life,
      maxLife: opts.life,
      rotVel: randRange(-2, 2),
      onUpdate: (n, t01) => {
        const s = lerp(0.65, 1.25, Math.min(1, t01 * 1.25));
        n.scale.set(s);
        n.alpha = clamp(1 - t01 * 1.1, 0, 1);
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

  lightningArc(opts: {
    from: Vec2;
    to: Vec2;
    color: number;
    life: number;
    width: number;
    segments?: number;
    chaos?: number;
    branches?: number;
  }): void {
    const segments = clamp(opts.segments ?? 10, 5, 22);
    const chaos = clamp(opts.chaos ?? 18, 6, 48);
    const branches = clamp(opts.branches ?? 1, 0, 3);

    const g = new Graphics();
    const node = new Container();
    node.blendMode = 'add';
    node.addChild(g);
    this.container.addChild(node);

    const draw = (alpha: number) => {
      g.clear();

      const d = opts.to.sub(opts.from);
      const len = Math.max(1, d.len());
      const dir = d.mul(1 / len);
      const perp = new Vec2(-dir.y, dir.x);

      const pts: Vec2[] = [];
      pts.push(opts.from);
      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const taper = 1 - Math.abs(t - 0.5) * 2;
        const off = randRange(-chaos, chaos) * (0.35 + taper * 0.65);
        pts.push(opts.from.add(d.mul(t)).add(perp.mul(off)));
      }
      pts.push(opts.to);

      // core
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.stroke({ width: opts.width, color: opts.color, alpha: 0.95 * alpha });

      // inner glow
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.stroke({ width: opts.width * 3.2, color: opts.color, alpha: 0.2 * alpha });

      // outer glow
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.stroke({ width: opts.width * 6.2, color: opts.color, alpha: 0.07 * alpha });

      // branches
      for (let b = 0; b < branches; b++) {
        const mid = pts[clamp(2 + Math.floor(Math.random() * (pts.length - 4)), 2, pts.length - 3)];
        const bl = randRange(36, 92);
        const ba = randRange(-1, 1);
        const tip = mid.add(perp.mul(bl * ba)).add(dir.mul(randRange(-18, 18)));

        const bend = mid.add(perp.mul(randRange(-18, 18))).add(dir.mul(randRange(12, 28)));
        g.moveTo(mid.x, mid.y);
        g.lineTo(bend.x, bend.y);
        g.lineTo(tip.x, tip.y);
        g.stroke({ width: opts.width * 0.85, color: opts.color, alpha: 0.75 * alpha });
      }
    };

    draw(1);

    this.particles.push({
      node,
      vel: Vec2.zero(),
      life: opts.life,
      maxLife: opts.life,
      rotVel: 0,
      onUpdate: (_n, t01) => {
        // jitter redraw for electricity feel
        const a = clamp(1 - t01, 0, 1);
        draw(a);
      },
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

  damageNumber(opts: {
    pos: Vec2;
    value: number;
    color: number;
    life?: number;
    size?: number;
  }): void {
    const life = opts.life ?? 0.55;
    const size = opts.size ?? 20;

    const label = new Text({
      text: `${Math.max(0, Math.round(opts.value))}`,
      style: {
        fill: opts.color,
        fontSize: size,
        fontWeight: '800',
        stroke: { color: 0x060812, width: 4, alpha: 1 },
        dropShadow: {
          color: 0x000000,
          alpha: 0.85,
          blur: 2,
          angle: Math.PI / 2,
          distance: 2,
        },
      },
    });
    label.anchor.set(0.5);

    const node = new Container();
    node.x = opts.pos.x;
    node.y = opts.pos.y - 36;
    node.addChild(label);

    this.container.addChild(node);
    this.particles.push({
      node,
      vel: new Vec2(randRange(-40, 40), randRange(-170, -120)),
      life,
      maxLife: life,
      rotVel: 0,
      onUpdate: (n, t01) => {
        // pop then settle
        const s =
          t01 < 0.22
            ? lerp(0.72, 1.28, t01 / 0.22)
            : lerp(1.28, 1.0, (t01 - 0.22) / 0.78);
        n.scale.set(s);
        n.alpha = clamp(1 - t01 * 0.95, 0, 1);
      },
    });
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
