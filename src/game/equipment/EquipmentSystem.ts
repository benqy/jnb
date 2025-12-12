import { Assets, Texture } from 'pixi.js';
import { clamp } from '../math/util';
import { EquipmentItem, EquipmentRarity, StatKey, StatMods } from './types';
import { PROJECT_ROOT } from '../../config';

export const equipmentConfig: Record<EquipmentRarity, { dir: string; files: string[]; affixes: number }> = {
  common: { dir: 'common', files: ['0.png', '1.png', '2.png', '3.png', '4.png', '5.png'], affixes: 1 },
  magic: { dir: 'magic', files: ['0.png', '1.png', '2.png', '3.png', '4.png', '5.png'], affixes: 2 },
  rare: { dir: 'rare', files: ['0.png', '1.png', '2.png', '3.png', '4.png', '5.png'], affixes: 3 },
  // folder is currently misspelled in assets: "lengend"
  legend: { dir: 'lengend', files: ['0.png', '1.png', '2.png', '3.png', '4.png', '5.png'], affixes: 4 },
};

export const equipmentRarityName: Record<EquipmentRarity, string> = {
  common: '普通',
  magic: '魔法',
  rare: '稀有',
  legend: '暗金',
};

export const equipmentRarityColor: Record<EquipmentRarity, number> = {
  common: 0xc7d0df,
  magic: 0x6aa8ff,
  rare: 0xffd45a,
  legend: 0xff8a3d,
};

export type EquipmentTextures = Record<EquipmentRarity, Texture[]>;

