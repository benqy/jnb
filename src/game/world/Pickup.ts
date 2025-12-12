import { Container, Graphics, Text } from 'pixi.js';
import { Vec2 } from '../math/Vec2';
import { clamp } from '../math/util';
import { Player } from './Player';

export class Pickup {
  readonly display: Container;
  pos: Vec2;
  radius: number;
  dead = false;

  private t = 0;

  private readonly kind: 'xp';
  private readonly amount: number;

  private constructor(opts: { pos: Vec2; amount: number }) {
    this.kind = 'xp';
    this.amount = opts.amount;
    this.pos = opts.pos;
    this.radius = 18;

    this.display = new Container();
    this.display.x = this.pos.x;
    this.display.y = this.pos.y;

    const g = new Graphics();
    g.circle(0, 0, 10);
    g.fill({ color: 0x6bd0ff, alpha: 0.85 });
    g.circle(0, 0, 18);
    g.fill({ color: 0x6bd0ff, alpha: 0.18 });
    this.display.addChild(g);

    const label = new Text({
      text: String(this.amount),
      style: { fill: 0xcff3ff, fontSize: 12 },
    });
    label.anchor.set(0.5);
    label.y = -20;
    label.alpha = 0.85;
    this.display.addChild(label);
  }

  static makeXp(opts: { pos: Vec2; amount: number }): Pickup {
    return new Pickup(opts);
  }

  update(dt: number, player: Player): void {
    if (this.dead) return;

    this.t += dt;

    const bob = Math.sin(this.t * 4) * 3;
    this.display.y = this.pos.y + bob;

    // magnetic pickup
    const toPlayer = player.pos.sub(this.pos);
    const dist = toPlayer.len();
    if (dist < 260) {
      const pull = clamp((260 - dist) / 260, 0, 1);
      this.pos = this.pos.add(toPlayer.norm().mul((120 + pull * 520) * dt));
      this.display.x = this.pos.x;
      this.display.y = this.pos.y + bob;
    }
  }

  collect(player: Player): void {
    if (this.kind === 'xp') {
      player.gainXp(this.amount);
    }
  }
}
