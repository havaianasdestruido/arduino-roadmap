/**
 * Inline SVG symbol spritesheet for Cuberto Mouse Follower icon mode.
 *
 * Works with `iconSvgSrc: ''` (`<use href="#icon-name">`) so icons render
 * with zero network requests, inherit `currentColor`, and inline cleanly
 * inside single-file and subpath GitHub Pages builds.
 */

export type CursorIconName =
  | 'orbit'
  | 'grab'
  | 'slide'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'pin'
  | 'chip'
  | 'code'
  | 'spark'
  | 'eye'
  | 'branch';

export function CursorSprites() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{
        position: 'fixed',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <symbol id="orbit" viewBox="0 0 24 24">
          <ellipse cx="12" cy="12" rx="8.5" ry="3.8" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M9.2 15l3 1.5-.9-3.2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" />
        </symbol>

        <symbol id="grab" viewBox="0 0 24 24">
          <path
            d="M12 4v16M4 12h16M9.5 6.5L12 4l2.5 2.5M9.5 17.5L12 20l2.5-2.5M6.5 9.5L4 12l2.5 2.5M17.5 9.5L20 12l-2.5 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="slide" viewBox="0 0 24 24">
          <path
            d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="arrow-up" viewBox="0 0 24 24">
          <path
            d="M12 19V5M6 11l6-6 6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="arrow-down" viewBox="0 0 24 24">
          <path
            d="M12 5v14M6 13l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="arrow-left" viewBox="0 0 24 24">
          <path
            d="M19 12H5M11 6l-6 6 6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="arrow-right" viewBox="0 0 24 24">
          <path
            d="M5 12h14M13 6l6 6-6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="arrow-up-right" viewBox="0 0 24 24">
          <path
            d="M7 17L17 7M9 7h8v8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="pin" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </symbol>

        <symbol id="chip" viewBox="0 0 24 24">
          <rect x="6.5" y="6.5" width="11" height="11" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="9.2" cy="9.2" r="1" fill="currentColor" />
          <path
            d="M9 3.5v3M12 3.5v3M15 3.5v3M9 17.5v3M12 17.5v3M15 17.5v3M3.5 9h3M3.5 12h3M3.5 15h3M17.5 9h3M17.5 12h3M17.5 15h3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </symbol>

        <symbol id="code" viewBox="0 0 24 24">
          <path
            d="M8.5 8L4.5 12l4 4M15.5 8l4 4-4 4M13.5 6.5l-3 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="spark" viewBox="0 0 24 24">
          <path
            d="M13 3L5.5 13.5H12L11 21l7.5-10.5H12L13 3z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="eye" viewBox="0 0 24 24">
          <path
            d="M3 12s3.5-5.5 9-5.5S21 12 21 12s-3.5 5.5-9 5.5S3 12 3 12z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
        </symbol>

        <symbol id="branch" viewBox="0 0 24 24">
          <circle cx="7" cy="6" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="7" cy="18" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="17" cy="12" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M9.2 6C13 6 12.5 12 14.8 12M9.2 18C13 18 12.5 12 14.8 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </symbol>
      </defs>
    </svg>
  );
}
