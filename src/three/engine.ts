import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * One shared WebGL renderer draws every figure on the page.
 * Each figure owns a plain 2D canvas; when it is on screen and something
 * changed, the shared renderer draws its scene and the pixels are copied
 * across. Nothing renders while nothing moves.
 */

export type Animator = (t: number, dt: number) => boolean;
export interface View {
  yaw?: number;
  pitch?: number;
  radius?: number;
  fov?: number;
  /** Fit a content box [halfWidth, halfHeight] instead of a sphere: fills wide stages, still fits narrow ones. */
  box?: [number, number];
}

let renderer: THREE.WebGLRenderer | null = null;
let envMap: THREE.Texture | null = null;
const figs = new Set<Fig>();
let raf = 0;
let last = 0;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (t: number) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
export const damp = (cur: number, target: number, lambda: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-lambda * dt));
export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function getRenderer() {
  if (renderer) return renderer;
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(1);
  r.setSize(256, 256, false);
  r.setClearColor(0x000000, 0);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.NeutralToneMapping;
  r.toneMappingExposure = 1;
  const pm = new THREE.PMREMGenerator(r);
  envMap = pm.fromScene(new RoomEnvironment(), 0.03).texture;
  pm.dispose();
  renderer = r;
  return r;
}

function loop(now: number) {
  raf = 0;
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  let keep = false;
  figs.forEach((f) => {
    if (f.frame(now / 1000, dt)) keep = true;
  });
  if (keep) raf = requestAnimationFrame(loop);
}

function kick() {
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
}

const HALF = Math.PI / 2;

export class Fig {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  pivot = new THREE.Group();
  /** Add models here. */
  root = new THREE.Group();
  yaw: number;
  pitch: number;
  radius: number;
  dirty = true;
  visible = false;
  dragging = false;
  /** True once the reader has grabbed the model themselves. */
  touched = false;
  onInteract?: () => void;

  private box: [number, number] | null = null;
  private goal: { yaw: number; pitch: number } | null = null;
  private vy = 0;
  private vp = 0;
  private w = 0;
  private h = 0;
  private ctx: CanvasRenderingContext2D;
  private key: THREE.DirectionalLight;
  private animators: Animator[] = [];
  private undo: (() => void)[] = [];

  constructor(
    public canvas: HTMLCanvasElement,
    view: View = {},
  ) {
    getRenderer();
    this.ctx = canvas.getContext('2d')!;
    this.yaw = view.yaw ?? -0.45;
    this.pitch = view.pitch ?? 0.9;
    this.radius = view.radius ?? 50;
    this.box = view.box ?? null;
    this.camera = new THREE.PerspectiveCamera(view.fov ?? 26, 1, 1, 1000);
    this.scene.environment = envMap;
    this.scene.environmentIntensity = 0.34;
    this.pivot.add(this.root);
    this.scene.add(this.pivot);

    this.key = new THREE.DirectionalLight(0xfff7ea, 1.45);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.scene.add(this.key, this.key.target);
    const fill = new THREE.DirectionalLight(0xdfe9ff, 0.22);
    fill.position.set(1, 0.5, 0.4);
    this.scene.add(fill);
    // lights the underside when a model is flipped over; back-facing for normal top views
    const under = new THREE.DirectionalLight(0xffffff, 1.1);
    under.position.set(0.1, -1, 0.25);
    this.scene.add(under);

    this.bind();
    figs.add(this);
    this.resize();
  }

  private bind() {
    const c = this.canvas;
    let lx = 0;
    let ly = 0;
    let lt = 0;
    const K = 0.0085;

    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.dragging = true;
      this.touched = true;
      this.goal = null;
      this.vy = this.vp = 0;
      lx = e.clientX;
      ly = e.clientY;
      lt = performance.now();
      try {
        c.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone */
      }
      c.classList.add('is-dragging');
      this.onInteract?.();
    };
    const move = (e: PointerEvent) => {
      if (!this.dragging) return;
      const now = performance.now();
      const dt = Math.max(4, now - lt) / 1000;
      const dx = (e.clientX - lx) * K;
      const dy = (e.clientY - ly) * K;
      lx = e.clientX;
      ly = e.clientY;
      lt = now;
      this.yaw += dx;
      this.pitch = clamp(this.pitch + dy, -HALF, HALF);
      this.vy = this.vy * 0.5 + (dx / dt) * 0.5;
      this.vp = this.vp * 0.5 + (dy / dt) * 0.5;
      this.invalidate();
    };
    const up = () => {
      if (!this.dragging) return;
      this.dragging = false;
      c.classList.remove('is-dragging');
      if (performance.now() - lt > 90 || prefersReduced()) this.vy = this.vp = 0;
      kick();
    };
    const keydown = (e: KeyboardEvent) => {
      const step = 0.14;
      if (e.key === 'ArrowLeft') this.yaw -= step;
      else if (e.key === 'ArrowRight') this.yaw += step;
      else if (e.key === 'ArrowUp') this.pitch = clamp(this.pitch - step, -HALF, HALF);
      else if (e.key === 'ArrowDown') this.pitch = clamp(this.pitch + step, -HALF, HALF);
      else return;
      e.preventDefault();
      this.touched = true;
      this.goal = null;
      this.onInteract?.();
      this.invalidate();
    };

    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('lostpointercapture', up);
    c.addEventListener('keydown', keydown);

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(c);
    const io = new IntersectionObserver(
      (es) => {
        this.visible = es[es.length - 1].isIntersecting;
        if (this.visible) this.invalidate();
      },
      { rootMargin: '80px' },
    );
    io.observe(c);

