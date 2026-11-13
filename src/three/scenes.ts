import * as THREE from 'three';
import type { Fig } from './engine';
import { clamp, damp, prefersReduced, smooth } from './engine';
import * as P from './parts';
import * as B from './boards';

const { M } = P;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Params = Record<string, any>;
export interface Api {
  update(p: Params): void;
}
export type Setup = (fig: Fig) => Api;

/* ---------- shared helpers ---------- */

const glowCache = new Map<THREE.Material, THREE.Material>();
function glowMat(m: THREE.Material) {
  let g = glowCache.get(m);
  if (!g) {
    g = m.clone();
    const s = g as THREE.MeshStandardMaterial;
    if (s.emissive) {
      s.emissive = new THREE.Color(0xff5a1c);
      s.emissiveIntensity = 0.6;
    }
    glowCache.set(m, g);
  }
  return g;
}

/** Tints named parts so the text can point at the model. Accepts "usb,bridge". */
function highlighter(root: THREE.Object3D) {
  let cur: THREE.Mesh[] = [];
  let key = '';
  return (names: string | null | undefined) => {
    const k = names ?? '';
    if (k === key) return;
    key = k;
    cur.forEach((m) => {
      m.material = m.userData.om;
      m.userData.om = null;
    });
    cur = [];
    if (!k) return;
    const want = k.split(',');
    root.traverse((o) => {
      if (!want.includes(o.name)) return;
      o.traverse((c) => {
        const m = c as THREE.Mesh;
        if (!m.isMesh || m.userData.om || m.userData.noHl) return;
        m.userData.om = m.material;
        m.material = Array.isArray(m.material) ? m.material.map(glowMat) : glowMat(m.material);
        cur.push(m);
      });
    });
  };
}

function exploder(board: THREE.Group) {
  const parts = board.userData.parts as Record<string, THREE.Group>;
  return (e: number) => {
    for (const k in parts) parts[k].position.y = parts[k].userData.lift * e;
  };
}

/** A value that eases towards its target on the figure's clock. */
function follower(fig: Fig, initial: number, apply: (v: number) => void, speed = 5) {
  let cur = initial;
  let target = initial;
  apply(cur);
  fig.add((_t, dt) => {
    if (cur === target) return false;
    cur = prefersReduced() || Math.abs(target - cur) < 0.0008 ? target : damp(cur, target, speed, dt);
    apply(cur);
    fig.dirty = true;
    return cur !== target;
  });
  return (v: number) => {
    if (v === target) return;
    target = v;
    fig.invalidate();
  };
}

/* ---------- 00 · hero: the Uno comes apart as you scroll ---------- */

export const setupHero: Setup = (fig) => {
  const uno = B.classic(B.BOARDS.uno);
  fig.root.add(uno);
  const explode = exploder(uno);
  return {
    update(p) {
      const raw = clamp(p.explode ?? 0);
      const e = smooth(raw);
      explode(e);
      fig.root.position.y = -e * 15;
      fig.setRadius(48 + e * 15);
      if (!fig.touched) {
        fig.yaw = -0.5 + raw * 0.75;
        fig.pitch = 0.95 - e * 0.3;
      }
    },
  };
};

/* ---------- 03 · six boards on one shelf ---------- */

export const LINEAGE = ['serial', 'usb', 'extreme', 'ng', 'diecimila', 'duemilanove'];

export const setupLineage: Setup = (fig) => {
  const GAP = 98;
  const boards = LINEAGE.map((k, i) => {
    const b = B.classic({ ...B.BOARDS[k], px: 14 });
    b.position.x = i * GAP;
    fig.root.add(b);
    return b;
  });
  const hls = boards.map((b) => highlighter(b));
  const go = follower(fig, 0, (cur) => {
    fig.root.position.x = -cur * GAP;
    boards.forEach((b, i) => {
      const d = Math.abs(i - cur);
      b.position.y = -Math.min(1, d) * 8;
      b.visible = d < 2.4;
    });
  });
  return {
    update(p) {
      const step = clamp(Math.round(p.step ?? 0), 0, boards.length - 1);
      go(step);
      hls.forEach((h, i) => h(i === step ? p.hl : null));
    },
  };
};

/* ---------- 07 · anatomy of the Uno ---------- */

const UNO_VIEWS: [number, number][] = [
  [-0.45, 0.95],
  [0.75, 0.7],
  [-0.5, 1.05],
  [0.35, 1.05],
  [-0.95, 0.6],
  [0.95, 0.72],
  [-0.5, 0.7],
];
const UNO_FOCUS = ['', 'usb,bridge', 'mcu', 'crystal', 'headers', 'jack,power', ''];

