import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* All dimensions are millimetres. Components sit on y = 0 (the board's top face). */

export const SILK = '#f2f2ea';

const mk = (color: THREE.ColorRepresentation, roughness = 0.6, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

export const M = {
  black: mk(0x1c1d20, 0.5),
  hole: mk(0x040405, 0.9),
  chip: mk(0x25262a, 0.6),
  steel: Object.assign(mk(0xb6bbc1, 0.36, 0.9), { envMapIntensity: 0.75 }),
  tin: mk(0xb7bbc0, 0.42, 0.6),
  alu: mk(0xc4c8cd, 0.34, 0.8),
  gold: mk(0xe2b24e, 0.3, 0.9),
  white: mk(0xeceae2, 0.55),
  beige: mk(0xd8c59c, 0.7),
  fr4: mk(0xb9a777, 0.8),
  red: mk(0xb8432d, 0.5),
  navy: mk(0x1f3558, 0.45),
  orange: mk(0xd27a2c, 0.55),
  green: mk(0x3f7d46, 0.5),
  paddle: mk(0xb9bcc0, 0.5, 0.7),
};

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- mesh helpers ---------- */

export function shade<T extends THREE.Mesh>(m: T) {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
/** Box whose bottom face sits at y. */
export function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const o = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m));
  o.position.set(x, y + h / 2, z);
  return o;
}
/** Upright cylinder whose bottom sits at y. */
export function cyl(r: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 28) {
  const o = shade(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m));
  o.position.set(x, y + h / 2, z);
  return o;
}
/** Cylinder lying along X, centred on (x, y, z). */
export function cylX(r: number, len: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 28) {
  const o = shade(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2), m));
  o.position.set(x, y, z);
  return o;
}
/** Many boxes as one mesh. Each entry: [w, h, d, x, yBottom, z]. */
export function boxes(list: number[][], m: THREE.Material) {
  const gs = list.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z));
  const g = mergeGeometries(gs)!;
  gs.forEach((q) => q.dispose());
  return shade(new THREE.Mesh(g, m));
}
export function merged(gs: THREE.BufferGeometry[], m: THREE.Material) {
  const g = mergeGeometries(gs)!;
  gs.forEach((q) => q.dispose());
  return shade(new THREE.Mesh(g, m));
}
/** Flat strip between two points on the XZ plane. */
export function stripGeo(x1: number, z1: number, x2: number, z2: number, w: number, t: number, y: number) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return new THREE.BoxGeometry(Math.hypot(dx, dz), t, w)
    .rotateY(-Math.atan2(dz, dx))
    .translate((x1 + x2) / 2, y + t / 2, (z1 + z2) / 2);
}
export function group(...children: THREE.Object3D[]) {
  const g = new THREE.Group();
  children.forEach((c) => g.add(c));
  return g;
}

export function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- PCB artwork: draws in board millimetres, origin bottom-left ---------- */

const SANS = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif';

