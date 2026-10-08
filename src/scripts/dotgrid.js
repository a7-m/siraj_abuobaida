/**
 * DotGrid — Interactive Canvas Dot Grid
 * Converted from React Bits <DotGrid /> to Pure Vanilla JavaScript + CSS.
 * ────────────────────────────────────────────────────────────────────────
 * Features:
 * • Proximity color interpolation (baseColor -> activeColor near mouse)
 * • Speed trigger & inertia push
 * • Shockwave ripple on click
 * • Theme adaptive: Pure White (Olive/Emerald) & Sleek Black (Glowing Emerald)
 * • High performance 60fps Canvas 2D
 * • Pure Vanilla JS spring physics with zero external dependencies
 */

export class DotGrid {
  constructor(options = {}) {
    this.dotSize = options.dotSize ?? 4;
    this.gap = options.gap ?? 14;
    this.proximity = options.proximity ?? 120;
    this.speedTrigger = options.speedTrigger ?? 120;
    this.shockRadius = options.shockRadius ?? 220;
    this.shockStrength = options.shockStrength ?? 3.5;
    this.maxSpeed = options.maxSpeed ?? 5000;
    this.resistance = options.resistance ?? 750;
    this.returnDuration = options.returnDuration ?? 1.5;

    this.container = options.container || null;
    this.canvas = null;
    this.ctx = null;
    this.dots = [];
    this.rafId = null;

    this.pointer = {
      x: -9999,
      y: -9999,
      vx: 0,
      vy: 0,
      speed: 0,
      lastTime: 0,
      lastX: 0,
      lastY: 0
    };

    this.circlePath = null;
    this.baseRgb = { r: 18, g: 117, b: 71, a: 0.12 };
    this.activeRgb = { r: 18, g: 117, b: 71, a: 0.95 };

    this.onMove = this.onMove.bind(this);
    this.onClick = this.onClick.bind(this);
    this.draw = this.draw.bind(this);
    this.buildGrid = this.buildGrid.bind(this);
    this.updateThemeColors = this.updateThemeColors.bind(this);

    this.init();
  }

  updateThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      // Sleek Black mode: subtle dark dots, active glowing emerald
      this.baseRgb = { r: 255, g: 255, b: 255, a: 0.08 };
      this.activeRgb = { r: 16, g: 185, b: 129, a: 0.95 };
    } else {
      // Pure White mode: subtle olive dots, active rich emerald
      this.baseRgb = { r: 18, g: 117, b: 71, a: 0.12 };
      this.activeRgb = { r: 18, g: 117, b: 71, a: 0.9 };
    }
  }

  init() {
    // If no container supplied, attach as global background overlay
    if (!this.container) {
      let wrap = document.getElementById('dotgrid-canvas-wrap');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'dotgrid-canvas-wrap';
        wrap.className = 'dot-grid-wrap';
        wrap.setAttribute('aria-hidden', 'true');
        document.body.prepend(wrap);
      }
      this.container = wrap;
    }

    document.body.classList.add('has-interactive-dotgrid');

    let canvas = this.container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'dot-grid-canvas';
      this.container.appendChild(canvas);
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Create Path2D for smooth circle rendering
    if (window.Path2D) {
      this.circlePath = new Path2D();
      this.circlePath.arc(0, 0, this.dotSize / 2, 0, Math.PI * 2);
    }

    this.updateThemeColors();
    this.buildGrid();

    // Resize handling
    if ('ResizeObserver' in window) {
      this.ro = new ResizeObserver(() => this.buildGrid());
      this.ro.observe(this.container);
    } else {
      window.addEventListener('resize', this.buildGrid);
    }

    // Global interaction listeners
    window.addEventListener('mousemove', this.onMove, { passive: true });
    window.addEventListener('click', this.onClick);

    // Watch for theme changes (Light / Dark)
    const observer = new MutationObserver(() => this.updateThemeColors());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    this.draw();
  }

  buildGrid() {
    if (!this.container || !this.canvas) return;

    const rect = this.container.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }

    const cell = this.dotSize + this.gap;
    const cols = Math.floor((width + this.gap) / cell);
    const rows = Math.floor((height + this.gap) / cell);

    const gridW = cell * cols - this.gap;
    const gridH = cell * rows - this.gap;

    const extraX = width - gridW;
    const extraY = height - gridH;

    const startX = extraX / 2 + this.dotSize / 2;
    const startY = extraY / 2 + this.dotSize / 2;

    const dots = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dots.push({
          cx: startX + x * cell,
          cy: startY + y * cell,
          xOffset: 0,
          yOffset: 0,
          vx: 0,
          vy: 0
        });
      }
    }
    this.dots = dots;
  }

  onMove(e) {
    const now = performance.now();
    const pr = this.pointer;
    const dt = pr.lastTime ? Math.max(now - pr.lastTime, 8) : 16;
    const dx = e.clientX - pr.lastX;
    const dy = e.clientY - pr.lastY;

    let vx = (dx / dt) * 1000;
    let vy = (dy / dt) * 1000;
    let speed = Math.hypot(vx, vy);

    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      vx *= scale;
      vy *= scale;
      speed = this.maxSpeed;
    }

    pr.lastTime = now;
    pr.lastX = e.clientX;
    pr.lastY = e.clientY;
    pr.vx = vx;
    pr.vy = vy;
    pr.speed = speed;

    const rect = this.canvas.getBoundingClientRect();
    pr.x = e.clientX - rect.left;
    pr.y = e.clientY - rect.top;

    if (speed > this.speedTrigger) {
      const prox = this.proximity;
      for (let i = 0; i < this.dots.length; i++) {
        const dot = this.dots[i];
        const dist = Math.hypot(dot.cx - pr.x, dot.cy - pr.y);
        if (dist < prox) {
          const falloff = 1 - dist / prox;
          const pushFactor = 0.0035 * falloff;
          dot.vx += (dot.cx - pr.x) * 0.02 + vx * pushFactor;
          dot.vy += (dot.cy - pr.y) * 0.02 + vy * pushFactor;
        }
      }
    }
  }

  onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const shockRadius = this.shockRadius;
    const shockStrength = this.shockStrength;

    for (let i = 0; i < this.dots.length; i++) {
      const dot = this.dots[i];
      const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
      if (dist < shockRadius) {
        const falloff = Math.max(0, 1 - dist / shockRadius);
        const angle = Math.atan2(dot.cy - cy, dot.cx - cx);
        const impulse = shockStrength * falloff * 7;
        dot.vx += Math.cos(angle) * impulse;
        dot.vy += Math.sin(angle) * impulse;
      }
    }
  }

  draw() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const { x: px, y: py } = this.pointer;
    const proxSq = this.proximity * this.proximity;
    const base = this.baseRgb;
    const active = this.activeRgb;

    // Smoother spring physics constants with higher damping to reduce vibration
    const springK = 0.065;
    const damping = 0.78;

    for (let i = 0; i < this.dots.length; i++) {
      const dot = this.dots[i];

      // Spring physics toward original home position (cx, cy)
      dot.vx = (dot.vx - dot.xOffset * springK) * damping;
      dot.vy = (dot.vy - dot.yOffset * springK) * damping;
      dot.xOffset += dot.vx;
      dot.yOffset += dot.vy;

      // Rest snap to prevent micro-jitters
      if (Math.abs(dot.xOffset) < 0.01 && Math.abs(dot.vx) < 0.01) {
        dot.xOffset = 0;
        dot.vx = 0;
      }
      if (Math.abs(dot.yOffset) < 0.01 && Math.abs(dot.vy) < 0.01) {
        dot.yOffset = 0;
        dot.vy = 0;
      }

      const ox = dot.cx + dot.xOffset;
      const oy = dot.cy + dot.yOffset;
      const dx = dot.cx - px;
      const dy = dot.cy - py;
      const dsq = dx * dx + dy * dy;

      let fillStyle;
      if (dsq <= proxSq) {
        const dist = Math.sqrt(dsq);
        const t = Math.max(0, 1 - dist / this.proximity);
        const r = Math.round(base.r + (active.r - base.r) * t);
        const g = Math.round(base.g + (active.g - base.g) * t);
        const b = Math.round(base.b + (active.b - base.b) * t);
        const a = base.a + (active.a - base.a) * t;
        fillStyle = `rgba(${r},${g},${b},${a.toFixed(2)})`;
      } else {
        fillStyle = `rgba(${base.r},${base.g},${base.b},${base.a})`;
      }

      this.ctx.save();
      this.ctx.translate(ox, oy);
      this.ctx.fillStyle = fillStyle;
      if (this.circlePath) {
        this.ctx.fill(this.circlePath);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.dotSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    this.rafId = requestAnimationFrame(this.draw);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('mousemove', this.onMove);
    window.removeEventListener('click', this.onClick);
    if (this.ro) this.ro.disconnect();
    else window.removeEventListener('resize', this.buildGrid);
  }
}

let dotGridInstance = null;
export function initDotGrid(options = {}) {
  if (typeof window === 'undefined') return null;
  if (!dotGridInstance) {
    dotGridInstance = new DotGrid(options);
  }
  return dotGridInstance;
}

export default DotGrid;
