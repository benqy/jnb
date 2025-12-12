import {
  Application,
  Assets,
  Container,
  Graphics,
  Texture,
} from 'pixi.js';
import { Input } from './input/Input';
import { Vec2 } from './math/Vec2';
import { clamp, randRange, sample } from './math/util';
import { Player } from './world/Player';
import { Monster } from './world/Monster';
import { Projectile } from './world/Projectile';
import { Pickup } from './world/Pickup';
import { ParticleSystem } from './world/ParticleSystem';
import { HitFlashFilter } from './render/HitFlashFilter';
import { LevelUpOverlay } from './ui/LevelUpOverlay';
import { HUD } from './ui/HUD';
import { HintToast } from './ui/HintToast';
import { CornerHelp } from './ui/CornerHelp';
import { applyUpgradeChoice, getUpgradePool, type UpgradeChoice } from './upgrades/Upgrades';

export class Game {
  private readonly app: Application;
  private readonly input: Input;

  private readonly stageRoot = new Container();
  private readonly world = new Container();
  private readonly worldBg = new Container();
  private readonly worldEntities = new Container();
  private readonly worldFx = new Container();
  private readonly ui = new Container();

  private readonly bgGrid = new Graphics();

  private heroTex!: Texture;
  private shadowTex!: Texture;
  private monsterTex: Texture[] = [];

  private player!: Player;
  private monsters: Monster[] = [];
  private projectiles: Projectile[] = [];
  private pickups: Pickup[] = [];

  private readonly particles = new ParticleSystem();

  private readonly hud: HUD;
  private readonly levelUpOverlay: LevelUpOverlay;
  private readonly hintToast: HintToast;
  private readonly cornerHelp: CornerHelp;

  private elapsed = 0;
  private spawnTimer = 0;
  private spawnIntensity = 1;

  private pausedForLevelUp = false;

  private readonly hitFlashFilter = new HitFlashFilter();

  constructor(app: Application) {
    this.app = app;
    this.input = new Input(app.canvas);

    this.hud = new HUD();
    this.levelUpOverlay = new LevelUpOverlay({
      onPick: (choice: UpgradeChoice) => this.applyUpgrade(choice),
    });
    this.hintToast = new HintToast();
    this.cornerHelp = new CornerHelp('WASD 移动\n升级：1/2/3\n融合：两技能≥Lv3');
  }

  async init(): Promise<void> {
    this.app.stage.addChild(this.stageRoot);
    this.stageRoot.addChild(this.world);
    this.stageRoot.addChild(this.ui);

    this.world.addChild(this.worldBg);
    this.world.addChild(this.worldEntities);
    this.world.addChild(this.worldFx);

    this.worldBg.addChild(this.bgGrid);

    this.ui.addChild(this.hud.container);
    this.ui.addChild(this.levelUpOverlay.container);
    this.ui.addChild(this.hintToast.container);
    this.ui.addChild(this.cornerHelp.container);

    await this.loadAssets();
    this.buildBackground();

    this.player = new Player({
      texture: this.heroTex,
      shadowTexture: this.shadowTex,
      pos: new Vec2(0, 0),
    });
    this.player.sprite.filters = [this.hitFlashFilter];

    this.worldEntities.addChild(this.player.display);

    this.worldFx.addChild(this.particles.container);

    // Starter weapon
    this.player.addWeapon('arcaneBolt');

    this.hintToast.show('WASD 移动 | 升级时 1/2/3 选择');

    this.levelUpOverlay.hide();

    this.app.renderer.on('resize', () => {
      this.buildBackground();
      this.levelUpOverlay.layout(this.app.screen.width, this.app.screen.height);
      this.hud.layout(this.app.screen.width, this.app.screen.height);
      this.hintToast.layout(this.app.screen.width, this.app.screen.height);
      this.cornerHelp.layout(this.app.screen.width, this.app.screen.height);
    });

    this.levelUpOverlay.layout(this.app.screen.width, this.app.screen.height);
    this.hud.layout(this.app.screen.width, this.app.screen.height);
    this.hintToast.layout(this.app.screen.width, this.app.screen.height);
    this.cornerHelp.layout(this.app.screen.width, this.app.screen.height);
  }