export class Art {
  constructor(
    public c: CanvasRenderingContext2D,
    public s: number,
    public w: number,
    public h: number,
    public mask: string,
  ) {}
  X(x: number) {
    return x * this.s;
  }
  Y(y: number) {
    return (this.h - y) * this.s;
  }
  base(color = this.mask) {
    this.c.fillStyle = color;
    this.c.fillRect(0, 0, this.w * this.s, this.h * this.s);
  }
  tint(l: number) {
    return '#' + new THREE.Color(this.mask).offsetHSL(0, 0, l).getHexString();
  }
  dot(x: number, y: number, r: number, color: string) {
    const c = this.c;
    c.fillStyle = color;
    c.beginPath();
    c.arc(this.X(x), this.Y(y), r * this.s, 0, Math.PI * 2);
    c.fill();
  }
  pad(x: number, y: number, r = 0.95, hole = 0.48, color = '#d3ccb2') {
    this.dot(x, y, r, color);
    this.dot(x, y, hole, '#0b0c0d');
  }
  row(x0: number, y0: number, n: number, dx = 2.54, dy = 0, r?: number, hole?: number, color?: string) {
    for (let i = 0; i < n; i++) this.pad(x0 + i * dx, y0 + i * dy, r, hole, color);
  }
  rect(x: number, y: number, w: number, h: number, color: string) {
    this.c.fillStyle = color;
    this.c.fillRect(this.X(x - w / 2), this.Y(y + h / 2), w * this.s, h * this.s);
  }
  frame(x: number, y: number, w: number, h: number, lw = 0.16, color = SILK) {
    this.c.strokeStyle = color;
    this.c.lineWidth = lw * this.s;
    this.c.strokeRect(this.X(x - w / 2), this.Y(y + h / 2), w * this.s, h * this.s);
  }
  line(pts: number[][], lw: number, color: string) {
    const c = this.c;
    c.strokeStyle = color;
    c.lineWidth = lw * this.s;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(this.X(x), this.Y(y)) : c.moveTo(this.X(x), this.Y(y))));
    c.stroke();
  }
  text(
    str: string,
    x: number,
    y: number,
    size: number,
    o: { rot?: number; align?: CanvasTextAlign; color?: string; weight?: number | string; font?: string } = {},
  ) {
    const c = this.c;
    c.save();
    c.translate(this.X(x), this.Y(y));
    c.rotate((-(o.rot ?? 0) * Math.PI) / 180);
    c.font = `${o.weight ?? 700} ${size * this.s}px ${o.font ?? SANS}`;
    c.textAlign = o.align ?? 'center';
    c.textBaseline = 'middle';
    c.fillStyle = o.color ?? SILK;
    c.fillText(str, 0, 0);
    c.restore();
  }
  /** Plausible-looking copper routing under the solder mask. */
  traces(seed: number, n: number, lw = 0.32, light = 0.05) {
    const rnd = rng(seed);
    const col = this.tint(light);
    for (let i = 0; i < n; i++) {
      let x = 3 + rnd() * (this.w - 6);
      let y = 3 + rnd() * (this.h - 6);
      let d = Math.floor(rnd() * 8);
      const pts = [[x, y]];
      const segs = 2 + Math.floor(rnd() * 4);
      for (let k = 0; k < segs; k++) {
        const len = 2 + rnd() * 9;
        x = Math.min(this.w - 1.5, Math.max(1.5, x + Math.cos((d * Math.PI) / 4) * len));
        y = Math.min(this.h - 1.5, Math.max(1.5, y + Math.sin((d * Math.PI) / 4) * len));
        pts.push([x, y]);
        d = (d + (rnd() < 0.5 ? 1 : 7)) % 8;
      }
      this.line(pts, lw, col);
      this.dot(pts[0][0], pts[0][1], lw * 1.5, col);
      this.dot(x, y, lw * 1.5, col);
      this.dot(x, y, lw * 0.6, this.tint(-0.08));
    }
  }
  /** The two-ring Arduino mark. */
  logo(x: number, y: number, r: number) {
    const c = this.c;
    c.strokeStyle = SILK;
    c.lineWidth = r * 0.44 * this.s;
    for (const sg of [-1, 1]) {
      c.beginPath();
      c.arc(this.X(x + sg * r * 0.98), this.Y(y), r * this.s, 0, Math.PI * 2);
      c.stroke();
    }
    this.text('–', x - r * 0.98, y + r * 0.08, r * 1.2);
    this.text('+', x + r * 0.98, y, r * 1.2);
  }
}

export interface PcbSpec {
  w: number;
  h: number;
  t?: number;
  mask: string;
  edge?: THREE.Material;
  outline?: [number, number][];
  round?: number;
  circle?: boolean;
  holes?: number[][];
  px?: number;
  top?: (a: Art) => void;
  bottom?: (a: Art) => void;
}

