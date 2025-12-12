export class Input {
  private readonly keys = new Set<string>();
  private readonly justPressed = new Set<string>();
  private readonly canvas: HTMLCanvasElement;

  mouse = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    window.addEventListener('keydown', this.onKeyDown, { passive: true });
    window.addEventListener('keyup', this.onKeyUp, { passive: true });

    window.addEventListener('pointermove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    // ensure focus
    this.canvas.tabIndex = 0;
    this.canvas.style.outline = 'none';
    this.canvas.addEventListener('pointerdown', () => this.canvas.focus());
  }

  endFrame(): void {
    this.justPressed.clear();
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  wasPressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  getMoveAxis(): { x: number; y: number } {
    const x = (this.isDown('KeyD') ? 1 : 0) - (this.isDown('KeyA') ? 1 : 0);
    const y = (this.isDown('KeyS') ? 1 : 0) - (this.isDown('KeyW') ? 1 : 0);

    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.keys.has(e.code)) {
      this.justPressed.add(e.code);
    }
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };
}