  update(dt: number): void {
    dt = clamp(dt, 0, 0.05);

    this.elapsed += dt;

    this.hitFlashFilter.time = this.elapsed;

    if (this.pausedForLevelUp) {
      const picked = this.levelUpOverlay.handleHotkeys(this.input);
      if (picked) {
        this.levelUpOverlay.hide();
        this.pausedForLevelUp = false;
      }
      this.updateCamera();
      this.hud.update(this.player, this.elapsed);
      this.input.endFrame();
      return;
    }

    this.updateSpawning(dt);
    this.updatePlayer(dt);
    this.updateMonsters(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);

    this.hintToast.update(dt);

    this.particles.update(dt);

    this.resolveCollisions();
    this.cleanupDead();
    this.updateCamera();

    this.hud.update(this.player, this.elapsed);

    if (this.player.tryConsumeLevelUp()) {
      this.beginLevelUp();
    }

    this.input.endFrame();
  }

  private async loadAssets(): Promise<void> {
    this.heroTex = await Assets.load('/images/hero.png');
    this.shadowTex = await Assets.load('/images/Char_shadow.png');

    const monsterPaths = Array.from({ length: 24 }, (_, i) => `/images/monster/monster-${i}.png`);
    const textures = await Promise.all(monsterPaths.map((p) => Assets.load(p)));
    this.monsterTex = textures;
  }

  private buildBackground(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.bgGrid.clear();

    // Subtle grid to help motion perception
    const size = 128;
    const halfW = w / 2;
    const halfH = h / 2;

    this.bgGrid.rect(-halfW - size, -halfH - size, w + size * 2, h + size * 2);
    this.bgGrid.fill({ color: 0x050612 });

    for (let x = -halfW - size; x <= halfW + size; x += size) {
      this.bgGrid.moveTo(x, -halfH - size);
      this.bgGrid.lineTo(x, halfH + size);
    }
    for (let y = -halfH - size; y <= halfH + size; y += size) {
      this.bgGrid.moveTo(-halfW - size, y);
      this.bgGrid.lineTo(halfW + size, y);
    }

    this.bgGrid.stroke({ width: 1, color: 0x0b1632, alpha: 0.25 });
  }

  private updateCamera(): void {
    const center = this.app.screen;
    this.world.x = center.width / 2 - this.player.pos.x;
    this.world.y = center.height / 2 - this.player.pos.y;

    // keep UI pinned
    this.ui.x = 0;
    this.ui.y = 0;
  }

  private updatePlayer(dt: number): void {
    const move = this.input.getMoveAxis();
    this.player.update(dt, move);

    // Weapons
    const weapons = this.player.weapons;
    for (const weapon of weapons) {
      weapon.update(dt, {
        player: this.player,
        monsters: this.monsters,
        spawnProjectile: (p) => {
          this.projectiles.push(p);
          this.worldEntities.addChild(p.display);
        },
        fx: this.particles,
      });
    }
  }

  private updateSpawning(dt: number): void {
    this.spawnTimer -= dt;
    this.spawnIntensity = 1 + Math.floor(this.elapsed / 30);

    // Soft cap: keep the on-screen density readable
    const maxMonsters = 22 + this.spawnIntensity * 8;
    if (this.monsters.length >= maxMonsters) {
      this.spawnTimer = Math.max(this.spawnTimer, 0.35);
      return;
    }

    if (this.spawnTimer <= 0) {
      const count = clamp(1 + Math.floor(this.spawnIntensity / 2), 1, 4);
      for (let i = 0; i < count; i++) this.spawnMonster();
      this.spawnTimer = clamp(1.7 - this.elapsed / 140, 0.55, 1.7);
    }
  }

  private spawnMonster(): void {
    const tex = sample(this.monsterTex);
    const spawnRadius = clamp(520 + this.spawnIntensity * 30, 520, 900);
    const angle = Math.random() * Math.PI * 2;
    const pos = new Vec2(
      this.player.pos.x + Math.cos(angle) * spawnRadius + randRange(-80, 80),
      this.player.pos.y + Math.sin(angle) * spawnRadius + randRange(-80, 80),
    );

    const monster = new Monster({
      texture: tex,
      shadowTexture: this.shadowTex,
      pos,
      level: this.spawnIntensity,
    });
    monster.sprite.filters = [this.hitFlashFilter];

    this.monsters.push(monster);
    this.worldEntities.addChild(monster.display);
  }