/** A board centred on the origin, top face at y = 0. Board (x, y) maps to world (x - w/2, 0, h/2 - y). */
export function pcb(spec: PcbSpec) {
  const { w, h } = spec;
  const t = spec.t ?? 1.6;
  const shape = new THREE.Shape();
  if (spec.circle) shape.absarc(w / 2, h / 2, w / 2, 0, Math.PI * 2, false);
  else if (spec.outline) {
    spec.outline.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
  } else {
    const r = spec.round ?? 1.2;
    shape.moveTo(r, 0);
    shape.lineTo(w - r, 0);
    shape.absarc(w - r, r, r, -Math.PI / 2, 0, false);
    shape.lineTo(w, h - r);
    shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
    shape.lineTo(r, h);
    shape.absarc(r, h - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(0, r);
    shape.absarc(r, r, r, Math.PI, Math.PI * 1.5, false);
  }
  for (const [x, y, r] of spec.holes ?? []) {
    const p = new THREE.Path();
    p.absarc(x, y, r, 0, Math.PI * 2, true);
    shape.holes.push(p);
  }
  const seat = (geo: THREE.BufferGeometry, y: number) => geo.rotateX(-Math.PI / 2).translate(-w / 2, y, h / 2);
  const g = new THREE.Group();
  const maskMat = new THREE.MeshStandardMaterial({ color: spec.mask, roughness: 0.5 });
  g.add(
    shade(
      new THREE.Mesh(
        seat(new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 24 }), -t),
        [maskMat, spec.edge ?? M.fr4],
      ),
    ),
  );
  const s = spec.px ?? Math.min(20, 1400 / Math.max(w, h));
  const face = (draw: (a: Art) => void, y: number, back: boolean) => {
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * s);
    cv.height = Math.round(h * s);
    const art = new Art(cv.getContext('2d')!, s, w, h, spec.mask);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const paint = () => {
      art.base();
      draw(art);
      tex.needsUpdate = true;
    };
    paint();
    const geo = new THREE.ShapeGeometry(shape, 24);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w, pos.getY(i) / h);
    const m = new THREE.Mesh(
      seat(geo, y),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.46, side: back ? THREE.BackSide : THREE.FrontSide }),
    );
    m.receiveShadow = true;
    g.add(m);
    return paint;
  };
  if (spec.top) g.userData.paintTop = face(spec.top, 0.03, false);
  if (spec.bottom) g.userData.paintBottom = face(spec.bottom, -t - 0.03, true);
  return g;
}

/* ---------- integrated circuits ---------- */

export function chipTop(w: number, d: number, lines: string[], o: { notch?: boolean; dot?: boolean } = {}) {
  const s = Math.min(56, 1100 / Math.max(w, d));
  const tex = canvasTex(Math.round(w * s), Math.round(d * s), (c, W, H) => {
    c.fillStyle = '#25262a';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#131416';
    if (o.notch) {
      c.beginPath();
      c.arc(0, H / 2, H * 0.17, -Math.PI / 2, Math.PI / 2);
      c.fill();
    }
    if (o.dot) {
      c.beginPath();
      c.arc(Math.min(W, H) * 0.14, H - Math.min(W, H) * 0.14, Math.min(W, H) * 0.06, 0, 7);
      c.fill();
    }
    let fs = Math.min((H * 0.74) / (lines.length * 1.15), H * 0.46);
    c.font = `600 ${fs}px ${SANS}`;
    const widest = Math.max(...lines.map((l) => c.measureText(l).width), 1);
    if (widest > W * 0.78) {
      fs *= (W * 0.78) / widest;
      c.font = `600 ${fs}px ${SANS}`;
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#b3b6b9';
    lines.forEach((l, i) => c.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * fs * 1.15));
  });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62 }),
  );
  m.receiveShadow = true;
  return m;
}

