import * as THREE from 'three';
import * as P from './parts';

const { M } = P;

/* Board coordinates: millimetres, origin at the bottom-left corner, USB on the left edge. */

export const UNO_W = 68.58;
export const UNO_H = 53.34;
export const MEGA_W = 101.6;

const UNO_OUTLINE: [number, number][] = [
  [0, 0],
  [64.5, 0],
  [66.04, 1.52],
  [66.04, 11.43],
  [68.58, 13.97],
  [68.58, 46.74],
  [66.04, 49.28],
  [66.04, 51.8],
  [64.5, 53.34],
  [0, 53.34],
];
const UNO_HOLES = [
  [15.24, 2.54, 1.6],
  [66.04, 7.62, 1.6],
  [66.04, 35.56, 1.6],
  [13.97, 50.8, 1.6],
];

/** How far each named part travels in an exploded view. */
const LIFT: Record<string, number> = {
  pcb: 0,
  small: 7,
  leds: 9,
  power: 13,
  reset: 15,
  jack: 18,
  bridge: 21,
  crystal: 24,
  icsp: 27,
  usb: 30,
  headers: 36,
  mcu: 44,
  pins: 0,
};

type Row = [number, number, string[]];

function kit(w: number, h: number) {
  const g = new THREE.Group();
  const parts: Record<string, THREE.Group> = {};
  const part = (name: string) => {
    if (!parts[name]) {
      const p = new THREE.Group();
      p.name = name;
      p.userData.lift = LIFT[name] ?? 10;
      parts[name] = p;
      g.add(p);
    }
    return parts[name];
  };
  const put = <T extends THREE.Object3D>(name: string, o: T, x: number, y: number, rot = 0, up = 0) => {
    const hold = new THREE.Group();
    hold.position.set(x - w / 2, up, h / 2 - y);
    hold.rotation.y = (rot * Math.PI) / 180;
    hold.add(o);
    part(name).add(hold);
    return o;
  };
  g.userData.parts = parts;
  return { g, put, part };
}

/* ------------------------------------------------------------------ */
/* The classic outline: Serial, USB, Extreme, NG, Diecimila,           */
/* Duemilanove, Uno, Leonardo                                          */
/* ------------------------------------------------------------------ */

export interface ClassicCfg {
  name: string;
  mask: string;
  r3?: boolean;
  conn: 'de9' | 'usbB' | 'micro';
  bridge: 'none' | 'tqfp' | 'ssop' | 'qfn';
  headers: boolean;
  th?: boolean;
  mcu: 'dip' | 'tqfp';
  chip: string[];
  jumper?: boolean;
  txrx?: boolean;
  l?: boolean;
  seed?: number;
  px?: number;
}

export const BOARDS: Record<string, ClassicCfg> = {
  serial: { name: 'Serial', mask: '#2f70a8', conn: 'de9', bridge: 'none', headers: false, th: true, mcu: 'dip', chip: ['ATMEGA8-16PU'], seed: 11 },
  usb: { name: 'USB', mask: '#2a69a2', conn: 'usbB', bridge: 'tqfp', headers: false, th: true, mcu: 'dip', chip: ['ATMEGA8-16PU'], jumper: true, seed: 12 },
  extreme: { name: 'Extreme', mask: '#26639d', conn: 'usbB', bridge: 'tqfp', headers: true, mcu: 'dip', chip: ['ATMEGA8-16PU'], jumper: true, txrx: true, seed: 13 },
  ng: { name: 'NG', mask: '#225e99', conn: 'usbB', bridge: 'ssop', headers: true, mcu: 'dip', chip: ['ATMEGA168-20PU'], jumper: true, txrx: true, l: true, seed: 14 },
  diecimila: { name: 'Diecimila', mask: '#1f5a95', conn: 'usbB', bridge: 'ssop', headers: true, mcu: 'dip', chip: ['ATMEGA168-20PU'], jumper: true, txrx: true, l: true, seed: 15 },
  duemilanove: { name: 'Duemilanove', mask: '#1c5591', conn: 'usbB', bridge: 'ssop', headers: true, mcu: 'dip', chip: ['ATMEGA328P-PU'], txrx: true, l: true, seed: 16 },
  uno: { name: 'UNO', mask: '#0e7e8d', r3: true, conn: 'usbB', bridge: 'qfn', headers: true, mcu: 'dip', chip: ['ATMEGA328P-PU'], txrx: true, l: true, seed: 3 },
  leonardo: { name: 'LEONARDO', mask: '#0e7e8d', r3: true, conn: 'micro', bridge: 'none', headers: true, mcu: 'tqfp', chip: ['ATMEGA', '32U4'], txrx: true, l: true, seed: 3 },
};

