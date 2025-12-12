import { Container, Graphics, Text } from 'pixi.js';

export class HintToast {
  readonly container = new Container();

  private readonly bg = new Graphics();
  private readonly label = new Text({
    text: '',
    style: { fill: 0xbfd3ff, fontSize: 13 },
  });

  private t = 0;
  private life = 0;

  constructor() {
    this.container.addChild(this.bg, this.label);
    this.container.visible = false;

    this.label.x = 12;
    this.label.y = 10;
    this.label.alpha = 0.95;
  }

  show(text: string, seconds = 6): void {
    this.t = 0;
    this.life = seconds;
    this.label.text = text;
    this.container.alpha = 1;
    this.container.visible = true;
    this.redraw();
  }

  update(dt: number): void {
    if (!this.container.visible) return;

    this.t += dt;
    this.life -= dt;

    if (this.life <= 0) {
      this.container.visible = false;
      return;
    }

    // fade last 1.2s
    const fade = Math.min(1, Math.max(0, this.life / 1.2));
    this.container.alpha = fade;
  }

  layout(screenW: number, screenH: number): void {
    void screenW;
    // bottom-left
    this.container.x = 14;
    this.container.y = screenH - 56;
    this.redraw();
  }

  private redraw(): void {
    const padX = 12;
    const padY = 10;
    const w = Math.max(220, this.label.width + padX * 2);
    const h = 34;

    this.bg.clear();
    this.bg.roundRect(0, 0, w, h, 14);
    this.bg.fill({ color: 0x070b18, alpha: 0.55 });
    this.bg.stroke({ width: 2, color: 0x28406b, alpha: 0.55 });

    this.label.x = padX;
    this.label.y = padY;
  }
}
