import { Texture } from 'pixi.js';

export type EquipmentRarity = 'common' | 'magic' | 'rare' | 'legend';

export type StatKey =
  | 'maxHp'
  | 'pickupRadius'
  | 'moveSpeed'
  | 'damageMult'
  | 'cooldownMult'
  | 'areaMult'
  | 'hpRegen'
  | 'armor'
  | 'luck';

export type StatMods = {
  add: Partial<Record<StatKey, number>>;
  mult: Partial<Record<StatKey, number>>;
};

export type EquipmentItem = {
  uid: string;
  rarity: EquipmentRarity;
  texture: Texture;
  name: string;
  mods: StatMods;
  lines: string[];
};