/** Plastic dual in-line package, long axis on X. */
export function dip(n = 28, lines: string[] = ['ATMEGA328P-PU'], socket = false) {
  const g = new THREE.Group();
  const L = (n / 2) * 2.54;
  const lift = socket ? 3.2 : 0.6;
  const legs: number[][] = [];
  for (let i = 0; i < n / 2; i++)
    for (const s of [-1, 1]) {
      const x = -L / 2 + 1.27 + i * 2.54;
      legs.push([1.3, 0.28, 1.2, x, lift + 1.5, s * 3.4]);
      legs.push([1.3, 1.6, 0.28, x, lift + 0.18, s * 3.86]);
      legs.push([0.5, 2.4, 0.28, x, lift - 2.2, s * 3.86]);
    }
  g.add(boxes(legs, M.tin));
  g.add(box(L, 3.3, 6.5, M.chip, 0, lift, 0));
  const top = chipTop(L, 6.5, lines, { notch: true });
  top.position.y = lift + 3.31;
  g.add(top);
  if (socket)
    g.add(
      boxes(
        [
          [L + 0.6, 3, 2.3, 0, 0, 3.81],
          [L + 0.6, 3, 2.3, 0, 0, -3.81],
          [1.3, 2.2, 5.4, L / 2 - 0.35, 0, 0],
          [1.3, 2.2, 5.4, -L / 2 + 0.35, 0, 0],
        ],
        M.black,
      ),
    );
  return g;
}

/** Thin quad flat package with gull-wing leads on four sides. */
export function tqfp(size: number, per: number, lines: string[], pitch = 0.8) {
  const g = new THREE.Group();
  const leads: number[][] = [];
  const span = (per - 1) * pitch;
  for (let i = 0; i < per; i++) {
    const p = -span / 2 + i * pitch;
    for (const s of [-1, 1]) {
      leads.push([pitch * 0.46, 0.2, 1.1, p, 0, s * (size / 2 + 0.45)]);
      leads.push([1.1, 0.2, pitch * 0.46, s * (size / 2 + 0.45), 0, p]);
    }
  }
  g.add(boxes(leads, M.tin));
  g.add(box(size, 1.05, size, M.chip, 0, 0.1, 0));
  const top = chipTop(size, size, lines, { dot: true });
  top.position.y = 1.16;
  g.add(top);
  return g;
}

/** Quad flat no-lead: contacts are pads on the underside. */
export function qfn(size: number, per: number, lines: string[], pitch = 0.5) {
  const g = new THREE.Group();
  const pads: number[][] = [[size * 0.62, 0.06, size * 0.62, 0, -0.03, 0]];
  const span = (per - 1) * pitch;
  for (let i = 0; i < per; i++) {
    const p = -span / 2 + i * pitch;
    for (const s of [-1, 1]) {
      pads.push([pitch * 0.52, 0.22, 0.62, p, -0.03, s * (size / 2 - 0.28)]);
      pads.push([0.62, 0.22, pitch * 0.52, s * (size / 2 - 0.28), -0.03, p]);
    }
  }
  g.add(boxes(pads, M.tin));
  g.add(box(size, 0.85, size, M.chip, 0, 0.02, 0));
  const top = chipTop(size, size, lines, { dot: true });
  top.position.y = 0.88;
  g.add(top);
  return g;
}

/** Two-sided gull-wing package (SOIC / SSOP), long axis on X. */
export function soic(n: number, l: number, w: number, pitch: number, lines: string[]) {
  const g = new THREE.Group();
  const leads: number[][] = [];
  const span = (n / 2 - 1) * pitch;
  for (let i = 0; i < n / 2; i++)
    for (const s of [-1, 1]) leads.push([pitch * 0.5, 0.2, 1.2, -span / 2 + i * pitch, 0, s * (w / 2 + 0.5)]);
  g.add(boxes(leads, M.tin));
  g.add(box(l, 1.5, w, M.chip, 0, 0.1, 0));
  const top = chipTop(l, w, lines, { dot: true });
  top.position.y = 1.61;
  g.add(top);
  return g;
}

/* ---------- connectors ---------- */

/** Female pin socket strip along X. */
export function header(n: number, rows = 1) {
  const W = n * 2.54;
  const D = rows * 2.54;
  const holes: number[][] = [];
  for (let i = 0; i < n; i++)
    for (let r = 0; r < rows; r++)
      holes.push([1.05, 0.08, 1.05, -W / 2 + 1.27 + i * 2.54, 8.46, -D / 2 + 1.27 + r * 2.54]);
  return group(box(W, 8.5, D, M.black), boxes(holes, M.hole));
}

