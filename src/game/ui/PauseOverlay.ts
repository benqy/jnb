import { Container, Graphics, Text } from 'pixi.js';

export class PauseOverlay {
  readonly container = new Container();

  private readonly dim = new Graphics();
  private readonly panel = new Graphics();
  private readonly title = new Text({
    text: '暂停',
    style: { fill: 0xe7efff, fontSize: 28 },
  });
  private readonly body = new Text({
    text: 'Esc 继续\nR 重开',
    style: { fill: 0xbfd3ff, fontSize: 14, lineHeight: 20 },
  });

  constructor() {
    this.container.visible = false;
    this.container.eventMode = 'none';

    this.container.addChild(this.dim);
    this.container.addChild(this.panel);
    this.container.addChild(this.title);
    this.container.addChild(this.body);

    this.title.anchor.set(0.5, 0);
    this.body.anchor.set(0.5, 0);
  }

  layout(w: number, h: number): void {
    this.dim.clear();
    this.dim.rect(0, 0, w, h);
    this.dim.fill({ color: 0x000000, alpha: 0.35 });

    const panelW = Math.min(520, w - 56);
    const panelH = 200;
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;

    this.panel.clear();
    this.panel.roundRect(px, py, panelW, panelH, 18);
    this.panel.fill({ color: 0x0a0f1f, alpha: 0.9 });
    this.panel.stroke({ width: 2, color: 0x28406b, alpha: 0.85 });

    this.title.x = w / 2;
    this.title.y = py + 28;

    this.body.x = w / 2;
    this.body.y = py + 84;
  }

  show(): void {
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
  }
}
