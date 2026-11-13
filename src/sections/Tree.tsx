import { useMemo, useState } from 'react';
import { Chapter, Prose } from '../components/layout';

const CHIPS: Record<string, [string, string]> = {
  m8: ['ATmega8', '#00979d'],
  m168: ['ATmega168', '#2f6fb0'],
  m328: ['ATmega328', '#6a56b8'],
  m1280: ['ATmega1280', '#d9a441'],
  m2560: ['ATmega2560', '#e0702f'],
  m32u4: ['ATmega32U4', '#c2417a'],
  sam: ['ATSAM3X8E', '#44596a'],
};

interface Node {
  id: string;
  label: string;
  yr: number;
  lane: number;
  chip: string;
  note: string;
  quoted?: boolean;
}

const LANES = ['Etch it yourself', 'Classic', 'Wireless', 'Mini & Pro', 'Nano', 'LilyPad', 'Mega'];

const q = true;
const NODES: Node[] = [
  { id: 'serial', label: 'Serial', yr: 2005, lane: 0, chip: 'm8', note: 'Old-style RS-232 serial port rather than USB.', quoted: q },
  { id: 'sss', label: 'Single-Sided Serial', yr: 2005.8, lane: 0, chip: 'm8', note: 'Designed to be built on a home-etched PCB.', quoted: q },
  { id: 'severino', label: 'Severino (S3V3)', yr: 2008, lane: 0, chip: 'm8', note: 'Most advanced etch-it-yourself PCB design.', quoted: q },
  { id: 'usb', label: 'USB', yr: 2005.3, lane: 1, chip: 'm8', note: 'First board to bear the Arduino name.', quoted: q },
  { id: 'extreme', label: 'Extreme', yr: 2005.95, lane: 1, chip: 'm8', note: 'Adds female pin headers, data transfer LEDs.', quoted: q },
  { id: 'ng', label: 'NG', yr: 2006.5, lane: 1, chip: 'm8', note: 'Nuova Generazione: a simpler USB chip and an LED on pin 13.' },
  { id: 'ngplus', label: 'NG+', yr: 2006.95, lane: 1, chip: 'm168', note: 'First to ship with ATmega168.', quoted: q },
  { id: 'diecimila', label: 'Diecimila', yr: 2007.5, lane: 1, chip: 'm168', note: 'Named for the ten-thousandth board. The computer can now reset it before an upload.' },
  { id: 'duemilanove', label: 'Duemilanove', yr: 2008.25, lane: 1, chip: 'm168', note: 'Auto-selects power supply.', quoted: q },
  { id: 'duemilanove328', label: 'Duemilanove', yr: 2009.05, lane: 1, chip: 'm328', note: 'First to ship with ATmega328.', quoted: q },
  { id: 'uno', label: 'Uno', yr: 2010.3, lane: 1, chip: 'm328', note: 'Official reference model for Arduino platform.', quoted: q },
  { id: 'ethernet', label: 'Ethernet', yr: 2011.3, lane: 1, chip: 'm328', note: 'An Uno with a network socket in place of the USB port.' },
  { id: 'leonardo', label: 'Leonardo', yr: 2012.1, lane: 1, chip: 'm32u4', note: 'Emulates mouse and keyboard over USB.', quoted: q },
  { id: 'bt', label: 'Bluetooth', yr: 2007.3, lane: 2, chip: 'm168', note: 'Replaces the USB cable with a Bluetooth radio.' },
  { id: 'fio', label: 'Fio', yr: 2010, lane: 2, chip: 'm328', note: 'Designed for battery-powered wireless projects.', quoted: q },
  { id: 'bt328', label: 'Bluetooth', yr: 2011, lane: 2, chip: 'm328', note: 'The Bluetooth board, moved up to the ATmega328.' },
  { id: 'yun', label: 'Yún', yr: 2013, lane: 2, chip: 'm32u4', note: 'First dual-core model, combining ATmega32u4 with MIPS embedded Linux machine.', quoted: q },
  { id: 'mini', label: 'Mini', yr: 2006.3, lane: 3, chip: 'm168', note: 'First board to use surface-mount processor.', quoted: q },
  { id: 'pro', label: 'Pro', yr: 2008.4, lane: 3, chip: 'm328', note: 'Designed for semipermanent installation.', quoted: q },
  { id: 'promini', label: 'Pro Mini', yr: 2009.05, lane: 3, chip: 'm328', note: 'Mini form-factor compatible.', quoted: q },
  { id: 'micro', label: 'Micro', yr: 2012.6, lane: 3, chip: 'm32u4', note: 'A Leonardo cut down to breadboard width.' },
  { id: 'nano', label: 'Nano', yr: 2008, lane: 4, chip: 'm168', note: 'Underside pins for breadboard connection.', quoted: q },
  { id: 'nano328', label: 'Nano', yr: 2009.3, lane: 4, chip: 'm328', note: 'The same board with twice the memory.' },
  { id: 'lilypad', label: 'LilyPad', yr: 2007.4, lane: 5, chip: 'm168', note: 'Sew-through contact pads for connecting conductive thread.', quoted: q },
  { id: 'lilypad328', label: 'LilyPad', yr: 2009.3, lane: 5, chip: 'm328', note: 'The round board, moved up to the ATmega328.' },
  { id: 'simple', label: 'LilyPad Simple', yr: 2010.6, lane: 5, chip: 'm328', note: 'Fewer, larger petals and a socket for a battery.' },
  { id: 'snap', label: 'Simple Snap', yr: 2011.5, lane: 5, chip: 'm328', note: 'Replaces sew-through contacts with button snaps.', quoted: q },
  { id: 'lilyusb', label: 'LilyPad USB', yr: 2012.4, lane: 5, chip: 'm32u4', note: 'Integrates USB controller into processor chip.', quoted: q },
  { id: 'mega', label: 'Mega', yr: 2009.2, lane: 6, chip: 'm1280', note: 'Quadruples on-chip memory to 128KB and more than triples the number of pins.' },
  { id: 'mega2560', label: 'Mega 2560', yr: 2010.5, lane: 6, chip: 'm2560', note: 'Memory doubled again to 256KB, still pin-compatible with the standard shield footprint.' },
  { id: 'adk', label: 'Mega ADK', yr: 2011.5, lane: 6, chip: 'm2560', note: 'Mega update for use with Android Accessory Development Kit (ADK).', quoted: q },
  { id: 'due', label: 'Due', yr: 2012.7, lane: 6, chip: 'sam', note: 'First Arduino to mount 32-bit processor. Runs at 3.3V rather than 5V.', quoted: q },
];

