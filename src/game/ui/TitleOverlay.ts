import { Container, Graphics, Text } from 'pixi.js';

function formatTime(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export class TitleOverlay {
  readonly container = new Container();

  private readonly dim = new Graphics();
  private readonly panel = new Graphics();
  private readonly title = new Text({
    text: 'JNB 幸存者',
    style: { fill: 0xe7efff, fontSize: 34 },
  });
  private readonly body = new Text({
    text: '',
    style: {
      fill: 0xbfd3ff,
      fontSize: 14,
      lineHeight: 20,
      wordWrap: true,
      wordWrapWidth: 620,
    },
  });

  constructor() {
    this.container.visible = false;
    this.container.eventMode = 'none';

    this.container.addChild(this.dim);
    this.container.addChild(this.panel);
    this.container.addChild(this.title);
    this.container.addChild(this.body);

    this.title.anchor.set(0.5, 0);
  }

  layout(w: number, h: number): void {
    this.dim.clear();
    this.dim.rect(0, 0, w, h);
    this.dim.fill({ color: 0x000000, alpha: 0.55 });

    const panelW = Math.min(880, w - 56);
    const panelH = 360;
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;

    this.panel.clear();
    this.panel.roundRect(px, py, panelW, panelH, 18);
    this.panel.fill({ color: 0x0a0f1f, alpha: 0.92 });
    this.panel.stroke({ width: 2, color: 0x28406b, alpha: 0.9 });

    this.title.x = w / 2;
    this.title.y = py + 24;

    this.body.style.wordWrapWidth = panelW - 48;
    this.body.x = px + 24;
    this.body.y = py + 86;
  }

  show(opts: { bestTime?: number }): void {
    this.container.visible = true;

    const bestLine =
      typeof opts.bestTime === 'number' ? `最佳生存：${formatTime(opts.bestTime)}\n\n` : '';

    this.body.text =
      `${bestLine}` +
      `WASD 移动\n` +
      `升级选择：1 / 2 / 3\n` +
      `融合：两技能 ≥ Lv3\n` +
      `Esc：暂停\n\n` +
      `按 Space 或 Enter 开始`;
  }

  hide(): void {
    this.container.visible = false;
  }
}
