import { clamp } from '../math/util';
import { Player } from '../world/Player';
import { WeaponId, weaponMeta } from '../weapons/Weapons';

export type StatId = 'maxHp' | 'pickupRadius' | 'moveSpeed' | 'damage' | 'cooldown' | 'area';
export type FusionId = 'stormcaller' | 'astralBlades' | 'glacialSingularity';

export type UpgradeChoice =
  | {
      type: 'weapon';
      weaponId: WeaponId;
      kind: 'new' | 'upgrade';
      title: string;
      desc: string;
    }
  | {
      type: 'stat';
      statId: StatId;
      title: string;
      desc: string;
    }
  | {
      type: 'fusion';
      fusionId: FusionId;
      title: string;
      desc: string;
    };

const statDefs: Record<
  StatId,
  {
    name: string;
    maxLevel: number;
    desc: (nextLevel: number) => string;
    apply: (player: Player, nextLevel: number) => void;
  }
> = {
  maxHp: {
    name: '生命上限',
    maxLevel: 10,
    desc: () => '最大生命 +18，并立刻回复 18。',
    apply: (p) => {
      p.maxHp += 18;
      p.hp = clamp(p.hp + 18, 0, p.maxHp);
    },
  },
  pickupRadius: {
    name: '拾取范围',
    maxLevel: 10,
    desc: () => '拾取范围 +18。',
    apply: (p) => {
      p.pickupRadius += 18;
    },
  },
  moveSpeed: {
    name: '移速',
    maxLevel: 8,
    desc: () => '移速 +24。',
    apply: (p) => {
      p.moveSpeed += 24;
    },
  },
  damage: {
    name: '伤害',
    maxLevel: 10,
    desc: () => '所有法术伤害 +10%。',
    apply: (p) => {
      p.damageMult *= 1.1;
    },
  },
  cooldown: {
    name: '冷却',
    maxLevel: 10,
    desc: () => '所有法术冷却 -8%。',
    apply: (p) => {
      p.cooldownMult *= 0.92;
    },
  },
  area: {
    name: '范围',
    maxLevel: 8,
    desc: () => '范围与射程 +10%。',
    apply: (p) => {
      p.areaMult *= 1.1;
    },
  },
};

const fusionDefs: Record<
  FusionId,
  {
    name: string;
    desc: string;
    requires: WeaponId[];
    grants: WeaponId;
  }
> = {
  stormcaller: {
    name: '风暴主宰',
    desc: '融合（两者≥Lv3）：链式闪电 + 星爆 → 风暴主宰（天雷连坠，分叉电弧）。',
    requires: ['chainLightning', 'nova'],
    grants: 'stormcaller',
  },
  astralBlades: {
    name: '星界刀阵',
    desc: '融合（两者≥Lv3）：奥术弹 + 环刃 → 星界刀阵（刀阵环绕 + 齐射飞刃）。',
    requires: ['arcaneBolt', 'orbitBlades'],
    grants: 'astralBlades',
  },
  glacialSingularity: {
    name: '霜核奇点',
    desc: '融合（两者≥Lv3）：寒霜裂片 + 引力坍缩 → 霜核奇点（牵引坍缩 + 冰晶爆裂）。',
    requires: ['frostShards', 'gravityWell'],
    grants: 'glacialSingularity',
  },
};

function getStatLevel(player: Player, statId: StatId): number {
  return player.statLevels[statId] ?? 0;
}

function canUpgradeStat(player: Player, statId: StatId): boolean {
  return getStatLevel(player, statId) < statDefs[statId].maxLevel;
}

export function getUpgradePool(player: Player): UpgradeChoice[] {
  const pool: UpgradeChoice[] = [];

  // fusion (highest priority)
  for (const fid of Object.keys(fusionDefs) as FusionId[]) {
    const f = fusionDefs[fid];
    const already = player.weapons.some((w) => w.id === f.grants);
    if (already) continue;
    const ok = f.requires.every((id) => isWeaponAtLeast(player, id, 3));
    if (!ok) continue;
    pool.push({
      type: 'fusion',
      fusionId: fid,
      title: `融合：${f.name}`,
      desc: f.desc,
    });
  }

  // weapons
  for (const w of player.getUpgradeableWeaponPool()) {
    const meta = weaponMeta[w.id];
    const kindText = w.kind === 'new' ? '学习' : '强化';
    pool.push({
      type: 'weapon',
      weaponId: w.id,
      kind: w.kind,
      title: `${kindText}：${meta.name}`,
      desc: meta.desc,
    });
  }

  // stats
  const stats: StatId[] = ['maxHp', 'pickupRadius', 'moveSpeed', 'damage', 'cooldown', 'area'];
  for (const statId of stats) {
    if (!canUpgradeStat(player, statId)) continue;
    const nextLevel = getStatLevel(player, statId) + 1;
    pool.push({
      type: 'stat',
      statId,
      title: `强化：${statDefs[statId].name} Lv${nextLevel}`,
      desc: statDefs[statId].desc(nextLevel),
    });
  }

  return pool;
}

export function applyUpgradeChoice(player: Player, choice: UpgradeChoice): void {
  if (choice.type === 'weapon') {
    if (choice.kind === 'new') player.addWeapon(choice.weaponId);
    else player.upgradeWeapon(choice.weaponId);
    return;
  }

  if (choice.type === 'stat') {
    const current = getStatLevel(player, choice.statId);
    const next = current + 1;
    player.statLevels[choice.statId] = next;
    statDefs[choice.statId].apply(player, next);
    return;
  }

  if (choice.type === 'fusion') {
    const f = fusionDefs[choice.fusionId];
    // consume ingredients
    player.weapons = player.weapons.filter((w) => !f.requires.includes(w.id));
    // grant super
    if (!player.weapons.some((w) => w.id === f.grants)) {
      player.addWeapon(f.grants);
    }
  }
}

export function isWeaponMaxed(player: Player, id: WeaponId): boolean {
  const w = player.weapons.find((x) => x.id === id);
  return !!w && w.level >= w.maxLevel;
}

export function isWeaponAtLeast(player: Player, id: WeaponId, level: number): boolean {
  const w = player.weapons.find((x) => x.id === id);
  return !!w && w.level >= level;
}
