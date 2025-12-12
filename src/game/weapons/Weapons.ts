import { Vec2 } from '../math/Vec2';
import { clamp, randRange } from '../math/util';
import { Monster } from '../world/Monster';
import { ParticleSystem } from '../world/ParticleSystem';
import { Player } from '../world/Player';
import { Projectile } from '../world/Projectile';

export type WeaponId =
  | 'arcaneBolt'
  | 'orbitBlades'
  | 'nova'
  | 'chainLightning'
  | 'fireTrail'
  | 'frostShards'
  | 'gravityWell'
  | 'stormcaller'
  | 'astralBlades'
  | 'glacialSingularity';

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
      maxLevel: 5,
      update: (dt, ctx) => {
        cd -= dt;

        const rate = 0.85 - (w.level - 1) * 0.08;
        if (cd > 0) return;
        cd = clamp(rate * ctx.player.cooldownMult, 0.18, 0.95);

        const target = nearestMonster(ctx.player, ctx.monsters);
        if (!target) return;

        const dir = target.pos.sub(ctx.player.pos).norm();
        const speed = (720 + w.level * 45) * (0.95 + ctx.player.areaMult * 0.05);
        const dmg = (10 + w.level * 5) * ctx.player.damageMult;

        const p = new Projectile({
          pos: ctx.player.pos.add(dir.mul(54)),
          vel: dir.mul(speed),
          radius: 10,
          damage: Math.round(dmg),
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
      maxLevel: 5,
      update: (dt, ctx) => {
        t += dt;
        tick -= dt;
        vfxTick -= dt;

        const blades = clamp(2 + Math.floor((w.level - 1) / 2), 2, 6);
        const r = (84 + w.level * 6) * ctx.player.areaMult;
        const rotSpeed = 2.2 + w.level * 0.18;
        const dmg = (6 + w.level * 4) * ctx.player.damageMult;

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
                m.hit(Math.round(dmg), knock, 260);
                ctx.fx.damageNumber({ pos: m.pos, value: dmg, color: 0xd8ff6a, size: 18 });
                ctx.fx.hitSpark({ pos, color: 0xd8ff6a, strength: 0.8 });
              }
            }
          }
        }

        if (tick <= 0) {
          tick = clamp((0.18 - w.level * 0.015) * ctx.player.cooldownMult, 0.045, 0.22);
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
      maxLevel: 5,
      update: (dt, ctx) => {
        cd -= dt;
        if (cd > 0) return;

        cd = clamp((6.5 - w.level * 0.7) * ctx.player.cooldownMult, 1.8, 7.2);
        const radius = (180 + w.level * 55) * ctx.player.areaMult;
        const dmg = (16 + w.level * 10) * ctx.player.damageMult;

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
            m.hit(Math.round(dmg), d.norm(), 760);
            ctx.fx.damageNumber({ pos: m.pos, value: dmg, color: 0xbfe8ff, size: 20 });
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
      maxLevel: 5,
      update: (dt, ctx) => {
        cd -= dt;
        if (cd > 0) return;

        cd = clamp((3.8 - w.level * 0.35) * ctx.player.cooldownMult, 1.05, 4.2);

        const first = nearestMonster(ctx.player, ctx.monsters);
        if (!first) return;

        const jumps = clamp(2 + Math.floor((w.level - 1) / 2), 2, 6);
        const range = (260 + w.level * 40) * ctx.player.areaMult;
        const dmg = (14 + w.level * 7) * ctx.player.damageMult;

        const hit: Monster[] = [];
        let from = ctx.player.pos;
        let current: Monster | undefined = first;

        for (let j = 0; j < jumps && current; j++) {
          hit.push(current);

          const dir = current.pos.sub(from).norm();
          current.hit(Math.round(dmg), dir, 420);
          ctx.fx.damageNumber({ pos: current.pos, value: dmg, color: 0x9cf8ff, size: 19 });

          // VFX: jagged multi-layer lightning + impact burst
          ctx.fx.lightningArc({
            from,
            to: current.pos,
            color: 0x9cf8ff,
            life: 0.14,
            width: 2.6,
            segments: 12,
            chaos: 22,
            branches: 2,
          });
          ctx.fx.hitSpark({ pos: current.pos, color: 0x9cf8ff, strength: 1.35 });

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

  fireTrail: () => {
    let spawn = 0;

    type Ember = { pos: Vec2; life: number; tick: number };
    const embers: Ember[] = [];

    const w: Weapon = {
      id: 'fireTrail',
      name: '烈焰足迹',
      desc: '移动时留下燃烧路径，灼烧靠近的敌人。',
      level: 1,
      maxLevel: 5,
      update: (dt, ctx) => {
        spawn -= dt;

        const moving = ctx.player.vel.len() > 1;
        const spawnRate = clamp((moving ? 0.07 : 0.18) * ctx.player.cooldownMult, 0.04, 0.22);
        const radius = (54 + w.level * 6) * ctx.player.areaMult;
        const dmg = (4 + w.level * 3) * ctx.player.damageMult;

        if (spawn <= 0 && moving) {
          spawn = spawnRate;
          embers.push({ pos: ctx.player.pos, life: 1.15, tick: 0 });
          ctx.fx.flamePuff({ pos: ctx.player.pos, color: 0xff7a2a, life: 0.55, size: 26 });
        }

        // update embers
        for (const e of embers) {
          e.life -= dt;
          e.tick -= dt;
          if (e.tick <= 0) {
            e.tick = 0.2;
            for (const m of ctx.monsters) {
              if (m.dead) continue;
              const d = m.pos.sub(e.pos).len();
              if (d <= radius) {
                const dir = m.pos.sub(e.pos).norm();
                m.hit(Math.round(dmg), dir, 120);
                ctx.fx.damageNumber({ pos: m.pos, value: dmg, color: 0xffc36b, size: 16 });
                ctx.fx.hitSpark({ pos: m.pos, color: 0xffa34a, strength: 0.65 });
              }
            }
          }

          // subtle visible flame pulse
          if (Math.random() < dt * 3) ctx.fx.flamePuff({ pos: e.pos, color: 0xff7a2a, life: 0.42, size: 22 });
        }

        // prune
        for (let i = embers.length - 1; i >= 0; i--) {
          if (embers[i].life <= 0) embers.splice(i, 1);
        }
      },
    };

    return w;
  },

  frostShards: () => {
    let cd = 0;

    const w: Weapon = {
      id: 'frostShards',
      name: '寒霜裂片',
      desc: '朝目标方向喷射多枚冰晶裂片，形成扇形弹幕。',
      level: 1,
      maxLevel: 5,
      update: (dt, ctx) => {
        cd -= dt;
        if (cd > 0) return;

        cd = clamp((1.2 - w.level * 0.09) * ctx.player.cooldownMult, 0.45, 1.25);

        const target = nearestMonster(ctx.player, ctx.monsters);
        if (!target) return;

        const base = target.pos.sub(ctx.player.pos).norm();
        const shards = clamp(4 + Math.floor(w.level / 2), 4, 8);
        const spread = 0.26 + w.level * 0.02;
        const speed = 680 + w.level * 30;
        const dmg = (10 + w.level * 5) * ctx.player.damageMult;

        for (let i = 0; i < shards; i++) {
          const u = shards <= 1 ? 0 : i / (shards - 1);
          const ang = (u - 0.5) * spread;
          const dir = base.rot(ang);

          const p = new Projectile({
            pos: ctx.player.pos.add(dir.mul(54)),
            vel: dir.mul(speed),
            radius: 9,
            damage: Math.round(dmg),
            pierce: clamp(0 + Math.floor((w.level - 1) / 2), 0, 2),
            life: 1.05,
            color: 0x7ad1ff,
            knockbackDir: dir,
            knockback: 420,
            shape: 'shard',
            spin: 0,
          });
          ctx.spawnProjectile(p);
        }

        // icy muzzle burst
        ctx.fx.hitSpark({ pos: ctx.player.pos.add(base.mul(44)), color: 0x7ad1ff, strength: 1.25 });
        ctx.fx.burstText({
          pos: ctx.player.pos.add(base.mul(44)),
          text: '❄',
          color: 0xbfe8ff,
          count: 3,
          speed: 80,
          life: 0.22,
        });
      },
    };

    return w;
  },

  gravityWell: () => {
    let cd = 0;

    type Well = { pos: Vec2; life: number; tick: number };
    const wells: Well[] = [];

    const w: Weapon = {
      id: 'gravityWell',
      name: '引力坍缩',
      desc: '周期性生成引力井，拉扯并碾碎范围内敌人。',
      level: 1,
      maxLevel: 5,
      update: (dt, ctx) => {
        cd -= dt;
        if (cd <= 0) {
          cd = clamp((5.2 - w.level * 0.55) * ctx.player.cooldownMult, 1.9, 5.8);
          const pos = ctx.player.pos;
          wells.push({ pos, life: 1.15, tick: 0 });
          ctx.fx.implosion({ pos, radius: 260 * ctx.player.areaMult, color: 0xb39bff, life: 0.55 });
        }

        const radius = (220 + w.level * 26) * ctx.player.areaMult;
        const pull = 720 + w.level * 120;
        const dmg = (10 + w.level * 6) * ctx.player.damageMult;

        for (const well of wells) {
          well.life -= dt;
          well.tick -= dt;

          // visual pulse
          if (Math.random() < dt * 5) ctx.fx.hitSpark({ pos: well.pos, color: 0xb39bff, strength: 0.55 });

          for (const m of ctx.monsters) {
            if (m.dead) continue;
            const d = well.pos.sub(m.pos);
            const dist = d.len();
            if (dist > radius) continue;

            const dir = dist <= 1 ? new Vec2(1, 0) : d.mul(1 / dist);
            // pull via knockback velocity towards center
            m.knockVel = m.knockVel.add(dir.mul(pull * dt * (1 - dist / radius)));

            if (well.tick <= 0) {
              m.hit(Math.round(dmg), dir, 0);
              ctx.fx.damageNumber({ pos: m.pos, value: dmg, color: 0xb39bff, size: 17 });
              ctx.fx.hitSpark({ pos: m.pos, color: 0xb39bff, strength: 0.9 });
            }
          }

          if (well.tick <= 0) well.tick = 0.22;
        }

        for (let i = wells.length - 1; i >= 0; i--) {
          if (wells[i].life <= 0) wells.splice(i, 1);
        }
      },
    };

    return w;
  },

  stormcaller: () => {
    let cd = 0;

    const w: Weapon = {
      id: 'stormcaller',
      name: '风暴主宰',
      desc: '超进化：天雷连坠，分叉电弧轰击整片战场。',
      level: 1,
      maxLevel: 5,
      update: (dt, ctx) => {
        cd -= dt;
        if (cd > 0) return;

        cd = clamp((2.2 - w.level * 0.25) * ctx.player.cooldownMult, 1.0, 2.4);

        const range = 520 * ctx.player.areaMult;
        const strikes = clamp(2 + w.level, 2, 5);
        const dmg = (26 + w.level * 10) * ctx.player.damageMult;

        // pick random targets in range (prefer nearer)
        const candidates = ctx.monsters
          .filter((m) => !m.dead && m.pos.sub(ctx.player.pos).len() <= range)
          .sort((a, b) => a.pos.sub(ctx.player.pos).len() - b.pos.sub(ctx.player.pos).len());

        if (candidates.length === 0) return;

        for (let s = 0; s < strikes; s++) {
          const base = candidates[clamp(Math.floor(Math.random() * Math.min(10 + w.level * 4, candidates.length)), 0, candidates.length - 1)];

          // first impact
          base.hit(Math.round(dmg), base.pos.sub(ctx.player.pos).norm(), 520);
          ctx.fx.damageNumber({ pos: base.pos, value: dmg, color: 0xbfe8ff, size: 22 });
          ctx.fx.hitSpark({ pos: base.pos, color: 0xbfe8ff, strength: 1.8 });

          const skyFrom = base.pos.add(new Vec2(randRange(-40, 40), -260 - randRange(0, 140)));
          ctx.fx.lightningArc({
            from: skyFrom,
            to: base.pos,
            color: 0xbfe8ff,
            life: 0.18,
            width: 3.2,
            segments: 14,
            chaos: 30,
            branches: 3,
          });

          // small local chain around the impact
          let from = base.pos;
          const already = new Set([base]);
          const jumps = clamp(2 + w.level, 2, 4);
          for (let j = 0; j < jumps; j++) {
            let best: Monster | undefined;
            let bestD = Infinity;
            for (const m of candidates) {
              if (m.dead) continue;
              if (already.has(m)) continue;
              const d = m.pos.sub(from).len();
              if (d < bestD && d <= 320 * ctx.player.areaMult) {
                bestD = d;
                best = m;
              }
            }
            if (!best) break;
            already.add(best);
            best.hit(Math.round(dmg * 0.62), best.pos.sub(from).norm(), 420);
            ctx.fx.damageNumber({ pos: best.pos, value: dmg * 0.62, color: 0x9cf8ff, size: 18 });
            ctx.fx.lightningArc({
              from,
              to: best.pos,
              color: 0x9cf8ff,
              life: 0.16,
              width: 2.4,
              segments: 11,
              chaos: 22,
              branches: 2,
            });
            ctx.fx.hitSpark({ pos: best.pos, color: 0x9cf8ff, strength: 1.2 });
            from = best.pos;
          }
        }
      },
    };

    return w;
  },

  astralBlades: () => {
    let t = 0;
    let dmgTick = 0;
    let shotCd = 0;
    let vfxTick = 0;

    const w: Weapon = {
      id: 'astralBlades',
      name: '星界刀阵',
      desc: '超进化：环刃化作星界刀阵，并周期性齐射奥术飞刃。',
      level: 1,
      maxLevel: 5,
      update: (dt, ctx) => {
        t += dt;
        dmgTick -= dt;
        shotCd -= dt;
        vfxTick -= dt;

        const blades = clamp(6 + w.level * 2, 6, 10);
        const r = (98 + w.level * 10) * ctx.player.areaMult;
        const rotSpeed = 2.6 + w.level * 0.25;
        const dmg = (10 + w.level * 6) * ctx.player.damageMult;

        const doVfx = vfxTick <= 0;
        if (doVfx) vfxTick = 0.045;

        for (let i = 0; i < blades; i++) {
          const a = (i / blades) * Math.PI * 2 + t * rotSpeed;
          const pos = ctx.player.pos.add(new Vec2(Math.cos(a), Math.sin(a)).mul(r));

          if (doVfx) {
            ctx.fx.bladeSlash({ pos, angle: a + Math.PI / 2, color: 0x9cf8ff, life: 0.14 });
          }

          if (dmgTick <= 0) {
            for (const m of ctx.monsters) {
              if (m.dead) continue;
              if (m.pos.sub(pos).len() < 46) {
                const knock = m.pos.sub(ctx.player.pos).norm();
                m.hit(Math.round(dmg), knock, 360);
                ctx.fx.damageNumber({ pos: m.pos, value: dmg, color: 0x9cf8ff, size: 18 });
                ctx.fx.hitSpark({ pos, color: 0x9cf8ff, strength: 0.95 });
              }
            }
          }
        }

        if (dmgTick <= 0) {
          dmgTick = clamp(0.12 * ctx.player.cooldownMult, 0.06, 0.16);
        }

        if (shotCd <= 0) {
          shotCd = clamp(1.35 * ctx.player.cooldownMult, 0.7, 1.6);

          // radial volley
          const shots = clamp(6 + w.level * 2, 6, 12);
          for (let i = 0; i < shots; i++) {
            const a = (i / shots) * Math.PI * 2 + randRange(-0.08, 0.08);
            const dir = new Vec2(Math.cos(a), Math.sin(a));
            const p = new Projectile({
              pos: ctx.player.pos.add(dir.mul(54)),
              vel: dir.mul(760),
              radius: 9,
              damage: Math.round((18 + w.level * 8) * ctx.player.damageMult),
              pierce: 1,
              life: 1.0,
              color: 0x9cf8ff,
              knockbackDir: dir,
              knockback: 560,
            });
            ctx.spawnProjectile(p);
            if (i % 2 === 0) ctx.fx.hitSpark({ pos: ctx.player.pos.add(dir.mul(38)), color: 0x9cf8ff, strength: 0.6 });
          }
        }
      },
    };

    return w;
  },

  glacialSingularity: () => {
    let cd = 0;

    type Core = { pos: Vec2; life: number; tick: number; burst: boolean };
    const cores: Core[] = [];

    const w: Weapon = {
      id: 'glacialSingularity',
      name: '霜核奇点',
      desc: '超进化：牵引坍缩后爆裂成冰晶弹幕。',
      level: 1,
      maxLevel: 5,
      update: (dt, ctx) => {
        cd -= dt;
        if (cd <= 0) {
          cd = clamp((4.6 - w.level * 0.45) * ctx.player.cooldownMult, 1.6, 5.2);

          // drop near nearest monster; fallback to player
          const target = nearestMonster(ctx.player, ctx.monsters);
          const pos = target ? target.pos : ctx.player.pos;

          cores.push({ pos, life: 1.25, tick: 0, burst: false });
          ctx.fx.implosion({ pos, radius: 320 * ctx.player.areaMult, color: 0x7ad1ff, life: 0.65 });
          ctx.fx.hitSpark({ pos, color: 0x7ad1ff, strength: 1.1 });
        }

        const radius = (290 + w.level * 28) * ctx.player.areaMult;
        const pull = 920 + w.level * 160;
        const dmg = (14 + w.level * 7) * ctx.player.damageMult;

        for (const core of cores) {
          core.life -= dt;
          core.tick -= dt;

          // visible frost pulse
          if (Math.random() < dt * 4) ctx.fx.hitSpark({ pos: core.pos, color: 0x7ad1ff, strength: 0.55 });

          for (const m of ctx.monsters) {
            if (m.dead) continue;
            const d = core.pos.sub(m.pos);
            const dist = d.len();
            if (dist > radius) continue;

            const dir = dist <= 1 ? new Vec2(1, 0) : d.mul(1 / dist);
            m.knockVel = m.knockVel.add(dir.mul(pull * dt * (1 - dist / radius)));

            if (core.tick <= 0) {
              m.hit(Math.round(dmg), dir, 0);
              ctx.fx.damageNumber({ pos: m.pos, value: dmg, color: 0x7ad1ff, size: 18 });
            }
          }

          if (core.tick <= 0) core.tick = 0.2;

          // final burst
          if (!core.burst && core.life <= 0.001) {
            core.burst = true;
            const shots = clamp(10 + w.level * 2, 10, 18);
            const burstDmg = (18 + w.level * 8) * ctx.player.damageMult;
            ctx.fx.shockwave({ pos: core.pos, radius: 360 * ctx.player.areaMult, color: 0xbfe8ff, life: 0.42 });
            ctx.fx.hitSpark({ pos: core.pos, color: 0xbfe8ff, strength: 1.8 });
            for (let i = 0; i < shots; i++) {
              const a = (i / shots) * Math.PI * 2 + randRange(-0.1, 0.1);
              const dir = new Vec2(Math.cos(a), Math.sin(a));
              ctx.spawnProjectile(
                new Projectile({
                  pos: core.pos.add(dir.mul(26)),
                  vel: dir.mul(820),
                  radius: 9,
                  damage: Math.round(burstDmg),
                  pierce: 1,
                  life: 1.0,
                  color: 0x7ad1ff,
                  knockbackDir: dir,
                  knockback: 520,
                }),
              );
            }
          }
        }

        for (let i = cores.length - 1; i >= 0; i--) {
          if (cores[i].life <= 0) cores.splice(i, 1);
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
  fireTrail: { name: '烈焰足迹', desc: '移动时留下燃烧路径，灼烧靠近的敌人。' },
  frostShards: { name: '寒霜裂片', desc: '朝目标方向喷射多枚冰晶裂片，形成扇形弹幕。' },
  gravityWell: { name: '引力坍缩', desc: '周期性生成引力井，拉扯并碾碎范围内敌人。' },
  stormcaller: { name: '风暴主宰', desc: '超进化：天雷连坠，分叉电弧轰击整片战场。' },
  astralBlades: { name: '星界刀阵', desc: '超进化：环刃化作星界刀阵，并周期性齐射奥术飞刃。' },
  glacialSingularity: { name: '霜核奇点', desc: '超进化：牵引坍缩后爆裂成冰晶弹幕。' },
};
