import { Container, Graphics, Text } from 'pixi.js';
import { pickN } from '../math/util';
import { Input } from '../input/Input';
import { WeaponId, weaponMeta } from '../weapons/Weapons';

export type UpgradeChoice = {
  weaponId: WeaponId;
  kind: 'new' | 'upgrade';
};

export class LevelUpOverlay {
  readonly container = new Container();

  private readonly dim = new Graphics();
  private readonly panel = new Graphics();
  private readonly title = new Text({
    text: '升级！选择 1/2/3',
    style: { fill: 0xe7efff, fontSize: 22 },
  });

  private readonly cards: {
    root: Container;
    bg: Graphics;
    label: Text;
    desc: Text;
    choice?: UpgradeChoice;
  }[] = [];

  private gameOverMode = false;
  private onRestart?: () => void;

  constructor(opts: { onPick: (choice: UpgradeChoice) => void }) {
    this.container.visible = false;
    this.container.eventMode = 'static';

    this.dim.rect(0, 0, 1, 1);
    this.dim.fill({ color: 0x000000, alpha: 0.55 });

    this.container.addChild(this.dim);
    this.container.addChild(this.panel);
    this.container.addChild(this.title);

    for (let i = 0; i < 3; i++) {
      const root = new Container();
      root.eventMode = 'static';
      root.cursor = 'pointer';

      const bg = new Graphics();
      const label = new Text({
        text: '',
        style: { fill: 0xe7efff, fontSize: 18 },
      });
      const desc = new Text({
        text: '',
        style: { fill: 0xbfd3ff, fontSize: 13, wordWrap: true, wordWrapWidth: 260 },
      });

      label.x = 16;
      label.y = 12;
      desc.x = 16;
      desc.y = 44;
      desc.alpha = 0.9;

      root.addChild(bg, label, desc);
      root.on('pointerdown', () => {
        const c = this.cards[i].choice;
        if (!c) {
          if (this.gameOverMode && this.onRestart) this.onRestart();
          return;
        }
        opts.onPick(c);
      });

      this.cards.push({ root, bg, label, desc });
      this.container.addChild(root);
    }
  }

  layout(w: number, h: number): void {
    this.dim.clear();
    this.dim.rect(0, 0, w, h);
    this.dim.fill({ color: 0x000000, alpha: 0.55 });

    const panelW = Math.min(980, w - 48);
    const panelH = 260;
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;

    this.panel.clear();
    this.panel.roundRect(px, py, panelW, panelH, 18);
    this.panel.fill({ color: 0x0a0f1f, alpha: 0.92 });
    this.panel.stroke({ width: 2, color: 0x28406b, alpha: 0.9 });

    this.title.x = px + 20;
    this.title.y = py + 18;

    const gap = 16;
    const cardW = (panelW - 20 * 2 - gap * 2) / 3;
    const cardH = 170;

    for (let i = 0; i < 3; i++) {
      const c = this.cards[i];
      c.root.x = px + 20 + i * (cardW + gap);
      c.root.y = py + 70;

      c.bg.clear();
      c.bg.roundRect(0, 0, cardW, cardH, 14);
      c.bg.fill({ color: 0x111a33, alpha: 0.95 });
      c.bg.stroke({ width: 2, color: 0x3d5a96, alpha: 0.8 });

      c.desc.style.wordWrapWidth = cardW - 32;
    }
  }

  rollChoices(pool: { id: WeaponId; kind: 'new' | 'upgrade' }[]): UpgradeChoice[] {
    this.gameOverMode = false;

    const picked = pickN(pool, 3);

    // If pool is small, fill with replacement (safe fallback)
    while (picked.length < 3 && pool.length > 0) {
      picked.push(pool[(Math.random() * pool.length) | 0]);
    }

    // As an absolute fallback (shouldn't happen), repeat first entry
    while (picked.length < 3) {
      picked.push({ id: 'arcaneBolt', kind: 'upgrade' });
    }

    return picked.map((p) => ({ weaponId: p.id, kind: p.kind }));
  }

  show(choices: UpgradeChoice[]): void {
    this.container.visible = true;
    this.gameOverMode = false;
    this.title.text = '升级！选择 1/2/3';

    for (let i = 0; i < 3; i++) {
      const c = this.cards[i];
      const choice = choices[i];

      c.choice = choice;

      const meta = weaponMeta[choice.weaponId];
      const kindText = choice.kind === 'new' ? '学习' : '强化';

      c.label.text = `${i + 1}. ${kindText}：${meta.name}`;
      c.desc.text = meta.desc;
    }
  }

  hide(): void {
    this.container.visible = false;
    for (const c of this.cards) c.choice = undefined;
  }

  handleHotkeys(input: Input): boolean {
    if (!this.container.visible) return false;

    if (this.gameOverMode) {
      if (input.wasPressed('Enter') || input.wasPressed('Space')) {
        this.onRestart?.();
        return true;
      }
      return false;
    }

    const mapping: Array<[string, number]> = [
      ['Digit1', 0],
      ['Digit2', 1],
      ['Digit3', 2],
      ['Numpad1', 0],
      ['Numpad2', 1],
      ['Numpad3', 2],
    ];

    for (const [code, idx] of mapping) {
      if (input.wasPressed(code)) {
        this.cards[idx].root.emit('pointerdown', undefined as unknown as never);
        return true;
      }
    }

    return false;
  }

  showGameOver(opts: { time: number; level: number; kills: number; onRestart: () => void }): void {
    this.container.visible = true;
    this.gameOverMode = true;
    this.onRestart = opts.onRestart;

    const mm = Math.floor(opts.time / 60);
    const ss = Math.floor(opts.time % 60);
    const time = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

    this.title.text = '倒下了… 点击任意卡牌或按 Enter 重开';

    const lines = [
      `生存时间：${time}`,
      `等级：${opts.level}`,
      `击杀：${opts.kills}`,
    ].join('\n');

    for (let i = 0; i < 3; i++) {
      const c = this.cards[i];
      c.choice = undefined;
      c.label.text = `${i + 1}. 重新开始`;
      c.desc.text = lines;
    }
  }
}
