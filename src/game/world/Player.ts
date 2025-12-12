import { Container, Sprite, Texture } from 'pixi.js';
import { Vec2 } from '../math/Vec2';
import { clamp } from '../math/util';
import { EquipmentItem, StatKey } from '../equipment';
import { Weapon, WeaponId, weaponFactories } from '../weapons/Weapons';

export class Player {
  readonly display: Container;
  readonly sprite: Sprite;
  readonly shadow: Sprite;

  pos: Vec2;
  vel = Vec2.zero();

  readonly radius = 34;
  pickupRadius = 90;

  maxHp = 100;
  hp = 100;

  hpRegen = 0;
  armor = 0;
  luck = 0;

  level = 1;
  xp = 0;
  xpToNext = 8;
  private pendingLevelUps = 0;

  kills = 0;

  moveSpeed = 320;

  // global scaling for all spells
  damageMult = 1;
  cooldownMult = 1;
  areaMult = 1;

  // persistent upgrade levels by id
  statLevels: Record<string, number> = Object.create(null);

  private t = 0;

  private lastContactHitAt = -999;
  private contactIFrames = 0.7;

  private outOfCombatRegenDelay = 2.0;

  private hurtFlash = 0;

  weapons: Weapon[] = [];

  private readonly equipmentSlots: Array<EquipmentItem | null> = Array.from({ length: 8 }, () => null);

  private base: Record<StatKey, number> = {
    maxHp: 100,
    pickupRadius: 90,
    moveSpeed: 320,
    damageMult: 1,
    cooldownMult: 1,
    areaMult: 1,
    hpRegen: 0,
    armor: 0,
    luck: 0,
  };

  dead = false;

  constructor(opts: { texture: Texture; shadowTexture: Texture; pos: Vec2 }) {
    this.pos = opts.pos;

    this.display = new Container();

    this.shadow = new Sprite(opts.shadowTexture);
    this.shadow.anchor.set(0.5);
    this.shadow.x = 0;
    this.shadow.y = 95;
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

    this.recomputeStats();
  }

  update(dt: number, axis: { x: number; y: number }, now: number): void {
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
    this.sprite.rotation = moving ? axis.x * 0.06 : Math.sin(this.t * 2) * 0.015;

    // conservative regen: only out of combat
    if (this.hp < this.maxHp && this.hpRegen > 0 && now - this.lastContactHitAt >= this.outOfCombatRegenDelay) {
      this.hp = clamp(this.hp + this.hpRegen * dt, 0, this.maxHp);
    }

    // damage flash (no shader / no wobble)
    if (this.hurtFlash > 0) {
      this.hurtFlash = Math.max(0, this.hurtFlash - dt);
      this.sprite.tint = 0xffb3c1;
    } else {
      this.sprite.tint = 0xffffff;
    }
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

    const fusionOnly = new Set<WeaponId>(['stormcaller', 'astralBlades', 'glacialSingularity']);

    // upgrades
    for (const w of this.weapons) {
      if (w.level < w.maxLevel) pool.push({ id: w.id, kind: 'upgrade' });
    }

    // new weapons
    const all = Object.keys(weaponFactories) as WeaponId[];
    for (const id of all) {
      if (fusionOnly.has(id)) continue;
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
      this.base.maxHp += 6;
      this.recomputeStats();
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

    this.hurtFlash = 0.12;

    const red = this.getDamageReduction();
    const final = Math.max(1, Math.round(amount * (1 - red)));

    this.hp = clamp(this.hp - final, 0, this.maxHp);
    if (this.hp <= 0) this.dead = true;
  }

  getDamageReduction(): number {
    // 1 armor ~= 3% reduction, capped at 45%
    return clamp(this.armor * 0.03, 0, 0.45);
  }

  getEquipmentSlots(): ReadonlyArray<EquipmentItem | null> {
    return this.equipmentSlots;
  }

  tryEquip(item: EquipmentItem): boolean {
    const idx = this.equipmentSlots.findIndex((x) => x === null);
    if (idx < 0) return false;
    this.equipmentSlots[idx] = item;
    this.recomputeStats();
    return true;
  }

  discardEquipment(slotIndex: number): EquipmentItem | null {
    if (slotIndex < 0 || slotIndex >= this.equipmentSlots.length) return null;
    const it = this.equipmentSlots[slotIndex];
    if (!it) return null;
    this.equipmentSlots[slotIndex] = null;
    this.recomputeStats();
    return it;
  }

  addBase(stat: StatKey, add: number): void {
    this.base[stat] += add;
    this.recomputeStats();
  }

  mulBase(stat: 'damageMult' | 'cooldownMult' | 'areaMult', mult: number): void {
    this.base[stat] *= mult;
    this.recomputeStats();
  }

  private recomputeStats(): void {
    const add: Record<StatKey, number> = {
      maxHp: 0,
      pickupRadius: 0,
      moveSpeed: 0,
      damageMult: 0,
      cooldownMult: 0,
      areaMult: 0,
      hpRegen: 0,
      armor: 0,
      luck: 0,
    };

    const mult: Record<'damageMult' | 'cooldownMult' | 'areaMult', number> = {
      damageMult: 1,
      cooldownMult: 1,
      areaMult: 1,
    };

    for (const it of this.equipmentSlots) {
      if (!it) continue;

      for (const k of Object.keys(it.mods.add) as StatKey[]) {
        add[k] += it.mods.add[k] ?? 0;
      }

      for (const k of Object.keys(it.mods.mult) as Array<'damageMult' | 'cooldownMult' | 'areaMult'>) {
        mult[k] *= it.mods.mult[k] ?? 1;
      }
    }

    // Derived core stats
    this.maxHp = Math.max(1, Math.round(this.base.maxHp + add.maxHp));
    this.pickupRadius = Math.max(0, Math.round(this.base.pickupRadius + add.pickupRadius));
    this.moveSpeed = Math.max(10, Math.round(this.base.moveSpeed + add.moveSpeed));

    this.hpRegen = Math.max(0, this.base.hpRegen + add.hpRegen);
    this.armor = Math.max(0, this.base.armor + add.armor);
    this.luck = Math.max(0, this.base.luck + add.luck);

    this.damageMult = Math.max(0.1, this.base.damageMult * mult.damageMult);
    this.cooldownMult = clamp(this.base.cooldownMult * mult.cooldownMult, 0.35, 2.5);
    this.areaMult = clamp(this.base.areaMult * mult.areaMult, 0.4, 3.0);

    // Clamp HP to new max
    this.hp = clamp(this.hp, 0, this.maxHp);
  }
}