export async function loadEquipmentTextures(): Promise<EquipmentTextures> {
  const out = {
    common: [] as Texture[],
    magic: [] as Texture[],
    rare: [] as Texture[],
    legend: [] as Texture[],
  } satisfies EquipmentTextures;

  for (const r of Object.keys(equipmentConfig) as EquipmentRarity[]) {
    const cfg = equipmentConfig[r];
    for (const f of cfg.files) {
      const path = `${PROJECT_ROOT}images/equipment/${cfg.dir}/${f}`;
      out[r].push(await Assets.load(path));
    }
  }

  return out;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function pick<T>(arr: T[]): T {
  return arr[(Math.random() * arr.length) | 0];
}

function rarityByLuck(luck: number): EquipmentRarity {
  // Base weights tuned for frequent commons and rare "wow" moments.
  // Luck shifts odds gently toward higher rarities.
  const l = clamp(luck, 0, 12);
  const commonW = 0.74 - l * 0.02;
  const magicW = 0.22 + l * 0.012;
  const rareW = 0.038 + l * 0.006;
  const legendW = 0.002 + l * 0.002;

  const c = clamp(commonW, 0.45, 0.85);
  const m = clamp(magicW, 0.12, 0.32);
  const r = clamp(rareW, 0.02, 0.16);
  const g = clamp(legendW, 0.001, 0.04);
  const sum = c + m + r + g;

  const t = Math.random() * sum;
  if (t < c) return 'common';
  if (t < c + m) return 'magic';
  if (t < c + m + r) return 'rare';
  return 'legend';
}

type AffixDef = {
  key: StatKey;
  kind: 'add' | 'mult';
  // For kind=mult, these are percentage deltas (e.g. 0.06 -> +6%, -0.05 -> -5% cooldown)
  ranges: Record<EquipmentRarity, [number, number]>;
  label: (v: number) => string;
};

const affixes: AffixDef[] = [
  {
    key: 'maxHp',
    kind: 'add',
    ranges: {
      common: [10, 18],
      magic: [18, 32],
      rare: [30, 55],
      legend: [50, 85],
    },
    label: (v) => `生命上限 +${Math.round(v)}`,
  },
  {
    key: 'hpRegen',
    kind: 'add',
    ranges: {
      common: [0.25, 0.45],
      magic: [0.4, 0.75],
      rare: [0.7, 1.15],
      legend: [1.1, 1.8],
    },
    label: (v) => `生命恢复 +${v.toFixed(2)}/秒`,
  },
  {
    key: 'armor',
    kind: 'add',
    ranges: {
      common: [0.6, 1.2],
      magic: [1.0, 2.0],
      rare: [1.8, 3.2],
      legend: [3.0, 4.8],
    },
    label: (v) => `护甲 +${v.toFixed(1)}`,
  },
  {
    key: 'moveSpeed',
    kind: 'add',
    ranges: {
      common: [10, 18],
      magic: [16, 28],
      rare: [24, 42],
      legend: [38, 62],
    },
    label: (v) => `移速 +${Math.round(v)}`,
  },
  {
    key: 'pickupRadius',
    kind: 'add',
    ranges: {
      common: [10, 18],
      magic: [16, 28],
      rare: [24, 42],
      legend: [38, 62],
    },
    label: (v) => `拾取范围 +${Math.round(v)}`,
  },
  {
    key: 'damageMult',
    kind: 'mult',
    ranges: {
      common: [0.03, 0.06],
      magic: [0.05, 0.09],
      rare: [0.08, 0.13],
      legend: [0.12, 0.18],
    },
    label: (v) => `伤害 +${Math.round(v * 100)}%`,
  },
  {
    key: 'cooldownMult',
    kind: 'mult',
    ranges: {
      common: [-0.03, -0.05],
      magic: [-0.04, -0.07],
      rare: [-0.06, -0.1],
      legend: [-0.09, -0.14],
    },
    label: (v) => `冷却 ${v < 0 ? '-' : '+'}${Math.round(Math.abs(v) * 100)}%`,
  },
  {
    key: 'areaMult',
    kind: 'mult',
    ranges: {
      common: [0.03, 0.06],
      magic: [0.05, 0.09],
      rare: [0.08, 0.13],
      legend: [0.12, 0.18],
    },
    label: (v) => `范围 +${Math.round(v * 100)}%`,
  },
  {
    key: 'luck',
    kind: 'add',
    ranges: {
      common: [0.2, 0.5],
      magic: [0.4, 0.9],
      rare: [0.8, 1.5],
      legend: [1.2, 2.4],
    },
    label: (v) => `幸运 +${v.toFixed(1)}`,
  },
];

function randRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function rollAffixes(rarity: EquipmentRarity, count: number): { mods: StatMods; lines: string[] } {
  const chosen: AffixDef[] = [];
  const pool = [...affixes];

  while (chosen.length < count && pool.length > 0) {
    const idx = (Math.random() * pool.length) | 0;
    chosen.push(pool[idx]);
    pool.splice(idx, 1);
  }

  const mods: StatMods = { add: {}, mult: {} };
  const lines: string[] = [];

  for (const a of chosen) {
    const [min, max] = a.ranges[rarity];
    const raw = randRange(min, max);

    if (a.kind === 'add') {
      const v = a.key === 'hpRegen' || a.key === 'luck' || a.key === 'armor' ? raw : Math.round(raw);
      mods.add[a.key] = (mods.add[a.key] ?? 0) + v;
      lines.push(a.label(v));
    } else {
      // store as multiplier on the player's multiplier stat
      // e.g. +6% damage => mult *= 1.06 ; -5% cooldown => mult *= 0.95
      const pct = raw;
      const mult = 1 + pct;
      mods.mult[a.key] = (mods.mult[a.key] ?? 1) * mult;
      lines.push(a.label(pct));
    }
  }

  return { mods, lines };
}

export function rollEquipment(opts: {
  luck: number;
  textures: EquipmentTextures;
}): EquipmentItem {
  const rarity = rarityByLuck(opts.luck);
  const texList = opts.textures[rarity];
  const texture = texList.length > 0 ? pick(texList) : Texture.WHITE;

  const cfg = equipmentConfig[rarity];
  const rolled = rollAffixes(rarity, cfg.affixes);

  return {
    uid: uid(),
    rarity,
    texture,
    name: `${equipmentRarityName[rarity]} 装备`,
    mods: rolled.mods,
    lines: rolled.lines,
  };
}
