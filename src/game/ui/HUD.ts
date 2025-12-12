import { Container, Graphics, Text } from 'pixi.js';
import { clamp } from '../math/util';
import { Player } from '../world/Player';

export class HUD {
  readonly container = new Container();

  private readonly leftPanel = new Graphics();
  private readonly rightPanel = new Graphics();

  private readonly hpBarBg = new Graphics();
  private readonly hpBar = new Graphics();
  private readonly xpBarBg = new Graphics();
  private readonly xpBar = new Graphics();

  private readonly hpText = new Text({
    text: '',
    style: { fill: 0xe7efff, fontSize: 13 },
  });

  private readonly xpText = new Text({
    text: '',
    style: { fill: 0xbfd3ff, fontSize: 12 },
  });

  private readonly rightText = new Text({
    text: '',
    style: {
      fill: 0xe7efff,
      fontSize: 13,
      wordWrap: true,
      wordWrapWidth: 420,
      lineHeight: 16,
    },
  });

  private barW = 360;
  private rightW = 420;
  private rightH = 98;
  private barX = 28;
  private hpY = 26;
  private xpY = 46;

  getRightPanelSize(): { width: number; height: number } {
    return { width: this.rightW, height: this.rightH };
  }

  constructor() {
    this.container.addChild(this.leftPanel);
    this.container.addChild(this.rightPanel);
    this.container.addChild(this.hpBarBg);
    this.container.addChild(this.hpBar);
    this.container.addChild(this.xpBarBg);
    this.container.addChild(this.xpBar);
    this.container.addChild(this.hpText);
    this.container.addChild(this.xpText);
    this.container.addChild(this.rightText);

    this.hpText.x = 28;
    this.hpText.y = 18;
    this.hpText.alpha = 0.95;

    this.xpText.x = 28;
    this.xpText.y = 36;
    this.xpText.alpha = 0.9;

    this.rightText.alpha = 0.92;
  }

  layout(w: number, h: number): void {
    void h;
    this.barW = clamp(w * 0.34, 240, 460);
    this.rightW = clamp(w * 0.36, 280, 520);

    const leftX = 12;
    const leftY = 10;
    const leftH = 58;

    this.barX = leftX + 16;
    this.hpY = leftY + 16;
    this.xpY = leftY + 36;

    const rightX = w - 12 - this.rightW;
    const rightY = 10;
    this.rightH = 98;

    this.leftPanel.clear();
    this.leftPanel.roundRect(leftX, leftY, this.barW + 32, leftH, 16);
    this.leftPanel.fill({ color: 0x070b18, alpha: 0.7 });
    this.leftPanel.stroke({ width: 2, color: 0x28406b, alpha: 0.65 });

    this.rightPanel.clear();
    this.rightPanel.roundRect(rightX, rightY, this.rightW, this.rightH, 16);
    this.rightPanel.fill({ color: 0x070b18, alpha: 0.7 });
    this.rightPanel.stroke({ width: 2, color: 0x28406b, alpha: 0.65 });

    this.hpBarBg.clear();
    this.hpBarBg.roundRect(this.barX, this.hpY, this.barW, 14, 8);
    this.hpBarBg.fill({ color: 0x0a0f1f, alpha: 0.9 });
    this.hpBarBg.stroke({ width: 1, color: 0x3d5a96, alpha: 0.55 });

    this.xpBarBg.clear();
    this.xpBarBg.roundRect(this.barX, this.xpY, this.barW, 8, 6);
    this.xpBarBg.fill({ color: 0x0a0f1f, alpha: 0.75 });
    this.xpBarBg.stroke({ width: 1, color: 0x3d5a96, alpha: 0.45 });

    this.hpText.x = leftX + 16;
    this.hpText.y = leftY + 14;
    this.xpText.x = leftX + 16;
    this.xpText.y = leftY + 32;

    this.rightText.x = rightX + 16;
    this.rightText.y = rightY + 14;
    this.rightText.style.wordWrapWidth = this.rightW - 32;
  }

  update(player: Player, elapsed: number): void {
    const barW = this.barW;

    this.hpBar.clear();
    const hpPct = player.maxHp <= 0 ? 0 : clamp(player.hp / player.maxHp, 0, 1);
    this.hpBar.roundRect(this.barX, this.hpY, barW * hpPct, 14, 8);
    this.hpBar.fill({ color: 0xff5263, alpha: 0.95 });

    if (hpPct > 0.02) {
      this.hpBar.roundRect(this.barX, this.hpY, barW * hpPct, 5, 6);
      this.hpBar.fill({ color: 0xff9aa6, alpha: 0.22 });
    }

    this.xpBar.clear();
    const xpPct = player.xpToNext <= 0 ? 0 : clamp(player.xp / player.xpToNext, 0, 1);
    this.xpBar.roundRect(this.barX, this.xpY, barW * xpPct, 8, 6);
    this.xpBar.fill({ color: 0x6bd0ff, alpha: 0.95 });

    this.hpText.text = `HP ${Math.ceil(player.hp)} / ${player.maxHp}`;
    this.xpText.text = `XP ${player.xp} / ${player.xpToNext}`;

    const mm = Math.floor(elapsed / 60);
    const ss = Math.floor(elapsed % 60);
    const time = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

    const weaponText = player.weapons
      .map((w) => `${w.name} Lv${w.level}`)
      .join(' | ');

    const regen = player.hpRegen > 0 ? `${player.hpRegen.toFixed(2)}/s` : '0';
    const dr = Math.round(player.getDamageReduction() * 100);
    const luck = player.luck.toFixed(1);

    this.rightText.text =
      `Lv ${player.level}   Kills ${player.kills}   Time ${time}` +
      `\n${weaponText}` +
      `\nRegen ${regen}   Armor ${dr}%   Luck ${luck}`;
  }
}