export function classic(cfg: ClassicCfg) {
  const W = UNO_W;
  const H = UNO_H;
  const { g, put } = kit(W, H);
  const r3 = !!cfg.r3;
  const top: Row[] = r3
    ? [
        [18.796, 10, ['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8']],
        [45.72, 8, ['7', '~6', '~5', '4', '~3', '2', 'TX1', 'RX0']],
      ]
    : [
        [23.876, 8, ['AREF', 'GND', '13', '12', '11', '10', '9', '8']],
        [45.72, 8, ['7', '6', '5', '4', '3', '2', '1', '0']],
      ];
  const bot: Row[] = r3
    ? [
        [27.94, 8, ['', 'IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN']],
        [50.8, 6, ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']],
      ]
    : [
        [33.02, 6, ['RESET', '3V3', '5V', 'GND', 'GND', 'VIN']],
        [50.8, 6, ['0', '1', '2', '3', '4', '5']],
      ];
  const DX = 47.5;
  const DY = 15.2;
  const dipMcu = cfg.mcu === 'dip';

  const board = P.pcb({
    w: W,
    h: H,
    mask: cfg.mask,
    px: cfg.px,
    outline: UNO_OUTLINE,
    holes: UNO_HOLES,
    top: (a) => {
      a.traces(cfg.seed ?? 3, 54, 0.3, 0.045);
      for (const [x0, n, labels] of top) {
        a.row(x0, 50.8, n);
        labels.forEach((t, i) => a.text(t, x0 + i * 2.54, 48.7, 1.1, { rot: 90, align: 'right' }));
      }
      for (const [x0, n, labels] of bot) {
        a.row(x0, 2.54, n);
        labels.forEach((t, i) => a.text(t, x0 + i * 2.54, 4.6, 1.1, { rot: 90, align: 'left' }));
      }
      a.text(r3 ? 'DIGITAL (PWM~)' : 'DIGITAL', 50, 43.4, 1.35);
      a.text('POWER', bot[0][0] + (bot[0][1] - 1) * 1.27, 9.3, 1.2);
      a.text('ANALOG IN', 57.15, 9.3, 1.2);
      if (dipMcu) {
        a.row(DX - 16.51, DY + 3.81, 14, 2.54, 0, 0.8, 0.4);
        a.row(DX - 16.51, DY - 3.81, 14, 2.54, 0, 0.8, 0.4);
        a.text('MADE IN ITALY', 49, 22.6, 0.95, { weight: 400 });
      }
      a.row(63.53, 25.36, 3, 0, 2.54, 0.8, 0.4);
      a.row(66.07, 25.36, 3, 0, 2.54, 0.8, 0.4);
      a.text('ICSP', 60.9, 27.9, 1.05, { rot: 90 });
      if (r3) {
        a.logo(44.2, 34.4, 2.9);
        a.text('ARDUINO', 44.2, 29.4, 1.7, { weight: 800 });
        a.text(cfg.name, 56.6, 34.5, cfg.name.length > 4 ? 2.1 : 3.6, { weight: 800 });
        a.text('RESET', 9, 49.8, 1, { align: 'left' });
      } else {
        a.text('Arduino', 46, 35.2, 3.6, { font: 'Georgia, "Times New Roman", serif', weight: 'italic 700' });
        a.text(cfg.name.toUpperCase(), 46, 30.8, 2);
        a.text('www.arduino.cc', 46, 27.8, 1.05, { weight: 400 });
      }
      if (cfg.l) a.text('L', 29.8, 43.5, 1.1, { align: 'right' });
      if (cfg.txrx) {
        a.text('TX', 29.8, 40.3, 1.1, { align: 'right' });
        a.text('RX', 29.8, 37.6, 1.1, { align: 'right' });
      }
      a.text(r3 ? 'ON' : 'PWR', 59.3, 40, 1.1, { align: 'right' });
      if (!cfg.headers) {
        // bare boards: draw the outlines where headers would be soldered
        for (const [x0, n] of top) a.frame(x0 + (n - 1) * 1.27, 50.8, n * 2.54, 2.54, 0.12);
        for (const [x0, n] of bot) a.frame(x0 + (n - 1) * 1.27, 2.54, n * 2.54, 2.54, 0.12);
      }
    },
  });
  put('pcb', board, W / 2, H / 2);

  if (cfg.headers) {
    for (const [x0, n] of top) put('headers', P.header(n), x0 + (n - 1) * 1.27, 50.8);
    for (const [x0, n] of bot) put('headers', P.header(n), x0 + (n - 1) * 1.27, 2.54);
  }

  if (cfg.conn === 'usbB') put('usb', P.usbB(), 2.4, 38.2);
  else if (cfg.conn === 'de9') put('usb', P.de9(), 6.2, 36.2);
  else put('usb', P.microUsb(), 1.7, 38.2);
  put('jack', P.barrelJack(), 5, 7.6);

  if (dipMcu) put('mcu', P.dip(28, cfg.chip, true), DX, DY);
  else put('mcu', P.tqfp(10, 11, cfg.chip), 42, 20.5);

  if (cfg.bridge === 'tqfp') put('bridge', P.tqfp(7, 8, ['FTDI', 'FT232BM']), 23.5, 38.5);
  if (cfg.bridge === 'ssop') put('bridge', P.soic(28, 10.2, 5.3, 0.65, ['FTDI', 'FT232RL']), 23.5, 38.5, 90);
  if (cfg.bridge === 'qfn') put('bridge', P.qfn(5, 8, ['MEGA', '16U2']), 23.5, 38.5, 45);

  put('crystal', P.crystal(), 27, 30.5);

  if (cfg.th) {
    put('power', P.to220(), 11, 23.5, 90);
    put('power', P.elco(5, 11, true), 16, 16.5);
    put('power', P.elco(5, 11, true), 22.8, 16.5);
  } else {
    put('power', P.sot223(), 11, 23.5, 90);
    put('power', P.elco(6.3, 5.6), 15.6, 16.5);
    put('power', P.elco(6.3, 5.6), 22.8, 16.5);
  }

  if (r3) put('reset', P.tact(4.2, M.red), 6.3, 49.6);
  else put('reset', P.tact(6), 56.5, 26);

  put('icsp', P.pinHeader(3, 2), 64.8, 27.9, 90);
  if (cfg.bridge === 'qfn') put('icsp', P.pinHeader(3, 2), 17.8, 46.2);

  const leds: Record<string, THREE.Group> = {};
  const addLed = (k: string, color: number, x: number, y: number) => {
    leds[k] = put('leds', P.led(color, cfg.th), x, y);
  };
  addLed('on', 0x3ddc55, 61, 40);
  if (cfg.l) addLed('l', 0xffa41c, 31.5, 43.5);
  if (cfg.txrx) {
    addLed('tx', 0xffd23a, 31.5, 40.3);
    addLed('rx', 0xffd23a, 31.5, 37.6);
  }
  leds.on.userData.set(true);
  g.userData.leds = leds;

  if (cfg.th) {
    [
      [18, 31.2, 0],
      [41, 25, 0],
      [38, 41, 0],
      [20.5, 46.6, 0],
    ].forEach(([x, y, r], i) => put('small', P.resistor(i), x, y, r));
    put('small', P.to92(), 15.5, 44.5);
    put('small', P.disc(), 34.5, 25.4, 90);
    put('small', P.disc(), 34.5, 31.5, 90);
  } else {
    const R = M.black;
    const C = M.beige;
    const spots: [number, number, number, THREE.Material][] = [
      [25, 24.6, 0, C],
      [27.6, 26.2, 0, R],
      [35, 41.4, 90, R],
      [35, 38.2, 90, R],
      [14, 36, 90, C],
      [14, 40, 90, R],
      [40, 41.4, 0, R],
      [45, 41.4, 0, C],
      [55, 41.4, 0, R],
    ];
    if (!cfg.jumper) spots.push([16, 24, 90, R], [18.5, 24, 90, C], [21.5, 24, 90, R]);
    spots.forEach(([x, y, r, m]) => put('small', P.smd(1.8, 0.9, 0.55, m), x, y, r));
    if (!cfg.jumper) put('small', P.smd(4.6, 3.2, 0.9, M.green), 17.5, 30.3);
    if (r3 && dipMcu) put('small', P.soic(8, 4.9, 3.9, 1.27, ['358']), 33.2, 24.6, 90);
  }
  if (cfg.jumper) {
    const j = P.pinHeader(3, 1);
    j.add(P.box(5, 5.6, 2.5, M.black, -1.27, 2.6, 0));
    put('small', j, 17, 27.3, 90);
  }
  return g;
}

/* ------------------------------------------------------------------ */
/* Mega 2560 and Due                                                   */
/* ------------------------------------------------------------------ */

export function mega(kind: 'mega' | 'due') {
  const W = MEGA_W;
  const H = UNO_H;
  const due = kind === 'due';
  const { g, put } = kit(W, H);
  const outline: [number, number][] = [
    [0, 0],
    [96.5, 0],
    [99.06, 2.54],
    [99.06, 11.43],
    [101.6, 13.97],
    [101.6, 46.74],
    [99.06, 49.28],
    [99.06, 51.8],
    [97.5, 53.34],
    [0, 53.34],
  ];
  const top: Row[] = [
    [18.796, 10, ['SCL', 'SDA', 'AREF', 'GND', '13', '12', '11', '10', '9', '8']],
    [45.72, 8, ['7', '6', '5', '4', '3', '2', '1', '0']],
    [68.58, 8, ['14', '15', '16', '17', '18', '19', '20', '21']],
  ];
  const bot: Row[] = [
    [27.94, 8, ['', 'IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN']],
    [50.8, 8, ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']],
    [73.66, 8, ['A8', 'A9', 'A10', 'A11', due ? 'DAC0' : 'A12', due ? 'DAC1' : 'A13', due ? 'CANRX' : 'A14', due ? 'CANTX' : 'A15']],
  ];
  const chipAt: [number, number] = due ? [80.5, 26.4] : [47, 24.6];
  const board = P.pcb({
    w: W,
    h: H,
    mask: due ? '#125a7c' : '#0e7e8d',
    outline,
    holes: [...UNO_HOLES, [90.17, 50.8, 1.6]],
    top: (a) => {
      a.traces(due ? 41 : 31, 80, 0.3, 0.045);
      for (const [x0, n, labels] of top) {
        a.row(x0, 50.8, n);
        labels.forEach((t, i) => a.text(t, x0 + i * 2.54, 48.7, 1.1, { rot: 90, align: 'right' }));
      }
      for (const [x0, n, labels] of bot) {
        a.row(x0, 2.54, n);
        labels.forEach((t, i) => a.text(t, x0 + i * 2.54, 4.6, 1.1, { rot: 90, align: 'left' }));
      }
      for (let i = 0; i < 18; i++) {
        a.pad(93.98, 5.08 + i * 2.54);
        a.pad(96.52, 5.08 + i * 2.54);
      }
      a.text('DIGITAL', 91.4, 26.7, 1.3, { rot: 90 });
      a.text('PWM', 40, 43.4, 1.3);
      a.text('COMMUNICATION', 77.5, 43.4, 1.3);
      a.text('POWER', 36.8, 9.3, 1.2);
      a.text('ANALOG IN', 71, 9.3, 1.2);
      a.row(63.53, 25.36, 3, 0, 2.54, 0.8, 0.4);
      a.row(66.07, 25.36, 3, 0, 2.54, 0.8, 0.4);
      const lx = due ? 45 : 79;
      a.logo(lx, 34.4, 2.9);
      a.text('ARDUINO', lx, 29.4, 1.7, { weight: 800 });
      a.text(due ? 'DUE' : 'MEGA 2560', lx, due ? 24.4 : 23.6, due ? 3.4 : 2.6, { weight: 800 });
      a.text('L', 29.8, 43.5, 1.1, { align: 'right' });
      a.text('TX', 29.8, 40.3, 1.1, { align: 'right' });
      a.text('RX', 29.8, 37.6, 1.1, { align: 'right' });
      a.text('ON', 59.3, 40, 1.1, { align: 'right' });
    },
  });
  put('pcb', board, W / 2, H / 2);
  for (const [x0, n] of top) put('headers', P.header(n), x0 + (n - 1) * 1.27, 50.8);
  for (const [x0, n] of bot) put('headers', P.header(n), x0 + (n - 1) * 1.27, 2.54);
  put('headers', P.header(18, 2), 95.25, 26.67, 90);

  if (due) {
    put('usb', P.microUsb(), 1.7, 38.2);
    put('usb', P.microUsb(), 1.7, 25.6);
    put('mcu', P.tqfp(20, 36, ['ATMEL', 'ATSAM3X8E', 'ARM CORTEX-M3'], 0.5), chipAt[0], chipAt[1]);
    put('reset', P.tact(4.2, M.black), 13.5, 31.6);
  } else {
    put('usb', P.usbB(), 2.4, 38.2);
    put('mcu', P.tqfp(14, 25, ['ATMEGA', '2560', '16AU'], 0.5), chipAt[0], chipAt[1], 45);
    put('icsp', P.pinHeader(3, 2), 17.8, 46.2);
  }
  put('jack', P.barrelJack(), 5, 7.6);
  put('bridge', P.qfn(5, 8, ['MEGA', '16U2']), 23.5, 38.5, 45);
  put('crystal', P.crystal(), 27, 30.5);
  put('power', P.sot223(), 11, 23.5, 90);
  put('power', P.elco(6.3, 5.6), 15.6, 16.5);
  put('power', P.elco(6.3, 5.6), 22.8, 16.5);
  put('reset', P.tact(4.2, M.red), 6.3, 49.6);
  put('icsp', P.pinHeader(3, 2), 64.8, 27.9, 90);

  const leds: Record<string, THREE.Group> = {};
  leds.on = put('leds', P.led(0x3ddc55), 61, 40);
  leds.l = put('leds', P.led(0xffa41c), 31.5, 43.5);
  leds.tx = put('leds', P.led(0xffd23a), 31.5, 40.3);
  leds.rx = put('leds', P.led(0xffd23a), 31.5, 37.6);
  leds.on.userData.set(true);
  g.userData.leds = leds;

  const spots = [
    [25, 24.6, 0],
    [35, 41.4, 90],
    [35, 38.2, 90],
    [14, 36, 90],
    [40, 41.4, 0],
    [55, 41.4, 0],
    [66, 20, 0],
    [70, 40, 90],
    [86, 41, 0],
    [60, 14, 90],
    [30, 14, 0],
    [34, 14, 0],
  ];
  spots.forEach(([x, y, r], i) => put('small', P.smd(1.8, 0.9, 0.55, i % 2 ? M.beige : M.black), x, y, r));
  put('small', P.smd(4.6, 3.2, 0.9, M.green), 17.5, 30.3);
  return g;
}

/* ------------------------------------------------------------------ */
/* A prototyping shield in the standard footprint                      */
/* ------------------------------------------------------------------ */

export function shield() {
  const W = UNO_W;
  const H = UNO_H;
  const { g, put } = kit(W, H);
  const rows: [number, number, number][] = [
    [18.796, 10, 50.8],
    [45.72, 8, 50.8],
    [27.94, 8, 2.54],
    [50.8, 6, 2.54],
  ];
  const outline = UNO_OUTLINE.map(([x, y]) => [Math.max(x, 17), y] as [number, number]);
  const board = P.pcb({
    w: W,
    h: H,
    mask: '#a9342b',
    outline,
    holes: [
      [66.04, 7.62, 1.6],
      [66.04, 35.56, 1.6],
    ],
    top: (a) => {
      for (const [x0, n, y] of rows) a.row(x0, y, n);
      for (let x = 22.86; x < 62; x += 2.54) for (let y = 12.7; y < 44; y += 2.54) a.pad(x, y, 0.82, 0.42, '#dcc47c');
      a.text('PROTO SHIELD', 42, 46.6, 1.5, { weight: 800 });
      a.text('5V', 20.4, 12.7, 1.1);
      a.text('GND', 20.2, 43.2, 1.1);
    },
  });
  put('pcb', board, W / 2, H / 2);
  for (const [x0, n, y] of rows) {
    const x = x0 + (n - 1) * 1.27;
    put('headers', P.header(n), x, y);
    put('pins', P.pinsDown(n, 7.2, 0), x, y);
  }
  put('reset', P.tact(6), 21.2, 7);
  return g;
}

/* ------------------------------------------------------------------ */
/* Nano and its natural habitat                                        */
/* ------------------------------------------------------------------ */

export function nano() {
  const W = 43.18;
  const H = 17.78;
  const { g, put } = kit(W, H);
  const board = P.pcb({
    w: W,
    h: H,
    mask: '#1d5d96',
    round: 0.8,
    holes: [
      [1.27, 1.27, 0.8],
      [1.27, 16.51, 0.8],
      [41.91, 1.27, 0.8],
      [41.91, 16.51, 0.8],
    ],
    top: (a) => {
      a.traces(23, 16, 0.24, 0.05);
      a.row(3.81, 1.27, 15, 2.54, 0, 0.85, 0.3);
      a.row(3.81, 16.51, 15, 2.54, 0, 0.85, 0.3);
      a.text('ARDUINO', 11.2, 14.2, 1.05);
      a.text('NANO', 11.2, 3.6, 1.05);
      a.text('RST', 29.5, 12.6, 0.9);
      a.text('ICSP', 35.2, 3.5, 0.9);
    },
  });
  put('pcb', board, W / 2, H / 2);
  put('usb', P.miniUsb(), 3.2, 8.89);
  put('mcu', P.tqfp(7, 8, ['ATMEGA', '328P']), 20.5, 8.89, 45);
  put('reset', P.tact(3.6), 29.5, 8.89);
  put('icsp', P.pinHeader(3, 2, 5), 38.6, 8.89, 90);
  const leds: Record<string, THREE.Group> = {};
  [
    ['tx', 0xffd23a, 5.3],
    ['rx', 0xffd23a, 7.7],
    ['on', 0x3ddc55, 10.1],
    ['l', 0xffa41c, 12.5],
  ].forEach(([k, c, y]) => {
    leds[k as string] = put('leds', P.led(c as number), 33.4, y as number);
  });
  g.userData.leds = leds;
  const joints: number[][] = [];
  for (let i = 0; i < 15; i++) for (const s of [-1, 1]) joints.push([0.95, 0.5, 0.95, -17.78 + i * 2.54, 0, s * 7.62]);
  put('pins', P.boxes(joints, M.tin), W / 2, H / 2);
  put('pins', P.pinsDown(15, 6, 2.5), 21.59, 1.27);
  put('pins', P.pinsDown(15, 6, 2.5), 21.59, 16.51);
  put('small', P.smd(3.2, 1.3, 0.9, M.steel), 26.4, 4.4);
  put('small', P.smd(1.8, 0.9, 0.55, M.beige), 12.8, 8.9, 90);
  put('small', P.smd(1.8, 0.9, 0.55, M.black), 26.4, 13.4);
  return g;
}

/** Half-size solderless breadboard. Top face at y = 0. */
export function breadboard() {
  const W = 83;
  const D = 55;
  const g = new THREE.Group();
  g.add(P.box(W, 8.5, D, M.white, 0, -8.5, 0));
  const s = 16;
  const tex = P.canvasTex(W * s, D * s, (c) => {
    c.fillStyle = '#eceae1';
    c.fillRect(0, 0, W * s, D * s);
    c.fillStyle = '#cfccc0';
    c.fillRect(0, (D / 2 - 1.5) * s, W * s, 3 * s);
    const hole = (x: number, z: number) => {
      c.fillStyle = '#b9b6aa';
      c.fillRect((W / 2 + x - 0.8) * s, (D / 2 + z - 0.8) * s, 1.6 * s, 1.6 * s);
      c.fillStyle = '#2a2b2c';
      c.fillRect((W / 2 + x - 0.55) * s, (D / 2 + z - 0.55) * s, 1.1 * s, 1.1 * s);
    };
    for (let i = 0; i < 30; i++) {
      const x = -36.83 + i * 2.54;
      for (const z of [3.81, 6.35, 8.89, 11.43, 13.97]) {
        hole(x, z);
        hole(x, -z);
      }
      if (i % 6 !== 5 && i < 29)
        for (const z of [19.7, 22.24]) {
          hole(x + 1.27, z);
          hole(x + 1.27, -z);
        }
    }
    for (const sg of [-1, 1]) {
      c.fillStyle = '#c8402f';
      c.fillRect(4 * s, (D / 2 + sg * 18 - 0.2) * s, (W - 8) * s, 0.4 * s);
      c.fillStyle = '#2f62b0';
      c.fillRect(4 * s, (D / 2 + sg * 24 - 0.2) * s, (W - 8) * s, 0.4 * s);
    }
  });
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }),
  );
  face.position.y = 0.02;
  face.receiveShadow = true;
  g.add(face);
  return g;
}

