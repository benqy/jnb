import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { Vec2 } from '../math/Vec2';
import { clamp } from '../math/util';
import { EquipmentItem, equipmentRarityColor } from '../equipment';
import { Player } from './Player';

export class Pickup {
  readonly display: Container;
  pos: Vec2;
  radius: number;
  dead = false;

  private t = 0;

  private readonly kind: 'xp' | 'equipment';
  private readonly amount?: number;
  private readonly item?: EquipmentItem;

  private constructor(opts: { pos: Vec2; amount: number } | { pos: Vec2; item: EquipmentItem }) {
    this.kind = 'amount' in opts ? 'xp' : 'equipment';
    this.pos = opts.pos;
    this.radius = this.kind === 'xp' ? 18 : 22;

    this.display = new Container();
    this.display.x = this.pos.x;
    this.display.y = this.pos.y;

    if (this.kind === 'xp') {
      const amount = (opts as { pos: Vec2; amount: number }).amount;
      this.amount = amount;

      const g = new Graphics();
      g.circle(0, 0, 10);
      g.fill({ color: 0x6bd0ff, alpha: 0.85 });
      g.circle(0, 0, 18);
      g.fill({ color: 0x6bd0ff, alpha: 0.18 });
      this.display.addChild(g);

      const label = new Text({
        text: String(amount),
        style: { fill: 0xcff3ff, fontSize: 12 },
      });
      label.anchor.set(0.5);
      label.y = -20;
      label.alpha = 0.85;
      this.display.addChild(label);
    } else {
      const item = (opts as { pos: Vec2; item: EquipmentItem }).item;
      this.item = item;

      const col = equipmentRarityColor[item.rarity];

      const ring = new Graphics();
      ring.roundRect(-18, -18, 36, 36, 10);
      ring.fill({ color: 0x050612, alpha: 0.55 });
      ring.stroke({ width: 2, color: col, alpha: 0.9 });
      this.display.addChild(ring);

      const icon = new Sprite(item.texture);
      icon.anchor.set(0.5);
      icon.scale.set(0.55);
      this.display.addChild(icon);

      const glow = new Graphics();
      glow.circle(0, 0, 22);
      glow.fill({ color: col, alpha: 0.1 });
      this.display.addChildAt(glow, 0);
    }
  }

  static makeXp(opts: { pos: Vec2; amount: number }): Pickup {
    return new Pickup(opts);
  }

  static makeEquipment(opts: { pos: Vec2; item: EquipmentItem }): Pickup {
    return new Pickup(opts);
  }

  isEquipment(): boolean {
    return this.kind === 'equipment';
  }

  getItem(): EquipmentItem | undefined {
    return this.item;
  }

  update(dt: number, player: Player): void {
    if (this.dead) return;

    this.t += dt;

    const bob = Math.sin(this.t * 4) * 3;
    this.display.y = this.pos.y + bob;

    // magnetic pickup
    const toPlayer = player.pos.sub(this.pos);
    const dist = toPlayer.len();
    const mag = Math.max(260, player.pickupRadius * 3);
    if (dist < mag) {
      const pull = clamp((mag - dist) / mag, 0, 1);
      this.pos = this.pos.add(toPlayer.norm().mul((120 + pull * 520) * dt));
      this.display.x = this.pos.x;
      this.display.y = this.pos.y + bob;
    }
  }

  collect(player: Player): boolean {
    if (this.kind === 'xp') {
      player.gainXp(this.amount ?? 0);
      return true;
    }

    if (this.kind === 'equipment') {
      if (!this.item) return false;
      return player.tryEquip(this.item);
    }

    return false;
  }
}
