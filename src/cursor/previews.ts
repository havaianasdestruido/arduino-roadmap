/**
 * Self-contained field-guide microcontroller medallion SVGs (as data URLs)
 * for Cuberto Mouse Follower's circular image mode (`data-cursor-img` / `setImg`).
 */

interface ChipSpec {
  name: string;
  color: string;
  flash: string;
  arch: string;
  clock: string;
  pkg: 'dip' | 'qfp' | 'lqfp';
  year: string;
}

const CHIP_SPECS: Record<string, ChipSpec> = {
  m8: {
    name: 'ATmega8',
    color: '#00979d',
    flash: '8 KB',
    arch: '8-BIT AVR',
    clock: '16 MHz',
    pkg: 'dip',
    year: '2005',
  },
  m168: {
    name: 'ATmega168',
    color: '#2f6fb0',
    flash: '16 KB',
    arch: '8-BIT AVR',
    clock: '16 MHz',
    pkg: 'dip',
    year: '2006',
  },
  m328: {
    name: 'ATmega328',
    color: '#6a56b8',
    flash: '32 KB',
    arch: '8-BIT AVR',
    clock: '16 MHz',
    pkg: 'dip',
    year: '2008',
  },
  m1280: {
    name: 'ATmega1280',
    color: '#d9a441',
    flash: '128 KB',
    arch: '8-BIT AVR',
    clock: '16 MHz',
    pkg: 'qfp',
    year: '2009',
  },
  m2560: {
    name: 'ATmega2560',
    color: '#e0702f',
    flash: '256 KB',
    arch: '8-BIT AVR',
    clock: '16 MHz',
    pkg: 'qfp',
    year: '2010',
  },
  m32u4: {
    name: 'ATmega32U4',
    color: '#c2417a',
    flash: '32 KB · USB',
    arch: '8-BIT AVR',
    clock: '16 MHz',
    pkg: 'qfp',
    year: '2012',
  },
  sam: {
    name: 'ATSAM3X8E',
    color: '#44596a',
    flash: '512 KB',
    arch: '32-BIT ARM',
    clock: '84 MHz',
    pkg: 'lqfp',
    year: '2012',
  },
};

function packageSvg(pkg: ChipSpec['pkg'], accent: string): string {
  if (pkg === 'dip') {
    const pins = Array.from({ length: 7 }, (_, i) => {
      const x = 69 + i * 10.3;
      return `<rect x="${x.toFixed(1)}" y="68" width="4.4" height="7" rx="1" fill="#c7d2d7"/><rect x="${x.toFixed(1)}" y="109" width="4.4" height="7" rx="1" fill="#c7d2d7"/>`;
    }).join('');
    return `${pins}<rect x="62" y="74" width="76" height="36" rx="3" fill="#1b2f3a" stroke="${accent}" stroke-width="2"/><path d="M62 87a5 5 0 0 1 0 10" fill="#13232c"/><circle cx="71" cy="102" r="2.2" fill="${accent}"/>`;
  }
  const n = pkg === 'lqfp' ? 8 : 6;
  const step = 34 / (n - 1);
  const pins = Array.from({ length: n }, (_, i) => {
    const o = (83 + i * step).toFixed(1);
    const yo = (75 + i * step).toFixed(1);
    return (
      `<rect x="${o}" y="63" width="2.5" height="6" fill="#c7d2d7"/>` +
      `<rect x="${o}" y="115" width="2.5" height="6" fill="#c7d2d7"/>` +
      `<rect x="71" y="${yo}" width="6" height="2.5" fill="#c7d2d7"/>` +
      `<rect x="123" y="${yo}" width="6" height="2.5" fill="#c7d2d7"/>`
    );
  }).join('');
  return `<g transform="rotate(${pkg === 'lqfp' ? 0 : 8} 100 92)">${pins}<rect x="76" y="68" width="48" height="48" rx="3" fill="#1b2f3a" stroke="${accent}" stroke-width="2"/><circle cx="84" cy="76" r="2.4" fill="${accent}"/></g>`;
}

function renderMedallion(spec: ChipSpec): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#13232c"/>
    <circle cx="100" cy="100" r="93" fill="none" stroke="${spec.color}" stroke-width="3" opacity="0.9"/>
    <circle cx="100" cy="100" r="85" fill="none" stroke="#f5f3ec" stroke-width="0.75" stroke-dasharray="2 4" opacity="0.28"/>
    <text x="100" y="44" text-anchor="middle" fill="${spec.color}" font-family="ui-monospace,Menlo,monospace" font-size="10.5" font-weight="600" letter-spacing="1.6">${spec.arch} · ${spec.year}</text>
    ${packageSvg(spec.pkg, spec.color)}
    <text x="100" y="143" text-anchor="middle" fill="#f5f3ec" font-family="system-ui,-apple-system,sans-serif" font-size="16" font-weight="700" letter-spacing="0.4">${spec.name}</text>
    <text x="100" y="162" text-anchor="middle" fill="#b7c6cc" font-family="ui-monospace,Menlo,monospace" font-size="11" letter-spacing="1">${spec.flash} · ${spec.clock}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

const cache: Record<string, string> = {};

/** Returns a data-URL SVG medallion for an Arduino processor family key (`m8`, `m168`, `m328`, `m1280`, `m2560`, `m32u4`, `sam`). */
export function getChipPreview(chipKey: string): string {
  if (!cache[chipKey]) {
    const spec = CHIP_SPECS[chipKey];
    cache[chipKey] = spec ? renderMedallion(spec) : '';
  }
  return cache[chipKey];
}
