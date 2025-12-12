import { Container, Sprite, Texture } from 'pixi.js';
import { Vec2 } from '../math/Vec2';
import { clamp } from '../math/util';
import { Weapon, WeaponId, weaponFactories } from '../weapons/Weapons';

export class Player {
  readonly display: Container;
  readonly sprite: Sprite;
  readonly shadow: Sprite;

  pos: Vec2;
  vel = Vec2.zero();

  readonly radius = 34;
  readonly pickupRadius = 90;

  maxHp = 100;
  hp = 100;

  level = 1;
  xp = 0;
  xpToNext = 8;
  private pendingLevelUps = 0;

  kills = 0;

  moveSpeed = 320;

  private t = 0;

  private lastContactHitAt = -999;
  private contactIFrames = 0.7;

  weapons: Weapon[] = [];

  dead = false;

  constructor(opts: { texture: Texture; shadowTexture: Texture; pos: Vec2 }) {
    this.pos = opts.pos;

    this.display = new Container();

    this.shadow = new Sprite(opts.shadowTexture);
    this.shadow.anchor.set(0.5);
    this.shadow.x = 0;
    this.shadow.y = 50;
    this.shadow.alpha = 0.55;

    this.sprite = new Sprite(opts.texture);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(1);
    this.sprite.x = 0;
    this.sprite.y = 0;

    this.display.x = this.pos.x;
    this.display.y = this.pos.y;
    this.display.addChild(this.shadow);
    this.display.addChild(this.sprite);
  }

  update(dt: number, axis: { x: number; y: number }): void {
    if (this.dead) return;

    this.t += dt;

    const desired = new Vec2(axis.x, axis.y).mul(this.moveSpeed);
    this.vel = desired;

    this.pos = this.pos.add(this.vel.mul(dt));

    this.display.x = this.pos.x;
    this.display.y = this.pos.y;

    const moving = axis.x !== 0 || axis.y !== 0;
    const bob = Math.sin(this.t * (moving ? 10 : 4)) * (moving ? 2.2 : 0.8);
    this.sprite.y = bob;
    this.shadow.alpha = moving ? 0.5 : 0.6;

    if (axis.x !== 0) {
      const sx = Math.sign(axis.x);
      this.sprite.scale.x = sx;
      this.shadow.scale.x = sx;
    }

    // tiny tilt feels like "步伐" 而不是海浪
    this.sprite.rotation = moving ? axis.x * 0.06 : Math.sin(this.t * 2) * 0.01;
  }

  addWeapon(id: WeaponId): void {
    const weapon = weaponFactories[id]();
    this.weapons.push(weapon);
  }

  upgradeWeapon(id: WeaponId): void {
    const w = this.weapons.find((x) => x.id === id);
    if (!w) {
      this.addWeapon(id);
      return;
    }
    w.level += 1;
    w.onLevelUp?.();
  }

  getUpgradeableWeaponPool(): { id: WeaponId; kind: 'new' | 'upgrade' }[] {
    const owned = new Set(this.weapons.map((w) => w.id));

    const pool: { id: WeaponId; kind: 'new' | 'upgrade' }[] = [];

    // upgrades
    for (const w of this.weapons) {
      if (w.level < w.maxLevel) pool.push({ id: w.id, kind: 'upgrade' });
    }

    // new weapons
    const all = Object.keys(weaponFactories) as WeaponId[];
    for (const id of all) {
      if (!owned.has(id)) pool.push({ id, kind: 'new' });
    }

    return pool;
  }

  gainXp(amount: number): void {
    if (this.dead) return;

    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.pendingLevelUps += 1;
      this.xpToNext = Math.floor(this.xpToNext * 1.28 + 2);

      // tiny growth
      this.maxHp += 6;
      this.hp = clamp(this.hp + 10, 0, this.maxHp);
    }
  }

  tryConsumeLevelUp(): boolean {
    if (this.pendingLevelUps <= 0) return false;
    this.pendingLevelUps -= 1;
    return true;
  }

  canTakeContactHit(now: number): boolean {
    return now - this.lastContactHitAt >= this.contactIFrames;
  }

  takeDamage(amount: number, now: number): void {
    if (this.dead) return;
    this.lastContactHitAt = now;

    this.hp = clamp(this.hp - amount, 0, this.maxHp);
    if (this.hp <= 0) this.dead = true;
  }
}
