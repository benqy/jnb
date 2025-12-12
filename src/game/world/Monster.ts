import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { Vec2 } from '../math/Vec2';
import { clamp, randRange } from '../math/util';
import { Player } from './Player';
import { ParticleSystem } from './ParticleSystem';

export class Monster {
  readonly display: Container;
  readonly shadow: Sprite;
  readonly sprite: Sprite;
  private readonly hpBarBg = new Graphics();
  private readonly hpBar = new Graphics();

  pos: Vec2;
  vel: Vec2 = Vec2.zero();
  knockVel: Vec2 = Vec2.zero();

  readonly radius = 34;

  maxHp: number;
  hp: number;

  contactDamage: number;

  dead = false;

  // wobble / afterimage
  private t = Math.random() * 10;
  private afterImageTimer = randRange(0.04, 0.08);

  constructor(opts: { texture: Texture; shadowTexture: Texture; pos: Vec2; level: number }) {
    this.pos = opts.pos;

    this.maxHp = 28 + opts.level * 9;
    this.hp = this.maxHp;
    this.contactDamage = clamp(6 + opts.level * 1.2, 6, 28);

    this.display = new Container();

    this.shadow = new Sprite(opts.shadowTexture);
    this.shadow.anchor.set(0.5);
    this.shadow.x = 0;
    this.shadow.y = 50;
    this.shadow.alpha = 0.5;

    this.sprite = new Sprite(opts.texture);
    this.sprite.anchor.set(0.5);
    this.sprite.x = 0;
    this.sprite.y = 0;

    const s = clamp(0.92 + opts.level * 0.02, 0.92, 1.25);
    this.sprite.scale.set(s);

    this.display.x = this.pos.x;
    this.display.y = this.pos.y;
    this.display.addChild(this.shadow);
    this.display.addChild(this.sprite);
    this.display.addChild(this.hpBarBg);
    this.display.addChild(this.hpBar);

    this.drawHpBar();
  }

  update(dt: number, player: Player, fx: ParticleSystem): void {
    if (this.dead) return;

    this.t += dt;

    const toPlayer = player.pos.sub(this.pos);
    const dir = toPlayer.norm();

    const speed = clamp(120 + (player.level - 1) * 6 + this.maxHp * 0.15, 120, 280);

    // simulate "alive" movement
    const wobble = Math.sin(this.t * 6) * 0.35;
    const moveDir = dir.rot(wobble * 0.2);

    this.vel = moveDir.mul(speed);

    // decay knockback
    this.knockVel = this.knockVel.mul(Math.pow(0.001, dt));

    this.pos = this.pos.add(this.vel.mul(dt)).add(this.knockVel.mul(dt));

    this.display.x = this.pos.x;
    this.display.y = this.pos.y;

    // squash-stretch + rotation gives motion feel for static image
    const squish = 1 + Math.sin(this.t * 10) * 0.03;
    this.sprite.rotation = Math.sin(this.t * 5) * 0.08;
    this.sprite.scale.y = this.sprite.scale.x * squish;

    // shadow follows facing/scale (keeps width consistent with unit)
    this.shadow.scale.x = this.sprite.scale.x;
    this.shadow.scale.y = Math.abs(this.sprite.scale.x);

    this.drawHpBar();

    // afterimage trail
    this.afterImageTimer -= dt;
    if (this.afterImageTimer <= 0) {
      this.afterImageTimer = randRange(0.05, 0.09);
      fx.afterImage({
        x: this.display.x,
        y: this.display.y,
        texture: this.sprite.texture,
        rotation: this.sprite.rotation,
        scaleX: this.sprite.scale.x,
        scaleY: this.sprite.scale.y,
        alpha: 0.25,
        tint: 0x77a6ff,
        life: 0.22,
      });
    }
  }

  hit(dmg: number, knockDir: Vec2, knock: number): void {
    if (this.dead) return;

    this.hp = clamp(this.hp - dmg, 0, this.maxHp);
    this.knockVel = this.knockVel.add(knockDir.mul(knock));

    this.drawHpBar();

    // cheap hit flash
    this.sprite.tint = 0xffb3c1;
    setTimeout(() => {
      if (!this.sprite.destroyed) this.sprite.tint = 0xffffff;
    }, 60);

    if (this.hp <= 0) this.dead = true;
  }

  private drawHpBar(): void {
    const w = 72;
    const h = 7;
    const y = -78;
    const pct = this.maxHp <= 0 ? 0 : clamp(this.hp / this.maxHp, 0, 1);

    this.hpBarBg.clear();
    this.hpBarBg.roundRect(-w / 2, y, w, h, 4);
    this.hpBarBg.fill({ color: 0x050612, alpha: 0.65 });

    this.hpBar.clear();
    this.hpBar.roundRect(-w / 2, y, w * pct, h, 4);
    this.hpBar.fill({ color: 0xff5263, alpha: 0.9 });

    const show = pct < 1;
    this.hpBarBg.visible = show;
    this.hpBar.visible = show;
  }
}