  private updateMonsters(dt: number): void {
    for (const m of this.monsters) {
      m.update(dt, this.player, this.particles);
    }

    // Player contact damage
    for (const m of this.monsters) {
      if (m.dead) continue;
      const d = m.pos.sub(this.player.pos);
      const dist = d.len();
      if (dist < m.radius + this.player.radius) {
        const now = this.elapsed;
        if (this.player.canTakeContactHit(now)) {
          this.player.takeDamage(m.contactDamage, now);
          this.particles.damageNumber({
            pos: this.player.pos,
            value: m.contactDamage,
            color: 0xff5263,
            size: 22,
          });
          this.particles.hitSpark({ pos: this.player.pos, color: 0xff5263, strength: 0.8 });
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      p.update(dt);
    }
  }

  private updatePickups(dt: number): void {
    for (const x of this.pickups) {
      x.update(dt, this.player);
    }
  }

  private resolveCollisions(): void {
    // projectiles -> monsters
    for (const p of this.projectiles) {
      if (p.dead) continue;
      for (const m of this.monsters) {
        if (m.dead) continue;

        const d = m.pos.sub(p.pos);
        const dist = d.len();
        if (dist <= m.radius + p.radius) {
          m.hit(p.damage, p.knockbackDir, p.knockback);
          this.particles.damageNumber({ pos: m.pos, value: p.damage, color: p.hitColor, size: 18 });
          this.particles.hitSpark({
            pos: p.pos,
            color: p.hitColor,
            strength: 1,
          });

          p.onHit?.(m);
          if (p.pierce <= 0) {
            p.dead = true;
            break;
          } else {
            p.pierce -= 1;
          }
        }
      }
    }

    // player -> pickups
    for (const x of this.pickups) {
      if (x.dead) continue;
      const dist = x.pos.sub(this.player.pos).len();
      if (dist < x.radius + this.player.pickupRadius) {
        x.collect(this.player);
        x.dead = true;
      }
    }
  }

  private cleanupDead(): void {
    // monsters
    const still: Monster[] = [];
    for (const m of this.monsters) {
      if (!m.dead) {
        still.push(m);
        continue;
      }
      m.display.destroy({ children: true });
      this.player.kills += 1;

      // xp drop chance
      const xp = Pickup.makeXp({
        pos: m.pos,
        amount: clamp(1 + Math.floor(m.maxHp / 20), 1, 8),
      });
      this.pickups.push(xp);
      this.worldEntities.addChild(xp.display);

      this.particles.burstText({
        pos: m.pos,
        text: '✦',
        color: 0xbfe8ff,
        count: 10,
        speed: 220,
        life: 0.35,
      });
    }
    this.monsters = still;

    // projectiles
    const p2: Projectile[] = [];
    for (const p of this.projectiles) {
      if (!p.dead) {
        p2.push(p);
        continue;
      }
      p.display.destroy();
    }
    this.projectiles = p2;

    // pickups
    const x2: Pickup[] = [];
    for (const x of this.pickups) {
      if (!x.dead) {
        x2.push(x);
        continue;
      }
      x.display.destroy();
    }
    this.pickups = x2;

    if (this.player.dead) {
      this.beginGameOver();
    }
  }

  private beginLevelUp(): void {
    this.pausedForLevelUp = true;

    const pool = getUpgradePool(this.player);
    const choices = this.levelUpOverlay.rollChoices(pool);
    this.levelUpOverlay.show(choices);
  }

  private applyUpgrade(choice: UpgradeChoice): void {
    if (choice.type === 'fusion') {
      // big celebratory VFX
      this.particles.shockwave({ pos: this.player.pos, radius: 440, color: 0xbfe8ff, life: 0.65 });
      for (let i = 0; i < 3; i++) {
        const from = this.player.pos.add(new Vec2(randRange(-160, 160), -320 - randRange(0, 120)));
        this.particles.lightningArc({
          from,
          to: this.player.pos,
          color: 0xbfe8ff,
          life: 0.22,
          width: 3.2,
          segments: 14,
          chaos: 34,
          branches: 3,
        });
      }
      this.particles.hitSpark({ pos: this.player.pos, color: 0xbfe8ff, strength: 2.1 });
      this.hintToast.show(`${choice.title}！`);
    }
    applyUpgradeChoice(this.player, choice);
  }

  private beginGameOver(): void {
    this.pausedForLevelUp = true;
    this.levelUpOverlay.showGameOver({
      time: this.elapsed,
      level: this.player.level,
      kills: this.player.kills,
      onRestart: () => window.location.reload(),
    });
  }
}