/* ------------------------------------------------------------------ */
/* LilyPad                                                             */
/* ------------------------------------------------------------------ */

const PURPLE = '#5a2a82';
const GOLD = '#cfa63e';

export function lilypad() {
  const W = 50;
  const N = 22;
  const { g, put } = kit(W, W);
  const names = ['a2', 'a3', 'a4', 'a5', '+', 'rx', 'tx', '2', '3', '4', '5', '6', '7', '8', '9', '10', '13', '–', '11', '12', 'a0', 'a1'];
  const petals = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 + Math.PI / 2;
    return { a, x: 25 + 21.2 * Math.cos(a), y: 25 + 21.2 * Math.sin(a) };
  });
  const art = (labels: boolean) => (a: P.Art) => {
    petals.forEach((p, i) => {
      const cs = Math.cos(p.a);
      const sn = Math.sin(p.a);
      a.line(
        [
          [25 + 18.7 * cs, 25 + 18.7 * sn],
          [25 + 24.4 * cs, 25 + 24.4 * sn],
        ],
        3.9,
        GOLD,
      );
      if (labels) a.text(names[i], 25 + 15.2 * cs, 25 + 15.2 * sn, 1.5, { rot: (p.a * 180) / Math.PI - 90 });
    });
    if (labels) {
      a.traces(5, 10, 0.25, 0.06);
      a.text('LilyPad Arduino', 25, 33.4, 1.25, { weight: 400 });
    }
  };
  const board = P.pcb({
    w: W,
    h: W,
    t: 0.8,
    circle: true,
    mask: PURPLE,
    holes: petals.map((p) => [p.x, p.y, 1.05]),
    top: art(true),
    bottom: art(false),
  });
  put('pcb', board, W / 2, W / 2);
  put('mcu', P.tqfp(7, 8, ['ATMEGA', '328P']), 25, 25, 45);
  put('reset', P.tact(3.6), 25, 15.2);
  put('small', P.smd(3.2, 1.3, 0.9, M.steel), 34.6, 25, 90);
  put('small', P.smd(1.8, 0.9, 0.55, M.beige), 16, 27, 90);
  put('small', P.smd(1.8, 0.9, 0.55, M.black), 16, 23, 90);
  g.userData.petal = (i: number) => new THREE.Vector3(petals[i].x - 25, 0, 25 - petals[i].y);
  return g;
}