const EDGES: [string, string][] = [
  ['serial', 'sss'],
  ['sss', 'severino'],
  ['serial', 'usb'],
  ['usb', 'extreme'],
  ['extreme', 'ng'],
  ['ng', 'ngplus'],
  ['ngplus', 'diecimila'],
  ['diecimila', 'duemilanove'],
  ['duemilanove', 'duemilanove328'],
  ['duemilanove328', 'uno'],
  ['uno', 'ethernet'],
  ['uno', 'leonardo'],
  ['leonardo', 'micro'],
  ['leonardo', 'yun'],
  ['bt', 'bt328'],
  ['mini', 'promini'],
  ['pro', 'promini'],
  ['nano', 'nano328'],
  ['lilypad', 'lilypad328'],
  ['lilypad328', 'simple'],
  ['simple', 'snap'],
  ['simple', 'lilyusb'],
  ['mega', 'mega2560'],
  ['mega2560', 'adk'],
  ['adk', 'due'],
];

const X = (yr: number) => 158 + (yr - 2005) * 97;
const Y = (lane: number) => 92 + lane * 62;
const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

function family(id: string) {
  const set = new Set([id]);
  const walk = (cur: string, dir: 0 | 1) =>
    EDGES.forEach((e) => {
      if (e[dir] === cur && !set.has(e[1 - dir])) {
        set.add(e[1 - dir]);
        walk(e[1 - dir], dir);
      }
    });
  walk(id, 0);
  walk(id, 1);
  return set;
}

