import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { EquipmentItem, equipmentRarityColor, equipmentRarityName } from '../equipment';

export class EquipmentPanel {
  readonly container = new Container();

  private readonly panel = new Graphics();
  private readonly title = new Text({
    text: '装备',
    style: { fill: 0xe7efff, fontSize: 14 },
  });
  private readonly hint = new Text({
    text: '拾取：有空位将自动装备\n点击格子：丢弃（需确认）',
    style: { fill: 0xbfd3ff, fontSize: 11, lineHeight: 14 },
  });

  private readonly slots: Array<{
    root: Container;
    bg: Graphics;
    icon: Sprite;
  }> = [];

  private readonly confirm = new Container();
  private readonly confirmDim = new Graphics();
  private readonly confirmBox = new Graphics();
  private readonly confirmText = new Text({
    text: '装备',
    style: { fill: 0xe7efff, fontSize: 14, lineHeight: 18, wordWrap: true, wordWrapWidth: 220 },
  });
  private readonly btnYes = new Graphics();
  private readonly btnNo = new Graphics();
  private readonly btnYesText = new Text({ text: '丢弃', style: { fill: 0xe7efff, fontSize: 13 } });
  private readonly btnNoText = new Text({ text: '关闭', style: { fill: 0xe7efff, fontSize: 13 } });

  private pendingSlot: number | null = null;
  private onDiscard?: (slotIndex: number) => void;

  private x = 0;
  private y = 0;
  private w = 0;

  constructor(opts: { slotCount: number; onDiscard: (slotIndex: number) => void }) {
    this.onDiscard = opts.onDiscard;

    this.container.addChild(this.panel);
    this.container.addChild(this.title);
    this.container.addChild(this.hint);

    for (let i = 0; i < opts.slotCount; i++) {
      const root = new Container();
      root.eventMode = 'static';
      root.cursor = 'pointer';

      const bg = new Graphics();
      const icon = new Sprite();
      icon.anchor.set(0.5);
      icon.x = 22;
      icon.y = 22;
      icon.scale.set(0.42);
      icon.visible = false;

      root.addChild(bg, icon);
      root.on('pointerdown', () => this.openConfirm(i));

      this.slots.push({ root, bg, icon });
      this.container.addChild(root);
    }

    // confirm overlay
    this.confirm.visible = false;
    this.confirm.eventMode = 'static';

    this.btnYes.eventMode = 'static';
    this.btnYes.cursor = 'pointer';
    this.btnNo.eventMode = 'static';
    this.btnNo.cursor = 'pointer';

    this.btnYes.on('pointerdown', () => {
      if (this.pendingSlot == null) return;
      this.onDiscard?.(this.pendingSlot);
      this.closeConfirm();
    });

    this.btnNo.on('pointerdown', () => this.closeConfirm());

    this.confirm.addChild(this.confirmDim);
    this.confirm.addChild(this.confirmBox);
    this.confirm.addChild(this.confirmText);
    this.confirm.addChild(this.btnYes);
    this.confirm.addChild(this.btnNo);
    this.confirm.addChild(this.btnYesText);
    this.confirm.addChild(this.btnNoText);

    this.container.addChild(this.confirm);
  }

