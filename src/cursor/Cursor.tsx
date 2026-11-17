import { useEffect, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import './cursor.css';
import { CircleCursor } from './mouseFollower';
import type { CursorOptions } from './mouseFollower';
import { CursorSprites } from './sprites';
import type { CursorIconName } from './sprites';

/* ---------- JSX data-cursor-* attribute typing ---------- */

export interface CursorDataAttributes {
  /** Space-separated cursor state classes (e.g. `"-inverse"`, `"-exclusion -lg"`, `"-hidden"`). */
  'data-cursor'?: string;
  /** Shows the cursor on hover when initialized with `visible: false`. */
  'data-cursor-show'?: boolean | '';
  /** Displays text inside the expanded circle cursor. */
  'data-cursor-text'?: string;
  /** Displays an SVG sprite icon inside the expanded circle cursor. */
  'data-cursor-icon'?: CursorIconName | (string & {});
  /** Displays an SVG/image URL icon inside the expanded circle cursor. */
  'data-cursor-icon-img'?: string;
  /** Displays an image inside the circular media cursor. */
  'data-cursor-img'?: string;
  /** Plays a muted looping inline video inside the circular media cursor. */
  'data-cursor-video'?: string;
  /** Magnetically sticks the cursor to this element or the given CSS selector. */
  'data-cursor-stick'?: boolean | string;
  /** Sets the velocity skew factor while hovering this element. */
  'data-cursor-skew'?: number | string;
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface HTMLAttributes<T> extends CursorDataAttributes {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface SVGAttributes<T> extends CursorDataAttributes {}
}

/* ---------- shared live cursor instance store ---------- */

let currentCursor: CircleCursor | null = null;
const listeners = new Set<() => void>();

function setCurrentCursor(next: CircleCursor | null) {
  if (currentCursor === next) return;
  currentCursor = next;
  listeners.forEach((fn) => fn());
}

function subscribeCursor(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Returns the active `CircleCursor` instance (or `null` on touch-only devices / before mount). */
export function getCursor(): CircleCursor | null {
  return currentCursor;
}

/** React hook that subscribes to the active Cuberto `CircleCursor` instance. */
export function useCursor(): CircleCursor | null {
  return useSyncExternalStore(subscribeCursor, getCursor, () => null);
}

/**
 * Mounts Cuberto Mouse Follower (plus its inline SVG icon sprite) whenever a
 * fine hover-capable pointer is available, and tears it down cleanly on unmount
 * or when switching to a touch-only environment.
 */
export function CursorProvider({
  options,
  children,
}: {
  options?: CursorOptions;
  children?: ReactNode;
}) {
  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let instance: CircleCursor | null = null;

    const mount = () => {
      if (instance || !finePointer.matches) return;
      instance = new CircleCursor(options);
      setCurrentCursor(instance);
    };

    const unmount = () => {
      if (!instance) return;
      instance.destroy();
      instance = null;
      setCurrentCursor(null);
    };

    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) mount();
      else unmount();
    };

    mount();
    finePointer.addEventListener('change', onChange);

    return () => {
      finePointer.removeEventListener('change', onChange);
      unmount();
    };
  }, [options]);

  return (
    <>
      <CursorSprites />
      {children}
    </>
  );
}
