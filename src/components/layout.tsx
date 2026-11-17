import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { refreshTheme } from '../three/engine';
import { Scope } from './Figure';

/* ---------- tiny stores shared across the page ---------- */

function store<T>(initial: T) {
  let v = initial;
  const subs = new Set<() => void>();
  return {
    get: () => v,
    set: (n: T) => {
      if (n === v) return;
      v = n;
      subs.forEach((s) => s());
    },
    sub: (s: () => void) => {
      subs.add(s);
      return () => {
        subs.delete(s);
      };
    },
  };
}
export const yearStore = store(2005);
/** The delay() the reader chose in the Blink figure; the LED in the top bar follows it. */
export const blinkStore = store(1000);

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const THEME_KEY = 'arduino-theme';
type Theme = 'dark' | 'light';

function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#10181c' : '#f5f3ec');
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
  refreshTheme();
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3.2v2.1M12 18.7v2.1M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M3.2 12h2.1M18.7 12h2.1M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16.4 13.6A6.4 6.4 0 0 1 10.4 5.2 7 7 0 1 0 18.8 13.6a6.3 6.3 0 0 1-2.4 0Z" />
    </svg>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      data-cursor="-magnetic -gold"
      data-cursor-stick
      onClick={() => setTheme(next)}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

/* ---------- top bar: the infographic's year axis ---------- */

const YEARS = [2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013];

export function TopBar() {
  const year = useSyncExternalStore(yearStore.sub, yearStore.get);
  const blink = useSyncExternalStore(blinkStore.sub, blinkStore.get);
  const line = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) yearStore.set(Number((e.target as HTMLElement).dataset.year));
        }),
      { rootMargin: '-55% 0px -45% 0px' },
    );
    document.querySelectorAll<HTMLElement>('[data-year]').forEach((el) => io.observe(el));
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (line.current) line.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const jump = (y: number) => {
    const el = document.querySelector<HTMLElement>(`[data-year="${y}"]`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
    window.scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' });
  };

  return (
    <div className="bar">
      <a
        className="bar-brand"
        href="#top"
        aria-label="Evolution of Arduino — back to top"
        data-cursor="-magnetic -teal"
        data-cursor-stick
      >
        <span className="bar-led" style={{ animationDuration: `${blink * 2}ms` }} aria-hidden="true" />
        <span className="bar-name">Board Field Guide</span>
      </a>
      <div className="bar-end">
        <nav className="bar-years" aria-label="Jump to year">
          {YEARS.map((y) => (
            <button
              key={y}
              type="button"
              className={y === year ? 'is-on' : ''}
              aria-current={y === year ? 'true' : undefined}
              data-cursor={y === year ? '-magnetic -hot' : '-magnetic'}
              data-cursor-stick
              onClick={() => jump(y)}
            >
              <span className="yy-full">{y}</span>
              <span className="yy-short" aria-hidden="true">
                ’{String(y).slice(2)}
              </span>
            </button>
          ))}
        </nav>
        <ThemeToggle />
      </div>
      <span className="bar-line" ref={line} aria-hidden="true" />
    </div>
  );
}

/* ---------- chapters ---------- */

export function Chapter({
  id,
  n,
  years,
  year,
  title,
  children,
}: {
  id: string;
  n: string;
  years: string;
  year?: number;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="chapter" data-year={year}>
      <header className="prose chapter-head">
        <p className="eyebrow">
          <span className="eyebrow-n">{n}</span>
          <span>{years}</span>
        </p>
        <h2 data-cursor="-exclusion -md">{title}</h2>
      </header>
      {children}
    </section>
  );
}

export function Prose({ children, year }: { children: ReactNode; year?: number }) {
  return (
    <div className="prose" data-year={year}>
      {children}
    </div>
  );
}

/** A quotation lifted straight from the printed field guide. */
export function Note({ children, label = 'Field guide' }: { children: ReactNode; label?: string }) {
  return (
    <p className="note" data-cursor="-opaque -blue">
      <span className="note-label">{label}</span>
      {children}
    </p>
  );
}

/* ---------- sticky scroll scene ---------- */

export interface Step {
  year?: number;
  kicker?: string;
  title: string;
  body: ReactNode;
}

export function ScrollScene({ steps, stage }: { steps: Step[]; stage: (active: number) => ReactNode }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        }),
      { rootMargin: desktop ? '-50% 0px -50% 0px' : '-74% 0px -26% 0px' },
    );
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, [steps.length]);

  return (
    <Scope>
      <div className="scrolly">
        <div className="scrolly-stage">{stage(active)}</div>
        <ol className="scrolly-steps">
          {steps.map((s, i) => (
            <li
              key={s.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-i={i}
              data-year={s.year}
              className={'step' + (i === active ? ' is-active' : '')}
            >
              <div className="step-card">
                <p className="step-kicker">
                  <span>
                    {String(i + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
                  </span>
                  {s.kicker && <span>{s.kicker}</span>}
                </p>
                <h3>{s.title}</h3>
                <div className="step-body">{s.body}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Scope>
  );
}

/* ---------- small data read-out under a figure ---------- */

export function Readout({ items, style }: { items: [string, ReactNode][]; style?: CSSProperties }) {
  return (
    <dl className="readout" style={style}>
      {items.map(([k, v]) => (
        <div key={k} data-cursor="-opaque">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
