import { Container, Graphics, Text } from 'pixi.js';
import { clamp } from '../math/util';
import { Player } from '../world/Player';

export class HUD {
  readonly container = new Container();

  private readonly panel = new Graphics();

  private readonly hpBarBg = new Graphics();
  private readonly hpBar = new Graphics();
  private readonly xpBarBg = new Graphics();
  private readonly xpBar = new Graphics();

  private readonly hpText = new Text({
    text: '',
    style: { fill: 0xe7efff, fontSize: 12 },
  });

  private readonly xpText = new Text({
    text: '',
    style: { fill: 0xbfd3ff, fontSize: 12 },
  });

  private readonly stats = new Text({
    text: '',
    style: { fill: 0xe7efff, fontSize: 13 },
  });

  constructor() {
    this.container.addChild(this.panel);
    this.container.addChild(this.hpBarBg);
    this.container.addChild(this.hpBar);
    this.container.addChild(this.xpBarBg);
    this.container.addChild(this.xpBar);
    this.container.addChild(this.hpText);
    this.container.addChild(this.xpText);
    this.container.addChild(this.stats);

    this.hpText.x = 22;
    this.hpText.y = 18;
    this.hpText.alpha = 0.95;

    this.xpText.x = 22;
    this.xpText.y = 34;
    this.xpText.alpha = 0.9;

    this.stats.x = 22;
    this.stats.y = 56;
    this.stats.alpha = 0.9;
  }

  layout(w: number, h: number): void {
    void h;
    const barW = clamp(w * 0.38, 260, 520);

    this.panel.clear();
    this.panel.roundRect(12, 10, barW + 20, 92, 16);
    this.panel.fill({ color: 0x070b18, alpha: 0.62 });
    this.panel.stroke({ width: 2, color: 0x28406b, alpha: 0.6 });

    this.hpBarBg.clear();
    this.hpBarBg.roundRect(22, 16, barW, 14, 8);
    this.hpBarBg.fill({ color: 0x0a0f1f, alpha: 0.9 });
    this.hpBarBg.stroke({ width: 1, color: 0x3d5a96, alpha: 0.55 });

    this.xpBarBg.clear();
    this.xpBarBg.roundRect(22, 34, barW, 8, 6);
    this.xpBarBg.fill({ color: 0x0a0f1f, alpha: 0.75 });
    this.xpBarBg.stroke({ width: 1, color: 0x3d5a96, alpha: 0.45 });
  }

  update(player: Player, elapsed: number): void {
    const barW = this.hpBarBg.getBounds().width;

    this.hpBar.clear();
    const hpPct = player.maxHp <= 0 ? 0 : clamp(player.hp / player.maxHp, 0, 1);
    this.hpBar.roundRect(22, 16, barW * hpPct, 14, 8);
    this.hpBar.fill({ color: 0xff5263, alpha: 0.95 });

    if (hpPct > 0.02) {
      this.hpBar.roundRect(22, 16, barW * hpPct, 5, 6);
      this.hpBar.fill({ color: 0xff9aa6, alpha: 0.22 });
    }

    this.xpBar.clear();
    const xpPct = player.xpToNext <= 0 ? 0 : clamp(player.xp / player.xpToNext, 0, 1);
    this.xpBar.roundRect(22, 34, barW * xpPct, 8, 6);
    this.xpBar.fill({ color: 0x6bd0ff, alpha: 0.95 });

    this.hpText.text = `♥ ${Math.ceil(player.hp)} / ${player.maxHp}`;
    this.xpText.text = `✦ XP ${player.xp} / ${player.xpToNext}`;

    const mm = Math.floor(elapsed / 60);
    const ss = Math.floor(elapsed % 60);
    const time = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

    const weaponText = player.weapons
      .map((w) => `${w.name} Lv${w.level}`)
      .join(' | ');

    this.stats.text = `Lv ${player.level}  Kills ${player.kills}  Time ${time}\n${weaponText}`;
  }
}