/** Male pin header standing up (ICSP and friends). */
export function pinHeader(cols: number, rows: number, pin = 6) {
  const W = cols * 2.54;
  const D = rows * 2.54;
  const pins: number[][] = [];
  for (let i = 0; i < cols; i++)
    for (let r = 0; r < rows; r++)
      pins.push([0.64, 2.5 + pin, 0.64, -W / 2 + 1.27 + i * 2.54, 0, -D / 2 + 1.27 + r * 2.54]);
  return group(box(W, 2.5, D, M.black), boxes(pins, M.gold));
}

/** Pins hanging below a board (Nano, shields). Board top is y = 0. */
export function pinsDown(n: number, len: number, spacer: number, t = 1.6) {
  const W = n * 2.54;
  const pins: number[][] = [];
  for (let i = 0; i < n; i++) pins.push([0.64, len + spacer, 0.64, -W / 2 + 1.27 + i * 2.54, -t - spacer - len, 0]);
  const g = group(boxes(pins, M.gold));
  if (spacer > 0) g.add(box(W, spacer, 2.5, M.black, 0, -t - spacer, 0));
  return g;
}

/** USB type B socket. Opening faces -X. */
export function usbB() {
  return group(
    boxes(
      [
        [16, 0.35, 12, 0, 10.45, 0],
        [16, 0.35, 12, 0, 0, 0],
        [16, 10.8, 0.35, 0, 0, 5.83],
        [16, 10.8, 0.35, 0, 0, -5.83],
        [0.35, 10.8, 12, 7.83, 0, 0],
      ],
      M.steel,
    ),
    box(10, 10.1, 11.3, M.black, 2.6, 0.35, 0),
    box(6.6, 3.1, 5.6, M.white, -4.1, 3.85, 0),
  );
}

function smallUsb(l: number, h: number, w: number) {
  return group(box(l, h, w, M.steel), box(0.16, h * 0.56, w * 0.8, M.hole, -l / 2, h * 0.22, 0));
}
export const miniUsb = () => smallUsb(9.2, 3.9, 7.7);
export const microUsb = () => smallUsb(5.6, 2.7, 7.5);

/** USB type A host socket. Opening faces -X. */
export function usbA() {
  return group(
    boxes(
      [
        [14, 0.3, 13.2, 0, 6.7, 0],
        [14, 0.3, 13.2, 0, 0, 0],
        [14, 7, 0.3, 0, 0, 6.45],
        [14, 7, 0.3, 0, 0, -6.45],
        [0.3, 7, 13.2, 6.85, 0, 0],
      ],
      M.steel,
    ),
    box(11, 2, 11.6, M.white, -1.2, 1.2, 0),
  );
}

/** DC barrel jack. Opening faces -X. */
export function barrelJack() {
  const g = group(box(13.6, 6.4, 9, M.black), cylX(4.5, 13.6, M.black, 0, 6.4, 0, 36));
  const face = new THREE.Mesh(new THREE.CircleGeometry(3.15, 32).rotateY(-Math.PI / 2), M.hole);
  face.position.set(-6.82, 6.2, 0);
  g.add(face, cylX(1.05, 0.5, M.steel, -6.95, 6.2, 0, 16));
  return g;
}

function dPath(wt: number, wb: number, h: number, r: number) {
  const s = new THREE.Shape();
  const t = h / 2;
  const b = -h / 2;
  const a = wt / 2;
  const c = wb / 2;
  s.moveTo(-a + r, t);
  s.lineTo(a - r, t);
  s.quadraticCurveTo(a, t, a - r * 0.15, t - r);
  s.lineTo(c + r * 0.15, b + r);
  s.quadraticCurveTo(c, b, c - r, b);
  s.lineTo(-c + r, b);
  s.quadraticCurveTo(-c, b, -c - r * 0.15, b + r);
  s.lineTo(-a + r * 0.15, t - r);
  s.quadraticCurveTo(-a, t, -a + r, t);
  return s;
}