    this.undo.push(() => {
      c.removeEventListener('pointerdown', down);
      c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up);
      c.removeEventListener('pointercancel', up);
      c.removeEventListener('lostpointercapture', up);
      c.removeEventListener('keydown', keydown);
      ro.disconnect();
      io.disconnect();
    });
  }

  private resize() {
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    if (!cw || !ch) return;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const budget = 3.4e6;
    if (cw * ch * dpr * dpr > budget) dpr = Math.sqrt(budget / (cw * ch));
    const w = Math.round(cw * dpr);
    const h = Math.round(ch * dpr);
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.fit();
    this.invalidate();
  }

  private fit() {
    if (!this.w || !this.h) return;
    const aspect = this.w / this.h;
    const vf = THREE.MathUtils.degToRad(this.camera.fov) / 2;
    const hf = Math.atan(Math.tan(vf) * aspect);
    let R = this.radius;
    let d = R / Math.sin(Math.min(vf, hf));
    if (this.box) {
      d = Math.max(this.box[1] / Math.tan(vf), this.box[0] / Math.tan(hf));
      R = Math.max(this.box[0], this.box[1]) * 1.2;
    }
    this.camera.aspect = aspect;
    this.camera.position.set(0, 0, d);
    this.camera.near = Math.max(0.5, d - R * 2.6);
    this.camera.far = d + R * 2.6;
    this.camera.updateProjectionMatrix();

    const k = this.key;
    k.position.set(-0.5, 1.05, 0.8).normalize().multiplyScalar(R * 4);
    const sc = k.shadow.camera;
    sc.left = sc.bottom = -R * 1.35;
    sc.right = sc.top = R * 1.35;
    sc.near = R;
    sc.far = R * 7;
    sc.updateProjectionMatrix();
    k.shadow.bias = -0.0002;
    k.shadow.normalBias = R * 0.0025;
  }

  setRadius(r: number) {
    if (Math.abs(r - this.radius) < 1e-4) return;
    this.radius = r;
    this.fit();
    this.invalidate();
  }

  /** Ease the view towards an orientation. Ignored while the reader is dragging. */
  lookTo(yaw: number, pitch: number) {
    const turns = Math.round((this.yaw - yaw) / (Math.PI * 2));
    this.goal = { yaw: yaw + turns * Math.PI * 2, pitch };
    this.vy = this.vp = 0;
    kick();
  }

  add(a: Animator) {
    this.animators.push(a);
    kick();
  }

  invalidate() {
    this.dirty = true;
    kick();
  }

  frame(t: number, dt: number) {
    if (!this.visible || !this.w) return false;
    let keep = false;
    if (this.goal && !this.dragging) {
      const g = this.goal;
      const snap = prefersReduced();
      this.yaw = snap ? g.yaw : damp(this.yaw, g.yaw, 4.5, dt);
      this.pitch = snap ? g.pitch : damp(this.pitch, g.pitch, 4.5, dt);
      if (Math.abs(g.yaw - this.yaw) + Math.abs(g.pitch - this.pitch) < 0.002) this.goal = null;
      else keep = true;
      this.dirty = true;
    } else if (!this.dragging && Math.abs(this.vy) + Math.abs(this.vp) > 0.02) {
      this.yaw += this.vy * dt;
      this.pitch = clamp(this.pitch + this.vp * dt, -HALF, HALF);
      const k = Math.exp(-dt * 4.2);
      this.vy *= k;
      this.vp *= k;
      this.dirty = true;
      keep = true;
    }
    for (const a of this.animators) if (a(t, dt)) keep = true;
    if (this.dirty) {
      this.dirty = false;
      this.draw();
    }
    return keep;
  }

  private draw() {
    const r = getRenderer();
    const W = this.w;
    const H = this.h;
    const c = r.domElement;
    if (c.width < W || c.height < H) r.setSize(Math.max(c.width, W), Math.max(c.height, H), false);
    r.setViewport(0, 0, W, H);
    r.setScissor(0, 0, W, H);
    r.setScissorTest(true);
    this.pivot.rotation.set(this.pitch, this.yaw, 0);
    r.render(this.scene, this.camera);
    this.ctx.clearRect(0, 0, W, H);
    this.ctx.drawImage(c, 0, c.height - H, W, H, 0, 0, W, H);
  }

  dispose() {
    figs.delete(this);
    this.undo.forEach((u) => u());
    this.animators = [];
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }
}