export function Tree() {
  const [sel, setSel] = useState('uno');
  const fam = useMemo(() => family(sel), [sel]);
  const node = byId[sel];
  const chip = CHIPS[node.chip];

  return (
    <Chapter id="family" n="11" years="2005 → 2013" year={2013} title="The whole family">
      <Prose>
        <p>
          {NODES.length} boards, seven processors, nine years. Each square below is a board, coloured by the chip it
          carries; each arrow says <em>this one led to that one</em>. Pick any board to trace its line.
        </p>
      </Prose>
      <div className="tree">
        <p className="tree-hint">Swipe sideways to see every year →</p>
        <div className="tree-scroll" tabIndex={0} role="group" aria-label="Arduino family tree, scrollable">
          <svg viewBox="0 0 1000 510" role="img" aria-label="Family tree of Arduino boards from 2005 to 2013">
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto">
                <path d="M0 0L10 5L0 10z" fill="#1f5c94" />
              </marker>
            </defs>
            {Array.from({ length: 9 }, (_, i) => 2005 + i).map((y) => (
              <g key={y}>
                <line x1={X(y)} y1="40" x2={X(y)} y2="496" stroke="#d6d2c3" strokeDasharray="2 5" />
                <text x={X(y)} y="26" textAnchor="middle" fontFamily="var(--mono)" fontSize="15" fill="#43535c">
                  {y}
                </text>
              </g>
            ))}
            {LANES.map((l, i) => (
              <text key={l} x="10" y={Y(i) + 3.5} fontFamily="var(--mono)" fontSize="9.5" letterSpacing="1.2" fill="#74828a">
                {l.toUpperCase()}
              </text>
            ))}
            {EDGES.map(([a, b]) => {
              const A = byId[a];
              const B = byId[b];
              const x1 = X(A.yr) + 9;
              const x2 = X(B.yr) - 11;
              const y1 = Y(A.lane);
              const y2 = Y(B.lane);
              const mx = (x1 + x2) / 2;
              const on = fam.has(a) && fam.has(b);
              return (
                <path
                  key={a + b}
                  d={`M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`}
                  fill="none"
                  stroke="#1f5c94"
                  strokeWidth={on ? 2.6 : 1.6}
                  opacity={on ? 1 : 0.22}
                  markerEnd="url(#arr)"
                />
              );
            })}
            {NODES.map((n, i) => {
              const on = fam.has(n.id);
              const below = i % 2 === 1;
              return (
                <g
                  key={n.id}
                  className={'tree-node' + (on ? '' : ' is-dim') + (n.id === sel ? ' is-sel' : '')}
                  transform={`translate(${X(n.yr)} ${Y(n.lane)})`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={n.id === sel}
                  aria-label={`${n.label}, ${Math.floor(n.yr)}, ${CHIPS[n.chip][0]}`}
                  onClick={() => setSel(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSel(n.id);
                    }
                  }}
                >
                  <rect x="-22" y="-22" width="44" height="44" fill="transparent" stroke="none" style={{ transform: 'none' }} />
                  {n.id === sel && <rect x="-11" y="-11" width="22" height="22" rx="4" fill="none" stroke="#13232c" strokeWidth="1.8" style={{ transform: 'none' }} />}
                  <rect x="-7" y="-7" width="14" height="14" rx="2.5" fill={CHIPS[n.chip][1]} />
                  <text y={below ? 24 : -15} textAnchor="middle">
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="tree-card" aria-live="polite">
          <p className="meta">
            {Math.floor(node.yr)} · <span className="swatch" style={{ background: chip[1] }} />
            {chip[0]}
          </p>
          <h3>{node.label}</h3>
          <p>{node.quoted ? <span style={{ color: 'var(--blue)' }}>“{node.note}”</span> : node.note}</p>
        </div>
        <ul className="legend" aria-label="Processor colours">
          {Object.values(CHIPS).map(([name, color]) => (
            <li key={name}>
              <span className="swatch" style={{ background: color }} />
              {name}
            </li>
          ))}
        </ul>
      </div>
    </Chapter>
  );
}