/** DE-9 RS-232 socket. Opening faces -X. */
export function de9() {
  const g = group(box(11, 12.4, 24, M.black), box(0.9, 12.5, 30.8, M.steel, -5.95, 0, 0));
  const outer = dPath(17, 15.2, 8.4, 1.4);
  outer.holes.push(dPath(15.8, 14, 7.2, 1));
  const opt = { bevelEnabled: false, curveSegments: 8 };
  const ring = shade(
    new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { ...opt, depth: 5.8 }).rotateY(-Math.PI / 2), M.steel),
  );
  ring.position.set(-6.4, 6.25, 0);
  const core = shade(
    new THREE.Mesh(
      new THREE.ExtrudeGeometry(dPath(15.8, 14, 7.2, 1), { ...opt, depth: 4.6 }).rotateY(-Math.PI / 2),
      M.navy,
    ),
  );
  core.position.set(-6.4, 6.25, 0);
  const holes: number[][] = [];
  for (let i = 0; i < 5; i++) holes.push([0.12, 1, 1, -11.02, 7.15, (i - 2) * 2.77]);
  for (let i = 0; i < 4; i++) holes.push([0.12, 1, 1, -11.02, 4.35, (i - 1.5) * 2.77]);
  g.add(ring, core, boxes(holes, M.hole));
  for (const s of [-1, 1]) g.add(cylX(2.4, 5, M.steel, -8.9, 6.25, s * 12.5, 6));
  return g;
}

/* ---------- discrete parts ---------- */

/** HC-49 quartz crystal can, long axis on X. */
export function crystal() {
  const s = new THREE.Shape();
  s.absarc(3.2, 0, 2.2, -Math.PI / 2, Math.PI / 2, false);
  s.absarc(-3.2, 0, 2.2, Math.PI / 2, Math.PI * 1.5, false);
  s.closePath();
  const can = shade(
    new THREE.Mesh(
      new THREE.ExtrudeGeometry(s, {
        depth: 2.7,
        bevelEnabled: true,
        bevelSize: 0.35,
        bevelThickness: 0.35,
        bevelSegments: 3,
        curveSegments: 14,
      }).rotateX(-Math.PI / 2),
      M.steel,
    ),
  );
  can.position.y = 0.65;
  return group(box(11.8, 0.3, 5.4, M.steel), can);
}

/** Electrolytic capacitor: SMD can on a base, or a sleeved through-hole can. */
export function elco(d: number, h: number, th = false) {
  if (th) return group(cyl(d / 2, h, M.navy, 0, 0.4, 0, 28), cyl(d / 2 - 0.5, 0.12, M.alu, 0, h + 0.4, 0, 28));
  const g = group(box(d + 0.5, 1.1, d + 0.5, M.black), cyl(d / 2, h, M.alu, 0, 1, 0, 32));
  const mark = new THREE.Mesh(new THREE.CircleGeometry(d / 2 - 0.2, 24, 0, Math.PI).rotateX(-Math.PI / 2), M.black);
  mark.position.y = 1 + h + 0.02;
  g.add(mark);
  return g;
}

export function to220() {
  return group(
    box(10, 15.6, 1.3, M.steel, 0, 2.6, -1.6),
    box(10, 9.2, 4.4, M.chip, 0, 2.6, 1.2),
    boxes(
      [-2.54, 0, 2.54].map((x) => [0.8, 3.4, 0.5, x, -0.8, 1]),
      M.tin,
    ),
  );
}

export function sot223() {
  return group(
    box(6.5, 1.6, 3.5, M.chip, 0, 0.05, 0),
    boxes(
      [
        [3, 0.25, 1.9, 0, 0, -2.6],
        [0.7, 0.25, 1.9, -2.3, 0, 2.6],
        [0.7, 0.25, 1.9, 0, 0, 2.6],
        [0.7, 0.25, 1.9, 2.3, 0, 2.6],
      ],
      M.tin,
    ),
  );
}

