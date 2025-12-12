import { Container, Graphics, Text } from 'pixi.js';

export class CornerHelp {
  readonly container = new Container();

  private readonly bg = new Graphics();
  private readonly label = new Text({
    text: '',
    style: {
      fill: 0xbfd3ff,
      fontSize: 12,
      lineHeight: 16,
      wordWrap: true,
      wordWrapWidth: 300,
    },
  });

  constructor(text: string) {
    this.label.text = text;
    this.label.alpha = 0.9;
    this.container.addChild(this.bg, this.label);
    this.redraw();
  }

  layout(screenW: number, screenH: number): void {
    const margin = 12;
    const w = Math.max(240, Math.min(320, this.label.width + 24));
    const h = Math.max(54, this.label.height + 20);

    this.bg.clear();
    this.bg.roundRect(0, 0, w, h, 14);
    this.bg.fill({ color: 0x070b18, alpha: 0.55 });
    this.bg.stroke({ width: 2, color: 0x28406b, alpha: 0.55 });

    this.label.x = 12;
    this.label.y = 10;
    this.label.style.wordWrapWidth = w - 24;

    this.container.x = screenW - margin - w;
    this.container.y = screenH - margin - h;
  }

  private redraw(): void {
    // initial; proper sizing in layout()
    this.bg.clear();
    this.bg.roundRect(0, 0, 280, 64, 14);
    this.bg.fill({ color: 0x070b18, alpha: 0.55 });
    this.bg.stroke({ width: 2, color: 0x28406b, alpha: 0.55 });
    this.label.x = 12;
    this.label.y = 10;
  }
}