export const setupAnatomy: Setup = (fig) => {
  const uno = B.classic(B.BOARDS.uno);
  fig.root.add(uno);
  const explode = exploder(uno);
  const hl = highlighter(uno);
  let step = -1;
  return {
    update(p) {
      const s = clamp(Math.round(p.step ?? 0), 0, UNO_VIEWS.length - 1);
      if (s !== step) {
        if (step !== -1 || !fig.touched) fig.lookTo(UNO_VIEWS[s][0], UNO_VIEWS[s][1]);
        step = s;
      }
      const e = smooth(p.explode ?? 0);
      explode(e);
      fig.root.position.y = -e * 15;
      fig.setRadius(47 + e * 16);
      hl(p.hl || UNO_FOCUS[s]);
    },
  };
};

/* ---------- 07b · blink ---------- */

export const setupBlink: Setup = (fig) => {
  const uno = B.classic(B.BOARDS.uno);
  fig.root.add(uno);
  const led = uno.userData.leds.l as THREE.Group;
  let delay = 1000;
  let on = true;
  let acc = 0;
  led.userData.set(true);
  fig.add((_t, dt) => {
    acc += dt * 1000;
    if (acc >= delay) {
      acc = acc % delay;
      on = !on;
      led.userData.set(on);
      fig.dirty = true;
    }
    return true;
  });
  return {
    update(p) {
      delay = Math.max(20, p.delay ?? 1000);
    },
  };
};

/* ---------- 02 · etch it yourself ---------- */

export const setupEtch: Setup = (fig) => {
  const b = B.diyBoard();
  fig.root.add(b);
  const parts = b.userData.parts as Record<string, THREE.Group>;
  const n = Object.keys(parts).length;
  const WIN = 2;
  let last: { etch: number; populate: number } | null = null;
  return {
    update(p) {
      const etch = clamp(p.etch ?? 0);
      const pop = clamp(p.populate ?? 0);
      b.userData.setEtch(etch);
      for (const k in parts) {
        const t = smooth(clamp((pop * (n - 1 + WIN) - parts[k].userData.order) / WIN));
        parts[k].visible = t > 0.001;
        parts[k].position.y = (1 - t) * 36;
      }
      fig.root.position.y = -pop * 5;
      if (last) {
        if (etch !== last.etch && fig.pitch > -0.25) fig.lookTo(fig.yaw, -0.95);
        if (pop !== last.populate && fig.pitch < 0.25) fig.lookTo(fig.yaw, 0.85);
      }
      last = { etch, populate: pop };
    },
  };
};

/* ---------- 04 · inside the DIP ---------- */

const DIE: Record<string, [number, number, number, number, string, string]> = {
  flash: [0.1, 0.1, 0.48, 0.52, '#1f9aa0', 'FLASH'],
  sram: [0.62, 0.1, 0.28, 0.24, '#d9952f', 'SRAM'],
  eeprom: [0.62, 0.38, 0.28, 0.24, '#c8553a', 'EEPROM'],
  cpu: [0.1, 0.66, 0.36, 0.24, '#6f80d6', 'AVR CPU'],
  io: [0.5, 0.66, 0.4, 0.24, '#8b9199', 'ADC · TIMERS · UART'],
};

