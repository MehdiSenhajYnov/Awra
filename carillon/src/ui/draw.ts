// Small canvas drawing helpers shared by the interface.

export const FONT_DISPLAY = '"Marcellus SC", "Cormorant Garamond", Georgia, serif';
export const FONT_BODY = '"Cormorant Garamond", Georgia, serif';

export const COLORS = {
  ink: '#0b0b10',
  paper: '#e8dcc0',
  dim: '#9a9080',
  gold: '#e8c27a',
  bronze: '#c98f45',
  red: '#d86a5a',
  echo: '#a8f0ff',
  panel: 'rgba(8,8,12,0.88)',
};

export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = COLORS.paper, align: CanvasTextAlign = 'left', font = FONT_BODY): void {
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

/** Word-wrapped paragraph; returns the height used. */
export function para(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, width: number, size: number, color = COLORS.paper, lineH = 1.3, align: CanvasTextAlign = 'left'): number {
  ctx.font = `${size}px ${FONT_BODY}`;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  let yy = y;
  for (const block of s.split('\n')) {
    let line = '';
    for (const word of block.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > width && line) {
        ctx.fillText(line, x, yy);
        yy += size * lineH;
        line = word;
      } else line = test;
    }
    ctx.fillText(line, x, yy);
    yy += size * lineH;
  }
  return yy - y;
}

export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha = 0.88): void {
  ctx.fillStyle = `rgba(8,8,12,${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(232,194,122,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // Corner flourishes.
  ctx.fillStyle = COLORS.gold;
  for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A small bell icon (health). */
export function bellIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, full: boolean, glow = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, -s);
  ctx.quadraticCurveTo(-s * 0.45, -s * 0.25, -s * 0.75, 0);
  ctx.lineTo(s * 0.75, 0);
  ctx.quadraticCurveTo(s * 0.45, -s * 0.25, s * 0.3, -s);
  ctx.closePath();
  if (full) {
    ctx.fillStyle = '#e8dcc0';
    ctx.fill();
    if (glow > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,240,200,${glow})`;
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = 'rgba(232,220,192,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

const images = new Map<string, HTMLImageElement>();
export function img(name: string): HTMLImageElement {
  let im = images.get(name);
  if (!im) {
    im = new Image();
    im.src = `img/${name}.webp`;
    images.set(name, im);
  }
  return im;
}

export function drawImg(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, w: number, h: number): boolean {
  const im = img(name);
  if (!im.complete || !im.naturalWidth) return false;
  ctx.drawImage(im, x, y, w, h);
  return true;
}