  layout(_screenW: number, _screenH: number, anchor: { x: number; y: number; width: number }): void {
    this.x = anchor.x;
    this.y = anchor.y;
    this.w = anchor.width;

    const pad = 12;
    const headerH = 22;
    const hintH = 30;

    const cols = 4;
    const slot = 44;
    const gap = 10;
    const gridW = cols * slot + (cols - 1) * gap;

    const panelW = this.w;
    const panelH = headerH + hintH + pad * 2 + (slot * 2 + gap);

    this.panel.clear();
    this.panel.roundRect(this.x, this.y, panelW, panelH, 16);
    this.panel.fill({ color: 0x070b18, alpha: 0.7 });
    this.panel.stroke({ width: 2, color: 0x28406b, alpha: 0.65 });

    this.title.x = this.x + pad;
    this.title.y = this.y + pad;

    this.hint.x = this.x + pad;
    this.hint.y = this.y + pad + headerH;
    this.hint.alpha = 0.88;

    const gx = this.x + (panelW - gridW) / 2;
    const gy = this.y + pad + headerH + hintH;

    for (let i = 0; i < this.slots.length; i++) {
      const r = this.slots[i];
      const cx = i % cols;
      const cy = (i / cols) | 0;
      r.root.x = gx + cx * (slot + gap);
      r.root.y = gy + cy * (slot + gap);

      r.bg.clear();
      r.bg.roundRect(0, 0, slot, slot, 12);
      r.bg.fill({ color: 0x0a0f1f, alpha: 0.9 });
      r.bg.stroke({ width: 2, color: 0x3d5a96, alpha: 0.55 });

      r.icon.x = slot / 2;
      r.icon.y = slot / 2;
    }

    // confirm overlay bounds
    this.confirmDim.clear();
    this.confirmDim.rect(this.x, this.y, panelW, panelH);
    this.confirmDim.fill({ color: 0x000000, alpha: 0.45 });

    const bw = Math.min(260, panelW - 24);
    const bh = 172;
    const bx = this.x + (panelW - bw) / 2;
    const by = this.y + (panelH - bh) / 2;

    this.confirmBox.clear();
    this.confirmBox.roundRect(bx, by, bw, bh, 16);
    this.confirmBox.fill({ color: 0x0a0f1f, alpha: 0.95 });
    this.confirmBox.stroke({ width: 2, color: 0x28406b, alpha: 0.9 });

    this.confirmText.x = bx + 16;
    this.confirmText.y = by + 16;
    this.confirmText.style.wordWrapWidth = bw - 32;

    const btnW = (bw - 16 * 2 - 10) / 2;
    const btnH = 38;
    const btnY = by + bh - 16 - btnH;

    this.btnYes.clear();
    this.btnYes.roundRect(bx + 16, btnY, btnW, btnH, 12);
    this.btnYes.fill({ color: 0x111a33, alpha: 0.95 });
    this.btnYes.stroke({ width: 2, color: 0x3d5a96, alpha: 0.8 });

    this.btnNo.clear();
    this.btnNo.roundRect(bx + 16 + btnW + 10, btnY, btnW, btnH, 12);
    this.btnNo.fill({ color: 0x111a33, alpha: 0.95 });
    this.btnNo.stroke({ width: 2, color: 0x3d5a96, alpha: 0.8 });

    this.btnYesText.anchor.set(0.5);
    this.btnNoText.anchor.set(0.5);

    this.btnYesText.x = bx + 16 + btnW / 2;
    this.btnYesText.y = btnY + btnH / 2;
    this.btnNoText.x = bx + 16 + btnW + 10 + btnW / 2;
    this.btnNoText.y = btnY + btnH / 2;
  }

  update(slots: ReadonlyArray<EquipmentItem | null>): void {
    for (let i = 0; i < this.slots.length; i++) {
      const ui = this.slots[i];
      const it = slots[i];

      if (!it) {
        ui.icon.visible = false;
        ui.bg.tint = 0xffffff;
        ui.bg.alpha = 1;
        ui.bg.clear();
        ui.bg.roundRect(0, 0, 44, 44, 12);
        ui.bg.fill({ color: 0x0a0f1f, alpha: 0.9 });
        ui.bg.stroke({ width: 2, color: 0x3d5a96, alpha: 0.55 });
        continue;
      }

      ui.icon.texture = it.texture;
      ui.icon.visible = true;

      const col = equipmentRarityColor[it.rarity];
      ui.bg.clear();
      ui.bg.roundRect(0, 0, 44, 44, 12);
      ui.bg.fill({ color: 0x0a0f1f, alpha: 0.9 });
      ui.bg.stroke({ width: 2, color: col, alpha: 0.95 });
    }
  }

  private openConfirm(slotIndex: number): void {
    const it = (this.onPeek?.(slotIndex) ?? null) as EquipmentItem | null;
    if (!it) return;

    this.pendingSlot = slotIndex;
    this.confirm.visible = true;

    const lines = it.lines.slice(0, 4).join('\n');
    this.confirmText.text = `丢弃该装备？\n\n${equipmentRarityName[it.rarity]}\n${lines}`;
  }

  private closeConfirm(): void {
    this.pendingSlot = null;
    this.confirm.visible = false;
  }

  // set by host each frame for confirmation text
  onPeek?: (slotIndex: number) => EquipmentItem | null;
}