export const setupDecap: Setup = (fig) => {
  const g = new THREE.Group();
  g.position.y = -1.9;
  fig.root.add(g);
  const L = 35.56;
  const MID = 1.65;
  const legs: number[][] = [];
  const fingers: THREE.BufferGeometry[] = [];
  const wires: THREE.BufferGeometry[] = [];
  const padPts: number[][] = [];
  for (let i = 0; i < 14; i++)
    for (const s of [-1, 1]) {
      const x = -L / 2 + 1.27 + i * 2.54;
      legs.push([1.3, 0.25, 1.5, x, MID - 0.05, s * 3.4], [1.3, 1.6, 0.28, x, MID - 1.5, s * 3.86], [0.5, 2.6, 0.28, x, MID - 4, s * 3.86]);
      // lead-frame finger: runs from the leg towards the die and stops on an ellipse around it
      const th = Math.atan2(s * 3, x);
      const r = (6.5 * 2.4) / Math.hypot(2.4 * Math.cos(th), 6.5 * Math.sin(th));
      const tx = r * Math.cos(th);
      const tz = r * Math.sin(th);
      fingers.push(P.stripGeo(x, s * 2.9, tx, tz, 0.26, 0.2, MID - 0.02));
      const k = 1.32 / Math.max(Math.abs(tx), Math.abs(tz));
      const px = tx * k;
      const pz = tz * k;
      padPts.push([px, pz]);
      wires.push(
        new THREE.TubeGeometry(
          new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(tx, MID + 0.18, tz),
            new THREE.Vector3((tx + px) / 2, MID + 1.25, (tz + pz) / 2),
            new THREE.Vector3(px, MID + 0.56, pz),
          ),
          12,
          0.04,
          5,
        ),
      );
    }
  g.add(P.boxes(legs, M.tin), P.merged(fingers, M.tin), P.merged(wires, M.gold));
  g.add(P.box(L, MID, 6.5, M.chip));
  g.add(P.box(4.4, 0.2, 3.4, M.paddle, 0, MID, 0));
  g.add(P.box(3, 0.35, 3, M.chip, 0, MID + 0.2, 0));

  const cv = document.createElement('canvas');
  cv.width = cv.height = 768;
  const c = cv.getContext('2d')!;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  let shown = 'none';
  const paintDie = (hl: string) => {
    if (hl === shown) return;
    shown = hl;
    const S = 768;
    c.fillStyle = '#2b2942';
    c.fillRect(0, 0, S, S);
    for (const key in DIE) {
      const [x, y, w, h, color, label] = DIE[key];
      c.globalAlpha = hl && hl !== key ? 0.28 : 1;
      c.fillStyle = color;
      c.fillRect(x * S, y * S, w * S, h * S);
      c.fillStyle = 'rgba(0,0,0,.2)';
      const pitch = key === 'cpu' || key === 'io' ? 13 : 7;
      for (let q = y * S + 3; q < (y + h) * S; q += pitch) c.fillRect(x * S, q, w * S, 2);
      if (key === 'flash' || key === 'sram' || key === 'eeprom')
        for (let q = x * S + 3; q < (x + w) * S; q += 21) c.fillRect(q, y * S, 2, h * S);
      c.fillStyle = '#fff';
      c.font = `700 ${key === 'io' ? 22 : 34}px "Arial Narrow", Arial, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(label, (x + w / 2) * S, (y + h / 2) * S);
    }
    c.globalAlpha = 1;
    c.fillStyle = '#e2b24e';
    padPts.forEach(([px, pz]) => c.fillRect((0.5 + px / 3) * S - 9, (0.5 + pz / 3) * S - 9, 18, 18));
    tex.needsUpdate = true;
  };
  paintDie('');
  const die = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 3).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, envMapIntensity: 0.35 }),
  );
  die.position.y = MID + 0.56;
  die.receiveShadow = true;
  g.add(die);

  const lid = new THREE.Group();
  lid.add(P.box(L, 1.65, 6.5, M.chip, 0, MID, 0));
  const top = P.chipTop(L, 6.5, ['ATMEL  ATMEGA328P-PU'], { notch: true });
  top.position.y = MID + 1.66;
  lid.add(top);
  g.add(lid);

  return {
    update(p) {
      const o = clamp(p.open ?? 0);
      lid.position.y = smooth(o / 0.5) * 18;
      const zoom = smooth((o - 0.5) / 0.5);
      fig.setRadius(21 * Math.pow(3.4 / 21, zoom));
      if (!fig.touched) fig.pitch = 0.9 + zoom * 0.38;
      paintDie(p.hl && DIE[p.hl] ? p.hl : '');
    },
  };
};

/* ---------- 04b · three packages, true to scale ---------- */

export const setupPackages: Setup = (fig) => {
  fig.root.position.x = 2.5;
  const items: [THREE.Group, number, number, string][] = [
    [P.dip(28, ['ATMEGA328P-PU']), -15, 1.2, 'PDIP-28'],
    [P.tqfp(7, 8, ['ATMEGA', '328P', 'AU']), 12.5, 0.6, 'TQFP-32'],
    [P.qfn(5, 8, ['MEGA', '328P', 'MU']), 25.5, 0.45, 'VQFN-32'],
  ];
  const flips = items.map(([o, x, mid, name]) => {
    const flip = new THREE.Group();
    o.position.y = -mid;
    flip.add(o);
    flip.position.set(x, 0, 0);
    const label = P.floorLabel(name, 13, 2.3);
    label.position.set(x, -3.4, 7.2);
    fig.root.add(flip, label);
    return flip;
  });
  const bar = P.boxes(
    [
      [10, 0.12, 0.3, 19, -3.4, -8],
      [0.3, 0.12, 1.4, 14, -3.4, -8],
      [0.3, 0.12, 1.4, 24, -3.4, -8],
    ],
    M.black,
  );
  bar.castShadow = false;
  const barLabel = P.floorLabel('10 mm', 9, 2);
  barLabel.position.set(19, -3.4, -10.2);
  fig.root.add(bar, barLabel);
  return {
    update(p) {
      const a = Math.PI * smooth(p.flip ?? 0);
      flips.forEach((f) => (f.rotation.x = a));
    },
  };
};

/* ---------- 10 · memory, one cube per kilobyte ---------- */

export const TIERS = [8, 16, 32, 128, 256, 512];
export const TIER_COLORS = ['#00979d', '#2f6fb0', '#6a56b8', '#d9a441', '#e0702f', '#44596a'];

export const setupMemory: Setup = (fig) => {
  const N = 512;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.86, 0.86, 0.86),
    new THREE.MeshStandardMaterial({ roughness: 0.45 }),
    N,
  );
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const col = new THREE.Color();
  for (let i = 0; i < N; i++) mesh.setColorAt(i, col.set(TIER_COLORS[TIERS.findIndex((t) => i < t)]));
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(8, 8, 8)),
    new THREE.LineBasicMaterial({ color: 0x13232c, transparent: true, opacity: 0.22 }),
  );
  frame.position.y = 4;
  const g = P.group(mesh, frame);
  g.position.y = -4;
  fig.root.add(g);

  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  let cur = 8;
  let target = 8;
  const place = () => {
    const count = Math.max(1, Math.min(N, Math.ceil(cur)));
    for (let i = 0; i < count; i++) {
      const s = Math.max(0.001, smooth(clamp(cur - i)));
      pos.set((i % 8) - 3.5, Math.floor(i / 64) + 0.5, 3.5 - (Math.floor(i / 8) % 8));
      m4.compose(pos, q, sc.setScalar(s));
      mesh.setMatrixAt(i, m4);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  };
  for (let i = 0; i < N; i++) {
    pos.set((i % 8) - 3.5, Math.floor(i / 64) + 0.5, 3.5 - (Math.floor(i / 8) % 8));
    m4.compose(pos, q, sc.setScalar(1));
    mesh.setMatrixAt(i, m4);
  }
  place();
  fig.add((_t, dt) => {
    if (cur === target) return false;
    const diff = target - cur;
    const stepBy = Math.max(50, Math.abs(diff) * 6) * dt;
    cur = prefersReduced() || Math.abs(diff) <= stepBy ? target : cur + Math.sign(diff) * stepBy;
    place();
    fig.dirty = true;
    return cur !== target;
  });
  return {
    update(p) {
      const t = TIERS[clamp(Math.round(p.chip ?? 0), 0, TIERS.length - 1)];
      if (t !== target) {
        target = t;
        fig.invalidate();
      }
    },
  };
};

/* ---------- 05 · Nano meets breadboard ---------- */

export const setupNano: Setup = (fig) => {
  const bb = B.breadboard();
  const n = B.nano();
  n.position.set(1.27, 0, 1.27);
  fig.root.add(bb, n);
  fig.root.position.y = 1;
  const hl = highlighter(n);
  return {
    update(p) {
      n.position.y = 4.1 + (1 - smooth(p.seat ?? 0)) * 17;
      hl(p.hl);
    },
  };
};

/* ---------- 06 · LilyPad: sewing a circuit ---------- */

export const setupLily: Setup = (fig) => {
  const FY = -0.86;
  const fabricTex = P.canvasTex(1160, 720, (c, W, H) => {
    c.fillStyle = '#d8cbae';
    c.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 5) {
      c.fillStyle = y % 10 ? 'rgba(90,70,30,.10)' : 'rgba(255,255,255,.14)';
      c.fillRect(0, y, W, 2);
    }
    for (let x = 0; x < W; x += 5) {
      c.fillStyle = x % 10 ? 'rgba(90,70,30,.08)' : 'rgba(255,255,255,.12)';
      c.fillRect(x, 0, 2, H);
    }
    c.strokeStyle = 'rgba(120,90,40,.55)';
    c.lineWidth = 4;
    c.setLineDash([16, 12]);
    c.strokeRect(26, 26, W - 52, H - 52);
  });
  const fabric = new THREE.Mesh(
    new THREE.PlaneGeometry(116, 72).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: fabricTex, roughness: 0.95, side: THREE.DoubleSide }),
  );
  fabric.position.y = FY;
  fabric.receiveShadow = true;

  const lily = B.lilypad();
  lily.position.x = -24;
  const mod = B.ledModule();
  mod.position.x = 36;
  mod.rotation.y = Math.PI / 2;
  fig.root.add(fabric, lily, mod);
  const hl = highlighter(lily);

  const threadMat = new THREE.MeshStandardMaterial({ color: 0x8e949b, roughness: 0.45, metalness: 0.7 });
  const SEG = 260;
  const RAD = 6;
  const mkThread = (a: THREE.Vector3, b: THREE.Vector3, bulge: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 70; i++) {
      const u = i / 70;
      const pt = a.clone().lerp(b, u);
      pt.z += Math.sin(u * Math.PI) * bulge;
      const ends = Math.max(0, 1 - u / 0.07) + Math.max(0, 1 - (1 - u) / 0.07);
      pt.y = FY + 0.5 * Math.sin(u * Math.PI * 2 * 10) + ends * 0.95;
      pts.push(pt);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const mesh = P.shade(new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, 0.3, RAD), threadMat));
    fig.root.add(mesh);
    return { curve, mesh };
  };
  const petal = lily.userData.petal as (i: number) => THREE.Vector3;
  const pPlus = petal(16).add(lily.position);
  const pMinus = petal(17).add(lily.position);
  const threads = [
    mkThread(pPlus, new THREE.Vector3(36, 0, 3.9), 7),
    mkThread(pMinus, new THREE.Vector3(36, 0, -3.9), -7),
  ];
  const needle = P.shade(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.32, 17, 8).rotateZ(-Math.PI / 2), M.steel));
  fig.root.add(needle);
  const X = new THREE.Vector3(1, 0, 0);
  const tan = new THREE.Vector3();
  const led = mod.userData.led as THREE.Group;
  led.children.forEach((c) => {
    if ((c as THREE.Sprite).isSprite) c.scale.setScalar(22);
  });

  return {
    update(p) {
      const sew = clamp(p.sew ?? 0);
      const parts = [clamp(sew * 2), clamp(sew * 2 - 1)];
      threads.forEach((t, i) => t.mesh.geometry.setDrawRange(0, Math.floor(parts[i] * SEG) * RAD * 6));
      const active = sew < 0.5 ? 0 : 1;
      const u = parts[active];
      needle.visible = sew > 0.004 && sew < 0.996;
      if (needle.visible) {
        const t = threads[active];
        t.curve.getTangentAt(u, tan);
        tan.y = 0;
        tan.normalize();
        needle.quaternion.setFromUnitVectors(X, tan);
        needle.position.copy(t.curve.getPointAt(u)).addScaledVector(tan, 8.5);
        needle.position.y = FY + 1.1;
      }
      led.userData.set(sew >= 0.996);
      hl(p.hl);
    },
  };
};

/* ---------- 08 · one shield, three boards ---------- */

export const setupShield: Setup = (fig) => {
  const bases = [B.classic(B.BOARDS.uno), B.mega('mega'), B.mega('due')];
  const sh = B.shield();
  bases.forEach((b) => fig.root.add(b));
  fig.root.add(sh);
  fig.root.position.y = -9;
  const off = (B.MEGA_W - B.UNO_W) / 2;
  const hls = bases.map((b) => highlighter(b));
  return {
    update(p) {
      const k = clamp(Math.round(p.board ?? 0), 0, 2);
      bases.forEach((b, i) => (b.visible = i === k));
      sh.position.x = k === 0 ? 0 : -off;
      sh.position.y = 10.1 + (1 - smooth(p.seat ?? 0)) * 30;
      fig.setRadius(k === 0 ? 48 : 60);
      hls.forEach((h, i) => h(i === k ? p.hl : null));
    },
  };
};

/* ---------- 09 · two chips become one ---------- */

export const setupSwap: Setup = (fig) => {
  const uno = B.classic(B.BOARDS.uno);
  const leo = B.classic(B.BOARDS.leonardo);
  fig.root.add(uno, leo);
  const SWAPPED = ['usb', 'mcu', 'bridge', 'icsp', 'small'];
  const hlU = highlighter(uno);
  const hlL = highlighter(leo);
  return {
    update(p) {
      const t = clamp(p.swap ?? 0);
      const s = smooth(t);
      ([
        [uno, 1 - s, t < 0.5],
        [leo, s, t >= 0.5],
      ] as [THREE.Group, number, boolean][]).forEach(([b, k, front]) => {
        const parts = b.userData.parts as Record<string, THREE.Group>;
        for (const name in parts) {
          const g = parts[name];
          if (SWAPPED.includes(name)) {
            g.visible = k > 0.003;
            g.scale.setScalar(Math.max(k, 0.003));
            g.position.y = (1 - k) * 30;
          } else g.visible = front;
        }
      });
      hlU(t < 0.5 ? p.hl : null);
      hlL(t >= 0.5 ? p.hl : null);
    },
  };
};