/** A sewable LED on its own little board; + pad on -X, - pad on +X. */
export function ledModule() {
  const g = new THREE.Group();
  g.add(
    P.pcb({
      w: 13,
      h: 5.6,
      t: 0.8,
      round: 2.79,
      mask: PURPLE,
      holes: [
        [2.6, 2.8, 0.95],
        [10.4, 2.8, 0.95],
      ],
      top: (a) => {
        a.dot(2.6, 2.8, 2.5, GOLD);
        a.dot(10.4, 2.8, 2.5, GOLD);
      },
    }),
  );
  const l = P.led(0xffe2a0);
  g.add(l);
  g.userData.led = l;
  return g;
}

/* ------------------------------------------------------------------ */
/* Single-sided, etch-it-yourself serial board                         */
/* ------------------------------------------------------------------ */

export function diyBoard() {
  const W = 81;
  const H = 53;
  const { g, put, part } = kit(W, H);
  const DX = 54.5;
  const DY = 24;
  const pads: number[][] = [];
  const tracks: number[][][] = [];
  const fat: number[][][] = [];

  for (let i = 0; i < 14; i++) {
    const x = DX - 16.51 + i * 2.54;
    const ty = DY + 3.81;
    const by = DY - 3.81;
    tracks.push([
      [x, ty],
      [x, 32],
      [x - 5, 37],
      [x - 5, 49.5],
    ]);
    pads.push([x, ty], [x - 5, 49.5], [x, by]);
    if (i <= 4) {
      tracks.push([
        [x, by],
        [x, 14],
        [x - 5, 9],
        [x - 5, 3.5],
      ]);
      pads.push([x - 5, 3.5]);
    } else if (i >= 8) {
      tracks.push([
        [x, by],
        [x, 14],
        [x + 3.69, 10.31],
        [x + 3.69, 3.5],
      ]);
      pads.push([x + 3.69, 3.5]);
    } else if (i === 6) {
      tracks.push([
        [x, by],
        [x, 16.2],
      ]);
      pads.push([x, 16.2]);
    } else {
      tracks.push([
        [x, by],
        [x, 12],
      ]);
      pads.push([x, 12]);
    }
  }
  // serial port side
  for (let k = 0; k < 5; k++) pads.push([4.5, 30.7 + k * 2.77]);
  for (let k = 0; k < 4; k++) pads.push([7.3, 32.1 + k * 2.77]);
  tracks.push(
    [
      [7.3, 32.1],
      [13, 32.1],
      [17, 28.1],
      [25, 28.1],
    ],
    [
      [7.3, 37.64],
      [14, 37.64],
      [18.5, 42.14],
      [18.5, 46],
    ],
    [
      [4.5, 41.78],
      [4.5, 47],
      [7, 49.5],
      [25, 49.5],
    ],
    [
      [25, 28.1],
      [25, 36],
      [20, 41],
    ],
  );
  pads.push([25, 28.1], [18.5, 46], [25, 49.5], [20, 41], [25, 36]);
  fat.push(
    [
      [4, 4],
      [4, 19],
      [8, 23],
      [23, 23],
    ],
    [
      [10, 8],
      [26, 8],
      [29, 11],
      [29, 17],
    ],
  );
  pads.push([4, 4], [23, 23], [10, 8], [29, 17], [16, 8], [16, 13], [13.5, 13], [18.5, 13], [10, 13.5]);

  let etch = 0;
  const COPPER = '#c2672c';
  const SUB = '#d8c08c';
  const sm = (t: number) => {
    t = Math.min(1, Math.max(0, t));
    return t * t * (3 - 2 * t);
  };
  const pattern = (a: P.Art, color: string) => {
    tracks.forEach((t) => a.line(t, 1.05, color));
    fat.forEach((t) => a.line(t, 1.9, color));
    pads.forEach(([x, y]) => a.dot(x, y, 1.3, color));
  };
  const board = P.pcb({
    w: W,
    h: H,
    mask: SUB,
    round: 1.5,
    edge: P.M.beige,
    top: (a) => {
      pads.forEach(([x, y]) => a.dot(x, y, 0.42, '#3a2c18'));
      a.text('SINGLE-SIDED SERIAL · ETCH IT YOURSELF', 52, 37.6, 1.2, { color: '#7d6336', weight: 600 });
    },
    bottom: (a) => {
      a.c.globalAlpha = 1 - sm(etch / 0.8);
      a.base(COPPER);
      a.c.globalAlpha = 1;
      pattern(a, COPPER);
      const toner = 1 - sm((etch - 0.8) / 0.2);
      if (toner > 0.001) {
        a.c.globalAlpha = toner;
        pattern(a, '#1d2226');
        a.c.globalAlpha = 1;
      }
      pads.forEach(([x, y]) => a.dot(x, y, 0.42, '#4a3a22'));
    },
  });
  g.add(board);
  g.userData.setEtch = (e: number) => {
    if (Math.abs(e - etch) < 0.002) return;
    etch = e;
    board.userData.paintBottom();
  };

  // components, in the order you would solder them (lowest first)
  [
    [18.6, 32.1, 0],
    [18.6, 35.8, 0],
    [21.5, 24.4, 0],
    [33, 41, 90],
  ].forEach(([x, y, r], i) => put('a', P.resistor(i), x, y, r));
  put('a', P.disc(), 14.6, 15.6, 0);
  put('b', P.crystal(), DX - 1.27, 12);
  put('b', P.to92(), 18.5, 46);
  put('b', P.to92(), 24.4, 41.4);
  put('b', P.tact(6), 76.5, 27);
  put('c', P.dip(28, ['ATMEGA8-16PU'], true), DX, DY);
  put('d', P.led(0x3ddc55, true), 29.5, 44).userData.set(true);
  put('d', P.led(0xffd23a, true), 29.5, 39);
  put('d', P.elco(5, 11, true), 10, 10);
  put('d', P.elco(5, 11, true), 29, 20);
  put('d', P.to220(), 22, 10.5, 0);
  put('e', P.header(14), 33 + 6.5 * 2.54, 49.5);
  put('e', P.header(5), 33 + 2 * 2.54, 3.5);
  put('e', P.header(6), 62 + 2.5 * 2.54, 3.5);
  put('f', P.de9(), 6.2, 36.2);
  ['a', 'b', 'c', 'd', 'e', 'f'].forEach((k, i) => (part(k).userData.order = i));
  return g;
}