export function to92() {
  const body = cyl(2.3, 4.6, M.chip, 0, 1.6, 0, 20);
  body.scale.z = 0.75;
  return group(
    body,
    boxes(
      [-1.27, 0, 1.27].map((x) => [0.45, 2.4, 0.45, x, -0.8, 0]),
      M.tin,
    ),
  );
}

const bandMats = new Map<number, THREE.Material>();
const band = (c: number) => {
  if (!bandMats.has(c)) bandMats.set(c, mk(c, 0.5));
  return bandMats.get(c)!;
};

/** Axial through-hole resistor lying along X. */
export function resistor(seed = 0) {
  const sets = [
    [0xb5412c, 0x2b2118, 0xd9772b],
    [0x7a4a22, 0x2b2118, 0xb5412c],
    [0xd9c12b, 0x6b3fa0, 0x7a4a22],
  ];
  const g = group(
    cylX(1.15, 6.2, M.beige, 0, 1.5, 0, 16),
    cylX(0.3, 10.4, M.tin, 0, 1.5, 0, 8),
    boxes(
      [-5.1, 5.1].map((x) => [0.55, 2.3, 0.55, x, -0.6, 0]),
      M.tin,
    ),
  );
  sets[seed % 3].forEach((c, i) => g.add(cylX(1.22, 0.55, band(c), -1.9 + i * 1.15, 1.5, 0, 16)));
  g.add(cylX(1.22, 0.55, band(0xc9a23a), 2.1, 1.5, 0, 16));
  return g;
}

/** Generic surface-mount two-terminal part, long axis on X. */
export function smd(l: number, w: number, h: number, body: THREE.Material = M.black) {
  return group(
    box(l * 0.64, h, w, body),
    boxes(
      [-1, 1].map((s) => [l * 0.2, h + 0.03, w + 0.03, s * l * 0.4, 0, 0]),
      M.tin,
    ),
  );
}

export const disc = () => box(3.6, 3.4, 1.5, M.orange, 0, 0.9, 0);

/** Tactile push-button. */
export function tact(size = 6, cap: THREE.Material = M.black) {
  return group(box(size, size * 0.55, size, M.steel), cyl(size * 0.29, size * 0.2, cap, 0, size * 0.55, 0, 20));
}

let glowTex: THREE.Texture | null = null;
function glow() {
  if (!glowTex)
    glowTex = canvasTex(128, 128, (c) => {
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.22, 'rgba(255,255,255,.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
    });
  return glowTex;
}

/** LED with its own material, so each one switches independently: led.userData.set(true). */
export function led(color: number, th = false) {
  const g = new THREE.Group();
  const lens = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5),
    roughness: 0.25,
    emissive: color,
    emissiveIntensity: 0,
  });
  let top = 0.9;
  if (th) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), lens);
    dome.position.y = 3.6;
    const body = cyl(1.5, 3.2, lens, 0, 0.4, 0, 18);
    body.userData.noHl = dome.userData.noHl = true;
    g.add(body, dome, cyl(1.9, 0.5, lens, 0, 0.3, 0, 18));
    top = 4.2;
  } else {
    const l = box(1.3, 0.42, 1.05, lens, 0, 0.42, 0);
    l.castShadow = false;
    l.userData.noHl = true;
    g.add(box(2, 0.44, 1.25, M.white), l);
  }
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glow(),
      color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.7,
    }),
  );
  sp.scale.setScalar(th ? 10 : 7);
  sp.position.y = top;
  sp.visible = false;
  g.add(sp);
  g.userData.set = (on: boolean) => {
    lens.emissiveIntensity = on ? 3.2 : 0;
    sp.visible = on;
  };
  return g;
}

/** Text lying flat on the "floor" of a figure. */
export function floorLabel(text: string, w: number, h: number, color = '#13232c') {
  const s = 640 / w;
  const tex = canvasTex(640, Math.round(h * s), (c, W, H) => {
    c.fillStyle = color;
    c.font = `600 ${H * 0.6}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, W / 2, H / 2);
  });
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
  );
}
