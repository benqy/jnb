import { Vec2 } from '../math/Vec2';
import { clamp, sample } from '../math/util';
import { Monster } from '../world/Monster';
import { ParticleSystem } from '../world/ParticleSystem';
import { Player } from '../world/Player';
import { Projectile } from '../world/Projectile';

export type WeaponId = 'arcaneBolt' | 'orbitBlades' | 'nova' | 'chainLightning';

export type WeaponContext = {
  player: Player;
  monsters: Monster[];
  spawnProjectile: (p: Projectile) => void;
  fx: ParticleSystem;
};

export type Weapon = {
  id: WeaponId;
  name: string;
  desc: string;
  level: number;
  maxLevel: number;
  update: (dt: number, ctx: WeaponContext) => void;
  onLevelUp?: () => void;
};

function nearestMonster(player: Player, monsters: Monster[]): Monster | undefined {
  let best: Monster | undefined;
  let bestD = Infinity;
  for (const m of monsters) {
    if (m.dead) continue;
    const d = m.pos.sub(player.pos).len();
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

export const weaponFactories: Record<WeaponId, () => Weapon> = {
  arcaneBolt: () => {
    let cd = 0;

    const w: Weapon = {
      id: 'arcaneBolt',
      name: '奥术弹',
      desc: '自动追踪最近敌人，穿透并击退。',
      level: 1,
      maxLevel: 6,
      update: (dt, ctx) => {
        cd -= dt;

        const rate = 0.85 - (w.level - 1) * 0.08;
        if (cd > 0) return;
        cd = clamp(rate, 0.25, 0.85);

        const target = nearestMonster(ctx.player, ctx.monsters);
        if (!target) return;

        const dir = target.pos.sub(ctx.player.pos).norm();
        const speed = 720 + w.level * 45;
        const dmg = 10 + w.level * 5;

        const p = new Projectile({
          pos: ctx.player.pos.add(dir.mul(54)),
          vel: dir.mul(speed),
          radius: 10,
          damage: dmg,
          pierce: clamp(0 + Math.floor((w.level - 1) / 2), 0, 2),
          life: 1.2,
          color: 0x7ad1ff,
          knockbackDir: dir,
          knockback: 520 + w.level * 60,
        });

        ctx.fx.burstText({
          pos: ctx.player.pos.add(dir.mul(36)),
          text: '✧',
          color: 0x7ad1ff,
          count: 6,
          speed: 180,
          life: 0.18,
        });

        ctx.spawnProjectile(p);
      },
    };

    return w;
  },

  orbitBlades: () => {
    let t = 0;
    let tick = 0;
    let vfxTick = 0;

    const w: Weapon = {
      id: 'orbitBlades',
      name: '环刃',
      desc: '多把刀刃绕身旋转，持续切割近身敌人。',
      level: 1,
      maxLevel: 6,
      update: (dt, ctx) => {
        t += dt;
        tick -= dt;
        vfxTick -= dt;

        const blades = clamp(2 + Math.floor((w.level - 1) / 2), 2, 6);
        const r = 84 + w.level * 6;
        const rotSpeed = 2.2 + w.level * 0.18;
        const dmg = 6 + w.level * 4;

        // keep VFX obvious (continuous)
        const doVfx = vfxTick <= 0;
        if (doVfx) vfxTick = 0.05;

        for (let i = 0; i < blades; i++) {
          const a = (i / blades) * Math.PI * 2 + t * rotSpeed;
          const pos = ctx.player.pos.add(new Vec2(Math.cos(a), Math.sin(a)).mul(r));

          if (doVfx) {
            ctx.fx.bladeSlash({ pos, angle: a + Math.PI / 2, color: 0xd8ff6a, life: 0.14 });
          }

          // periodic damage check (acts like continuous blades)
          if (tick <= 0) {
            for (const m of ctx.monsters) {
              if (m.dead) continue;
              const d = m.pos.sub(pos).len();
              if (d < 44) {
                const knock = m.pos.sub(ctx.player.pos).norm();
                m.hit(dmg, knock, 260);
                ctx.fx.hitSpark({ pos, color: 0xd8ff6a, strength: 0.8 });
              }
            }
          }
        }

        if (tick <= 0) {
          tick = clamp(0.18 - w.level * 0.015, 0.06, 0.18);
        }
      },
    };

    return w;
  },

  nova: () => {
    let cd = 0;

    const w: Weapon = {
      id: 'nova',
      name: '星爆',
      desc: '周期性释放冲击波，对范围内敌人造成伤害并击退。',
      level: 1,
      maxLevel: 6,
      update: (dt, ctx) => {
        cd -= dt;
        if (cd > 0) return;

        cd = clamp(6.5 - w.level * 0.7, 2.6, 6.5);
        const radius = 180 + w.level * 55;
        const dmg = 16 + w.level * 10;

        // VFX: obvious expanding shockwave ring
        ctx.fx.shockwave({ pos: ctx.player.pos, radius, color: 0xbfe8ff, life: 0.45 });
        ctx.fx.burstText({
          pos: ctx.player.pos,
          text: '✺',
          color: 0xbfe8ff,
          count: 10,
          speed: 260,
          life: 0.25,
        });

        // Damage
        for (const m of ctx.monsters) {
          if (m.dead) continue;
          const d = m.pos.sub(ctx.player.pos);
          const dist = d.len();
          if (dist <= radius) {
            m.hit(dmg, d.norm(), 760);
          }
        }
      },
    };

    return w;
  },

  chainLightning: () => {
    let cd = 0;

    const w: Weapon = {
      id: 'chainLightning',
      name: '链式闪电',
      desc: '命中最近敌人并弹射至多个目标。',
      level: 1,
      maxLevel: 6,
      update: (dt, ctx) => {
        cd -= dt;
        if (cd > 0) return;

        cd = clamp(3.8 - w.level * 0.35, 1.6, 3.8);

        const first = nearestMonster(ctx.player, ctx.monsters);
        if (!first) return;

        const jumps = clamp(2 + Math.floor((w.level - 1) / 2), 2, 6);
        const range = 260 + w.level * 40;
        const dmg = 14 + w.level * 7;

        const hit: Monster[] = [];
        let from = ctx.player.pos;
        let current: Monster | undefined = first;

        for (let j = 0; j < jumps && current; j++) {
          hit.push(current);

          const dir = current.pos.sub(from).norm();
          current.hit(dmg, dir, 420);

          // VFX: bright beam (very visible)
          ctx.fx.beam({ from, to: current.pos, color: 0x9cf8ff, life: 0.12, width: 3 });

          // VFX: lightning glyphs along the segment
          const seg = current.pos.sub(from);
          const segLen = seg.len();
          const steps = clamp(Math.floor(segLen / 38), 3, 12);
          for (let i = 0; i <= steps; i++) {
            const p = from.add(seg.mul(i / steps));
            ctx.fx.burstText({
              pos: p,
              text: sample(['⚡', '⟐', '✦', '╱', '╲']),
              color: 0x9cf8ff,
              count: 1,
              speed: 30,
              life: 0.12,
            });
          }

          ctx.fx.hitSpark({ pos: current.pos, color: 0x9cf8ff, strength: 1.1 });

          from = current.pos;

          // next target near current, excluding already hit
          let best: Monster | undefined;
          let bestD = Infinity;
          for (const m of ctx.monsters) {
            if (m.dead) continue;
            if (hit.includes(m)) continue;
            const d = m.pos.sub(from).len();
            if (d < bestD && d <= range) {
              bestD = d;
              best = m;
            }
          }
          current = best;
        }
      },
    };

    return w;
  },
};

export const weaponMeta: Record<WeaponId, { name: string; desc: string }> = {
  arcaneBolt: { name: '奥术弹', desc: '自动追踪最近敌人，穿透并击退。' },
  orbitBlades: { name: '环刃', desc: '多把刀刃绕身旋转，持续切割近身敌人。' },
  nova: { name: '星爆', desc: '周期性释放冲击波，对范围内敌人造成伤害并击退。' },
  chainLightning: { name: '链式闪电', desc: '命中最近敌人并弹射至多个目标。' },
};
