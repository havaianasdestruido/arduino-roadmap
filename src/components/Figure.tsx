import { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Fig } from '../three/engine';
import type { View } from '../three/engine';
import type { Api, Params, Setup } from '../three/scenes';

/* ------------------------------------------------------------------ */
/* Scope + Term: words in the text that light up parts of the model    */
/* ------------------------------------------------------------------ */

interface ScopeValue {
  hl: string | null;
  setHl: (v: string | null) => void;
}
const ScopeCtx = createContext<ScopeValue | null>(null);

export function Scope({ children }: { children: ReactNode }) {
  const [hl, setHl] = useState<string | null>(null);
  const value = useMemo(() => ({ hl, setHl }), [hl]);
  return <ScopeCtx.Provider value={value}>{children}</ScopeCtx.Provider>;
}

export function Term({ part, children }: { part: string; children: ReactNode }) {
  const s = useContext(ScopeCtx);
  const on = s?.hl === part;
  return (
    <button
      type="button"
      className={'term' + (on ? ' is-on' : '')}
      aria-pressed={on}
      onPointerEnter={(e) => e.pointerType === 'mouse' && s?.setHl(part)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && s?.setHl(null)}
      onFocus={() => s?.setHl(part)}
      onBlur={() => s?.setHl(null)}
      onClick={(e) => {
        if ((e.nativeEvent as PointerEvent).pointerType === 'mouse') return;
        s?.setHl(on ? null : part);
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

export interface Control {
  key: string;
  label: string;
  initial: number;
  min?: number;
  max?: number;
  step?: number;
  color?: string;
  format?: (v: number) => string;
  /** Renders a segmented switch instead of a slider. */
  options?: string[];
}

function Slider({ c, value, onChange }: { c: Control; value: number; onChange: (v: number) => void }) {
  const min = c.min ?? 0;
  const max = c.max ?? 1;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="slider" style={{ '--c': c.color ?? 'var(--teal)' } as CSSProperties}>
      <span className="slider-head">
        <span className="slider-label">{c.label}</span>
        {c.format && <output className="slider-value">{c.format(value)}</output>}
      </span>
      <input
        className="range"
        type="range"
        min={min}
        max={max}
        step={c.step ?? 0.001}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--p': pct + '%' } as CSSProperties}
        aria-valuetext={c.format ? c.format(value) : undefined}
      />
    </label>
  );
}

function Segments({ c, value, onChange }: { c: Control; value: number; onChange: (v: number) => void }) {
  return (
    <div className="segments" role="group" aria-label={c.label}>
      {c.options!.map((o, i) => (
        <button key={o} type="button" className={i === value ? 'is-on' : ''} aria-pressed={i === value} onClick={() => onChange(i)}>
          {o}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Figure                                                              */
/* ------------------------------------------------------------------ */

export interface FigureHandle {
  set(p: Params): void;
}

interface Props {
  setup: Setup;
  label: string;
  view?: View;
  controls?: Control[];
  params?: Params;
  /** height / width of the stage */
  aspect?: number;
  /** fill the parent instead of using an aspect ratio */
  fill?: boolean;
  caption?: ReactNode;
  className?: string;
  children?: (values: Record<string, number>) => ReactNode;
  onValues?: (values: Record<string, number>) => void;
}

export const Figure = forwardRef<FigureHandle, Props>(function Figure(
  { setup, label, view, controls = [], params, aspect = 0.6, fill, caption, className, children, onValues },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const figRef = useRef<Fig | null>(null);
  const apiRef = useRef<Api | null>(null);
  const state = useRef<Params>({});
  const scope = useContext(ScopeCtx);
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(controls.map((c) => [c.key, c.initial])),
  );
  const [failed, setFailed] = useState(false);
  const [used, setUsed] = useState(false);

  const apply = (p: Params) => {
    Object.assign(state.current, p);
    if (apiRef.current && figRef.current) {
      apiRef.current.update(state.current);
      figRef.current.invalidate();
    }
  };
  useImperativeHandle(ref, () => ({ set: apply }));

  const hl = scope?.hl ?? null;
  const paramKey = JSON.stringify(params ?? {});
  useEffect(() => {
    apply({ ...(params ?? {}), ...values, hl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey, values, hl]);

  // Build the scene only when the figure is about to scroll into view.
  useEffect(() => {
    const canvas = canvasRef.current!;
    let fig: Fig | null = null;
    const io = new IntersectionObserver(
      (es) => {
        if (fig || !es.some((e) => e.isIntersecting)) return;
        io.disconnect();
        try {
          fig = new Fig(canvas, view);
          fig.onInteract = () => setUsed(true);
          figRef.current = fig;
          apiRef.current = setup(fig);
          apiRef.current.update(state.current);
          fig.invalidate();
        } catch (err) {
          console.error(err);
          setFailed(true);
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(canvas);
    return () => {
      io.disconnect();
      fig?.dispose();
      figRef.current = null;
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = (key: string, v: number) => {
    apply({ [key]: v });
    setValues((old) => {
      const next = { ...old, [key]: v };
      onValues?.(next);
      return next;
    });
  };

  return (
    <figure className={'fig' + (fill ? ' fig--fill' : '') + (className ? ' ' + className : '')}>
      <div className="fig-stage" style={fill ? undefined : ({ '--ar': String(1 / aspect) } as CSSProperties)}>
        <canvas
          ref={canvasRef}
          className="fig-canvas"
          tabIndex={0}
          role="img"
          aria-label={`${label}. Interactive 3D model: drag, or use the arrow keys, to rotate.`}
        />
        {!used && !failed && (
          <span className="fig-hint" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 12a8 3.2 0 1 0 16 0a8 3.2 0 1 0-16 0" />
              <path d="M9 14.6l3 1.6l-1 -3.2" />
            </svg>
            drag to rotate
          </span>
        )}
        {failed && <p className="fig-fail">This figure is a live 3D model and needs WebGL, which this browser has switched off.</p>}
      </div>
      {controls.length > 0 && (
        <div className="fig-controls">
          {controls.map((c) =>
            c.options ? (
              <Segments key={c.key} c={c} value={values[c.key]} onChange={(v) => change(c.key, v)} />
            ) : (
              <Slider key={c.key} c={c} value={values[c.key]} onChange={(v) => change(c.key, v)} />
            ),
          )}
        </div>
      )}
      {children?.(values)}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
});
