import { gsap } from 'gsap';
import MouseFollower from 'mouse-follower';
import type { CursorIconName } from './sprites';

// Register GSAP v3 once for all MouseFollower instances.
MouseFollower.registerGSAP(gsap);

export type CursorEvent = 'show' | 'hide' | 'addState' | 'removeState' | 'render' | 'destroy';

export type CursorEventHandler = (cursor: CircleCursor, ...args: unknown[]) => void;

export type CursorState =
  | '-pointer'
  | '-active'
  | '-hidden'
  | '-text'
  | '-icon'
  | '-media'
  | '-media-sm'
  | '-media-lg'
  | '-media-float'
  | '-inverse'
  | '-exclusion'
  | '-opaque'
  | '-solid'
  | '-ring'
  | '-magnetic'
  | '-dragging'
  | '-sm'
  | '-md'
  | '-lg'
  | '-xl'
  | '-teal'
  | '-cyan'
  | '-blue'
  | '-gold'
  | '-hot'
  | '-copper'
  | '-purple'
  | (string & {});

export interface CursorOptions {
  el?: string | HTMLElement | null;
  container?: string | HTMLElement | null;
  eventsTarget?: string | HTMLElement | null;
  className?: string;
  innerClassName?: string;
  textClassName?: string;
  mediaClassName?: string;
  mediaBoxClassName?: string;
  iconSvgClassName?: string;
  iconSvgNamePrefix?: string;
  iconSvgSrc?: string;
  iconImgClassName?: string;
  dataAttr?: string | null | false;
  hiddenState?: string;
  textState?: string;
  iconState?: string;
  activeState?: string | null | false;
  mediaState?: string;
  stateDetection?: Record<string, string> | false | null;
  visible?: boolean;
  visibleOnState?: boolean;
  speed?: number;
  ease?: string;
  overwrite?: boolean;
  skewing?: number;
  skewingText?: number;
  skewingIcon?: number;
  skewingMedia?: number;
  skewingDelta?: number;
  skewingDeltaMax?: number;
  stickDelta?: number;
  showTimeout?: number;
  hideOnLeave?: boolean;
  hideTimeout?: number;
  hideMediaTimeout?: number;
  initialPos?: [number, number];
}

export interface DatasetCursorParams {
  state?: string;
  show?: string;
  text?: string;
  icon?: string;
  iconImg?: string;
  img?: string;
  video?: string;
  stick?: string;
  skew?: string;
}

/** Default state detection rules tailored to interactive HTML & SVG elements. */
export const DEFAULT_STATE_DETECTION: Record<string, string> = {
  '-pointer': 'a, button, summary, select, [role="button"]',
  '-hidden': 'iframe',
};

/** Default options for the field guide's circle cursor. */
export const DEFAULT_CURSOR_OPTIONS: CursorOptions = {
  className: 'mf-cursor',
  innerClassName: 'mf-cursor-inner',
  textClassName: 'mf-cursor-text',
  mediaClassName: 'mf-cursor-media',
  mediaBoxClassName: 'mf-cursor-media-box',
  iconSvgClassName: 'mf-svgsprite',
  iconSvgNamePrefix: '-',
  iconSvgSrc: '',
  iconImgClassName: 'mf-cursor-icon',
  dataAttr: 'cursor',
  hiddenState: '-hidden',
  textState: '-text',
  iconState: '-icon',
  activeState: '-active',
  mediaState: '-media',
  stateDetection: DEFAULT_STATE_DETECTION,
  visible: true,
  visibleOnState: false,
  speed: 0.52,
  ease: 'expo.out',
  overwrite: true,
  skewing: 0.8,
  skewingText: 2,
  skewingIcon: 2,
  skewingMedia: 1.6,
  skewingDelta: 0.001,
  skewingDeltaMax: 0.15,
  stickDelta: 0.18,
  showTimeout: 20,
  hideOnLeave: true,
  hideTimeout: 300,
  hideMediaTimeout: 300,
};

function splitStates(state: string): string[] {
  return state
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Resolves `data-cursor-stick` for both HTML (`""`) and React boolean JSX (`"true"`), plus CSS selectors. */
function resolveStickTarget(stick: string | undefined, owner: Element): string | Element | null {
  if (stick === undefined || stick === 'false') return null;
  if (stick === '' || stick === 'true') return owner;
  return stick;
}

/**
 * Full-featured Cuberto `MouseFollower` subclass with production safeguards:
 *
 * - Fixes upstream pure horizontal / vertical velocity freeze (`vel.x === 0 || vel.y === 0`).
 * - Smoothly resets squash/stretch transform when velocity settles so the circle is crisp at rest.
 * - Supports both HTML and SVG targets (e.g. family-tree `<g>` nodes) and nested `data-cursor-*` zones.
 * - Keeps magnetic `setStick` / `data-cursor-stick` accurate on both fixed AND scrolling elements.
 * - Syncs hover states when scrolling past interactive stages without moving the pointer.
 * - Supports `data-cursor-skew` in addition to all standard Cuberto `data-cursor-*` attributes.
 * - Plays cursor videos inline with safe promise rejection handling.
 * - Hides automatically on touch interaction on hybrid devices and respects `prefers-reduced-motion`.
 * - Marks cursor DOM `aria-hidden="true"` and cleans up all timers & listeners on `destroy()`.
 */
export class CircleCursor extends MouseFollower {
  private stickEl: Element | null = null;
  private pointer = { x: -9999, y: -9999, inside: false, touch: false };
  private hoveredEl: Element | null = null;
  private appliedParams = new WeakMap<Element, DatasetCursorParams>();
  private attrObserver: MutationObserver | null = null;
  private attrObserverFilter: string[] = [];
  private wasSkewed = false;
  private reducedMotion = false;
  private baseSpeed: number;
  private baseSkewing: number;
  private scrollRaf = 0;
  private destroyed = false;
  private cleanupExtra: (() => void)[] = [];

  constructor(options: CursorOptions = {}) {
    const merged: CursorOptions = {
      ...DEFAULT_CURSOR_OPTIONS,
      ...options,
    };
    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const baseSpeed = merged.speed ?? 0.52;
    const baseSkewing = merged.skewing ?? 0;

    if (reduced) {
      merged.speed = Math.min(baseSpeed, 0.12);
      merged.skewing = 0;
    }

    // Cast options to match upstream microbundle declaration shape.
    super(merged as ConstructorParameters<typeof MouseFollower>[0]);

    this.baseSpeed = baseSpeed;
    this.baseSkewing = baseSkewing;
    this.reducedMotion = reduced;

    if (this.el) {
      this.el.setAttribute('aria-hidden', 'true');
      this.el.setAttribute('role', 'presentation');
    }

    this.bindExtra();
  }

  override bind(): void {
    const ev = this.event as Record<string, EventListener>;
    const target = this.eventsTarget;
    const opts = this.options as Required<CursorOptions>;

    ev.mouseleave = () => {
      this.pointer.inside = false;
      this.clearInteractiveTarget(this.hoveredEl, null);
      this.hoveredEl = null;
      this.hide();
    };

    ev.mouseenter = (raw: Event) => {
      if (this.pointer.touch) return;
      const e = raw as MouseEvent;
      this.pointer.inside = true;
      if (!this.visible && Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
        this.pointer.x = e.clientX;
        this.pointer.y = e.clientY;
        this.pos.x = e.clientX;
        this.pos.y = e.clientY;
      }
      this.show();
    };

    ev.mousedown = () => {
      if (this.pointer.touch || !opts.activeState) return;
      this.addState(opts.activeState);
    };

    ev.mouseup = () => {
      if (!opts.activeState) return;
      this.removeState(opts.activeState);
    };

    ev.mousemoveOnce = () => {
      if (this.pointer.touch) return;
      this.pointer.inside = true;
      this.show();
    };

    ev.mousemove = (raw: Event) => {
      const e = raw as MouseEvent;
      if (this.pointer.touch) return;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.inside = true;
      this.tweenToPointer();
    };

    ev.mouseover = (raw: Event) => {
      if (this.pointer.touch) return;
      const e = raw as MouseEvent;
      const to = e.target instanceof Element ? e.target : null;
      const from = e.relatedTarget instanceof Element ? e.relatedTarget : null;
      this.hoveredEl = to;
      this.applyEnterChain(to, from);
      this.watchHoveredChain(to);
    };

    ev.mouseout = (raw: Event) => {
      const e = raw as MouseEvent;
      const from = e.target instanceof Element ? e.target : null;
      const to = e.relatedTarget instanceof Element ? e.relatedTarget : null;
      this.clearInteractiveTarget(from, to);
      if (to) {
        this.hoveredEl = to;
        this.restoreAncestorContext(to);
        this.watchHoveredChain(to);
      } else {
        this.hoveredEl = null;
        this.watchHoveredChain(null);
      }
    };

    if (opts.hideOnLeave) {
      target.addEventListener('mouseleave', ev.mouseleave, { passive: true });
    }
    if (opts.visible) {
      target.addEventListener('mouseenter', ev.mouseenter, { passive: true });
    }
    if (opts.activeState) {
      target.addEventListener('mousedown', ev.mousedown, { passive: true });
      target.addEventListener('mouseup', ev.mouseup, { passive: true });
    }
    target.addEventListener('mousemove', ev.mousemove, { passive: true });
    if (opts.visible) {
      target.addEventListener('mousemove', ev.mousemoveOnce, { passive: true, once: true });
    }
    if (opts.stateDetection || opts.dataAttr) {
      target.addEventListener('mouseover', ev.mouseover, { passive: true });
      target.addEventListener('mouseout', ev.mouseout, { passive: true });
    }
  }

  private bindExtra(): void {
    const opts = this.options as Required<CursorOptions>;

    // Prevent stuck `-active` when releasing outside the viewport, dragging, or switching tabs.
    const clearActive = () => {
      if (this.destroyed || !opts.activeState) return;
      this.removeState(opts.activeState);
    };

    // Hybrid touch + mouse laptops: hide while tapping, wake seamlessly on real mouse move.
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        this.pointer.touch = true;
        this.clearInteractiveTarget(this.hoveredEl, null);
        this.hoveredEl = null;
        this.hide();
      } else if (this.pointer.touch && e.pointerType === 'mouse') {
        this.pointer.touch = false;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && this.pointer.touch) {
        this.pointer.touch = false;
        this.pointer.x = e.clientX;
        this.pointer.y = e.clientY;
        this.pointer.inside = true;
        this.pos.x = e.clientX;
        this.pos.y = e.clientY;
        this.render(true);
        if (opts.visible) this.show();
      }
    };

    // Keep magnetic stick & hover states accurate as the page scrolls or resizes.
    const syncOnViewportChange = () => {
      if (this.scrollRaf || this.destroyed || !this.pointer.inside || this.pointer.touch) return;
      this.scrollRaf = requestAnimationFrame(() => {
        this.scrollRaf = 0;
        if (this.destroyed || !this.pointer.inside || this.pointer.touch) return;

        if (this.stickEl) {
          if (!this.stickEl.isConnected) {
            this.removeStick();
            this.tweenToPointer();
          } else {
            const rect = this.stickEl.getBoundingClientRect();
            const pad = 6;
            const over =
              this.pointer.x >= rect.left - pad &&
              this.pointer.x <= rect.right + pad &&
              this.pointer.y >= rect.top - pad &&
              this.pointer.y <= rect.bottom + pad;
            if (over) {
              this.stick = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              };
              this.tweenToPointer();
            } else {
              this.removeStick();
              this.tweenToPointer();
            }
          }
        }

        // Ignore scroll re-targeting while a pointer button is held (e.g. dragging a 3D model or slider).
        if (this.el?.classList.contains(opts.activeState || '-active')) return;

        if (opts.stateDetection || opts.dataAttr) {
          const under = document.elementFromPoint(this.pointer.x, this.pointer.y);
          if (under !== this.hoveredEl) {
            const prev = this.hoveredEl;
            this.hoveredEl = under;
            this.clearInteractiveTarget(prev, under);
            if (under) {
              this.restoreAncestorContext(under);
              this.applyEnterChain(under, prev);
            }
            this.watchHoveredChain(under);
          }
        }
      });
    };

    // React dynamically to OS reduced-motion preference changes.
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = (e: MediaQueryListEvent) => {
      this.reducedMotion = e.matches;
      this.options.speed = e.matches ? Math.min(this.baseSpeed, 0.12) : this.baseSpeed;
      this.options.skewing = e.matches ? 0 : this.baseSkewing;
      if (e.matches) {
        this.skewing = 0;
        this.resetSkewTransform();
      } else {
        this.skewing = this.baseSkewing;
      }
    };

    window.addEventListener('blur', clearActive, { passive: true });
    window.addEventListener('mouseup', clearActive, { passive: true });
    window.addEventListener('pointercancel', clearActive, { passive: true });
    window.addEventListener('dragend', clearActive, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', syncOnViewportChange, { passive: true, capture: true });
    window.addEventListener('resize', syncOnViewportChange, { passive: true });
    mq.addEventListener('change', onMotionChange);

    // Keep cursor in sync when React mutates `data-cursor-*` on a currently hovered element.
    if (opts.dataAttr && typeof MutationObserver !== 'undefined') {
      const kebab = opts.dataAttr.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
      const base = `data-${kebab}`;
      const filter = [
        base,
        `${base}-show`,
        `${base}-text`,
        `${base}-icon`,
        `${base}-icon-img`,
        `${base}-img`,
        `${base}-video`,
        `${base}-stick`,
        `${base}-skew`,
      ];
      this.attrObserver = new MutationObserver((records) => {
        if (this.destroyed || !this.hoveredEl || this.pointer.touch) return;
        let touched = false;
        for (const r of records) {
          const el = r.target;
          if (!(el instanceof Element)) continue;
          const prev = this.appliedParams.get(el);
          if (prev) {
            this.removeDatasetParams(el, prev);
            this.appliedParams.delete(el);
          }
          const next = this.getFromDataset(el as HTMLElement);
          this.appliedParams.set(el, next);
          touched = true;
        }
        if (touched && this.hoveredEl) {
          this.restoreAncestorContext(this.hoveredEl);
        }
      });
      this.attrObserverFilter = filter;
    }

    this.cleanupExtra.push(() => {
      cancelAnimationFrame(this.scrollRaf);
      this.attrObserver?.disconnect();
      this.attrObserver = null;
      window.removeEventListener('blur', clearActive);
      window.removeEventListener('mouseup', clearActive);
      window.removeEventListener('pointercancel', clearActive);
      window.removeEventListener('dragend', clearActive);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', syncOnViewportChange, true);
      window.removeEventListener('resize', syncOnViewportChange);
      mq.removeEventListener('change', onMotionChange);
    });
  }

  private tweenToPointer(): void {
    const { x: cx, y: cy } = this.pointer;
    const stick = typeof this.stick === 'object' && this.stick ? this.stick : null;
    const stickDelta = this.options.stickDelta ?? 0.15;
    const tx = stick ? stick.x - (stick.x - cx) * stickDelta : cx;
    const ty = stick ? stick.y - (stick.y - cy) * stickDelta : cy;

    this.gsap.to(this.pos, {
      x: tx,
      y: ty,
      overwrite: this.options.overwrite,
      ease: this.options.ease,
      duration: this.visible ? this.options.speed : 0,
      onUpdate: () => {
        this.vel = { x: tx - this.pos.x, y: ty - this.pos.y };
      },
      onComplete: () => {
        this.vel = { x: 0, y: 0 };
        this.render(true);
      },
    });
  }

  private applyEnterChain(to: Element | null, from: Element | null): void {
    const opts = this.options as Required<CursorOptions>;
    const detection = opts.stateDetection && typeof opts.stateDetection === 'object' ? opts.stateDetection : null;

    // Collect ancestors outer -> inner so inner overrides (text/icon/img/stick) win cleanly.
    const chain: Element[] = [];
    for (let node: Node | null = to; node && node !== this.eventsTarget; node = node.parentNode) {
      if (!(node instanceof Element)) continue;
      if (from && node.contains(from)) break;
      chain.push(node);
    }

    for (let i = chain.length - 1; i >= 0; i--) {
      const node = chain[i];
      if (detection) {
        for (const state in detection) {
          if (node.matches(detection[state])) this.addState(state);
        }
      }
      if (opts.dataAttr) {
        const params = this.getFromDataset(node as HTMLElement);
        this.appliedParams.set(node, params);
        if (params.state) this.addState(params.state);
        if (params.text) this.setText(params.text);
        if (params.icon) this.setIcon(params.icon);
        if (params.iconImg) this.setIconImg(params.iconImg);
        if (params.img) this.setImg(params.img);
        if (params.video) this.setVideo(params.video);
        if (params.skew !== undefined) {
          const n = Number(params.skew);
          if (!Number.isNaN(n)) this.setSkewing(n);
        }
        if (params.show !== undefined && params.show !== 'false') this.show();
        const stickTarget = resolveStickTarget(params.stick, node);
        if (stickTarget) this.setStick(stickTarget);
      }
    }
  }

  private removeDatasetParams(node: Element, params: DatasetCursorParams): void {
    if (params.state) this.removeState(params.state);
    if (params.text) this.removeText();
    if (params.icon || params.iconImg) this.removeIcon();
    if (params.img) this.removeImg();
    if (params.video) this.removeVideo();
    if (params.skew !== undefined) this.removeSkewing();
    if (params.show !== undefined && params.show !== 'false') this.hide();
    if (resolveStickTarget(params.stick, node)) this.removeStick();
  }

  private watchHoveredChain(leaf: Element | null): void {
    if (!this.attrObserver || !this.attrObserverFilter.length) return;
    this.attrObserver.disconnect();
    for (let node: Node | null = leaf; node && node !== this.eventsTarget; node = node.parentNode) {
      if (node instanceof Element) {
        this.attrObserver.observe(node, { attributes: true, attributeFilter: this.attrObserverFilter });
      }
    }
  }

  private clearInteractiveTarget(from: Element | null, to: Element | null): void {
    const opts = this.options as Required<CursorOptions>;
    const detection = opts.stateDetection && typeof opts.stateDetection === 'object' ? opts.stateDetection : null;

    for (let node: Node | null = from; node && node !== this.eventsTarget; node = node.parentNode) {
      if (!(node instanceof Element)) continue;
      if (to && node.contains(to)) break;

      if (detection) {
        for (const state in detection) {
          if (node.matches(detection[state])) this.removeState(state);
        }
      }
      if (opts.dataAttr) {
        const applied = this.appliedParams.get(node);
        const current = this.getFromDataset(node as HTMLElement);
        if (applied) {
          this.removeDatasetParams(node, applied);
          this.appliedParams.delete(node);
        }
        if (!applied || applied.state !== current.state) {
          this.removeDatasetParams(node, current);
        }
      }
    }
  }

  /** Re-applies states/modes owned by still-hovered ancestor elements after leaving a nested child. */
  private restoreAncestorContext(current: Element): void {
    const opts = this.options as Required<CursorOptions>;
    const detection = opts.stateDetection && typeof opts.stateDetection === 'object' ? opts.stateDetection : null;

    let restoredText: string | undefined;
    let restoredIcon: string | undefined;
    let restoredIconImg: string | undefined;
    let restoredImg: string | undefined;
    let restoredVideo: string | undefined;
    let restoredStick: string | Element | undefined;
    let restoredSkew: number | undefined;
    let restoredShow = false;

    for (let node: Node | null = current; node && node !== this.eventsTarget; node = node.parentNode) {
      if (!(node instanceof Element)) continue;

      if (detection) {
        for (const state in detection) {
          if (node.matches(detection[state]) && state !== opts.hiddenState && !this.el?.classList.contains(state)) {
            this.el?.classList.add(...splitStates(state));
          }
        }
      }

      if (opts.dataAttr) {
        const params = this.getFromDataset(node as HTMLElement);
        if (params.state) {
          for (const token of splitStates(params.state)) {
            if (token !== opts.hiddenState && !this.el?.classList.contains(token)) {
              this.el?.classList.add(token);
            }
          }
        }
        if (restoredText === undefined && restoredIcon === undefined && restoredIconImg === undefined) {
          if (params.text) restoredText = params.text;
          else if (params.icon) restoredIcon = params.icon;
          else if (params.iconImg) restoredIconImg = params.iconImg;
        }
        if (restoredImg === undefined && restoredVideo === undefined) {
          if (params.img) restoredImg = params.img;
          else if (params.video) restoredVideo = params.video;
        }
        if (restoredStick === undefined) {
          const stickTarget = resolveStickTarget(params.stick, node);
          if (stickTarget) restoredStick = stickTarget;
        }
        if (restoredSkew === undefined && params.skew !== undefined) {
          const n = Number(params.skew);
          if (!Number.isNaN(n)) restoredSkew = n;
        }
        if (params.show !== undefined && params.show !== 'false') {
          restoredShow = true;
        }
      }
    }

    if (restoredShow) this.show();
    if (restoredText) this.setText(restoredText);
    else if (restoredIcon) this.setIcon(restoredIcon);
    else if (restoredIconImg) this.setIconImg(restoredIconImg);

    if (restoredImg) this.setImg(restoredImg);
    else if (restoredVideo) this.setVideo(restoredVideo);

    if (restoredStick) this.setStick(restoredStick);
    if (restoredSkew !== undefined) this.setSkewing(restoredSkew);
  }

  private resetSkewTransform(): void {
    if (!this.setter) return;
    this.setter.rotation(0);
    this.setter.scaleX(1);
    this.setter.scaleY(1);
    this.setter.inner.rotation(0);
    this.wasSkewed = false;
  }

  override render(force?: boolean): void {
    if (this.destroyed || !this.el) return;

    const moving = Math.abs(this.vel.x) > 0.001 || Math.abs(this.vel.y) > 0.001;
    if (force !== true && !moving) {
      if (this.wasSkewed) this.resetSkewTransform();
      this.setter.wc('auto');
      return;
    }

    this.trigger('render');
    this.setter.wc('transform');
    this.setter.x(this.pos.x);
    this.setter.y(this.pos.y);

    if (this.skewing && !this.reducedMotion && moving) {
      const distance = Math.hypot(this.vel.x, this.vel.y);
      const delta = this.options.skewingDelta ?? 0.001;
      const deltaMax = this.options.skewingDeltaMax ?? 0.15;
      const scale = Math.min(distance * delta, deltaMax) * this.skewing;

      if (scale > 0.001) {
        const angle = (Math.atan2(this.vel.y, this.vel.x) * 180) / Math.PI;
        this.setter.rotation(angle);
        this.setter.scaleX(1 + scale);
        this.setter.scaleY(1 - scale);
        this.setter.inner.rotation(-angle);
        this.wasSkewed = true;
      } else if (this.wasSkewed) {
        this.resetSkewTransform();
      }
    } else if (this.wasSkewed) {
      this.resetSkewTransform();
    }
  }

  override show(): void {
    if (this.destroyed || !this.el || this.pointer.touch) return;
    this.trigger('show');
    clearTimeout(this.visibleInt);
    this.visibleInt = setTimeout(() => {
      if (this.destroyed || !this.el) return;
      this.el.classList.remove(this.options.hiddenState || '-hidden');
      this.visible = true;
      this.render(true);
    }, this.options.showTimeout ?? 0);
  }

  override hide(): void {
    if (this.destroyed || !this.el) return;
    this.trigger('hide');
    clearTimeout(this.visibleInt);
    this.el.classList.add(this.options.hiddenState || '-hidden');
    this.visibleInt = setTimeout(() => {
      this.visible = false;
    }, this.options.hideTimeout ?? 300);
  }

  override addState(state: CursorState): void {
    if (this.destroyed || !this.el || !state) return;
    const tokens = splitStates(state);
    if (!tokens.length) return;
    this.trigger('addState', state);
    const hidden = this.options.hiddenState || '-hidden';
    if (tokens.includes(hidden)) {
      const others = tokens.filter((t) => t !== hidden);
      if (others.length) this.el.classList.add(...others);
      this.hide();
      return;
    }
    this.el.classList.add(...tokens);
    if (this.options.visibleOnState) this.show();
  }

  override removeState(state: CursorState): void {
    if (this.destroyed || !this.el || !state) return;
    const tokens = splitStates(state);
    if (!tokens.length) return;
    this.trigger('removeState', state);
    const hidden = this.options.hiddenState || '-hidden';
    if (tokens.includes(hidden)) {
      const others = tokens.filter((t) => t !== hidden);
      if (others.length) this.el.classList.remove(...others);
      if (this.options.visible !== false) this.show();
      return;
    }
    this.el.classList.remove(...tokens);
    if (this.options.visibleOnState && this.el.className.trim() === (this.options.className || 'mf-cursor')) {
      this.hide();
    }
  }

  override toggleState(state: CursorState, force?: boolean): void {
    if (this.destroyed || !this.el || !state) return;
    const primary = splitStates(state)[0];
    if (!primary) return;
    if (force === true || (force !== false && !this.el.classList.contains(primary))) {
      this.addState(state);
    } else {
      this.removeState(state);
    }
  }

  override setSkewing(value: number): void {
    if (this.destroyed) return;
    const next = this.reducedMotion ? 0 : value;
    this.gsap.to(this, { skewing: next, overwrite: 'auto', duration: 0.3 });
  }

  override removeSkewing(): void {
    if (this.destroyed) return;
    const next = this.reducedMotion ? 0 : (this.options.skewing ?? 0);
    this.gsap.to(this, { skewing: next, overwrite: 'auto', duration: 0.3 });
  }

  override setStick(element: string | Element): void {
    if (this.destroyed) return;
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    this.stickEl = el;
    this.stick = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    if (this.pointer.inside) this.tweenToPointer();
  }

  override removeStick(): void {
    this.stickEl = null;
    this.stick = false;
  }

  override setText(text: string): void {
    if (this.destroyed || !this.text) return;
    this.text.innerHTML = text;
    this.addState(this.options.textState || '-text');
    this.setSkewing(this.options.skewingText ?? 2);
  }

  override setIcon(icon: CursorIconName | (string & {}) | SVGElement, style = ''): void {
    if (this.destroyed || !this.text) return;
    if (icon instanceof SVGElement) {
      const node = icon.cloneNode(true) as SVGElement;
      if (style) node.setAttribute('style', style);
      this.text.innerHTML = '';
      this.text.appendChild(node);
    } else {
      const href = `${this.options.iconSvgSrc ?? ''}#${icon}`;
      const cls = `${this.options.iconSvgClassName ?? 'mf-svgsprite'} ${this.options.iconSvgNamePrefix ?? '-'}${icon}`;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', cls);
      svg.setAttribute('aria-hidden', 'true');
      if (style) svg.setAttribute('style', style);
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', href);
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
      svg.appendChild(use);
      this.text.innerHTML = '';
      this.text.appendChild(svg);
    }
    this.addState(this.options.iconState || '-icon');
    this.setSkewing(this.options.skewingIcon ?? 2);
  }

  override setIconImg(url: string, style = ''): void {
    if (this.destroyed || !this.text) return;
    const img = document.createElement('img');
    img.className = this.options.iconImgClassName || 'mf-cursor-icon';
    img.src = url;
    img.alt = '';
    img.decoding = 'async';
    if (style) img.setAttribute('style', style);
    this.text.innerHTML = '';
    this.text.appendChild(img);
    this.addState(this.options.iconState || '-icon');
    this.setSkewing(this.options.skewingIcon ?? 2);
  }

  override setMedia(element: HTMLElement): void {
    if (this.destroyed || !this.mediaBox) return;
    clearTimeout(this.mediaInt);
    if (element) {
      this.mediaBox.innerHTML = '';
      this.mediaBox.appendChild(element);
    }
    this.mediaInt = setTimeout(() => {
      if (!this.destroyed) this.addState(this.options.mediaState || '-media');
    }, 20);
    this.setSkewing(this.options.skewingMedia ?? 2);
  }

  override removeMedia(): void {
    if (this.destroyed || !this.mediaBox) return;
    clearTimeout(this.mediaInt);
    this.removeState(this.options.mediaState || '-media');
    const delay = (this.options as CursorOptions).hideMediaTimeout ?? 300;
    this.mediaInt = setTimeout(() => {
      if (!this.destroyed && this.mediaBox) this.mediaBox.innerHTML = '';
    }, delay);
    this.removeSkewing();
  }

  override setImg(url: string): void {
    if (this.destroyed) return;
    if (!this.mediaImg) {
      this.mediaImg = new Image();
      this.mediaImg.alt = '';
      this.mediaImg.decoding = 'async';
    }
    if (this.mediaImg.getAttribute('src') !== url) {
      this.mediaImg.src = url;
    }
    this.setMedia(this.mediaImg);
  }

  override setVideo(url: string): void {
    if (this.destroyed) return;
    if (!this.mediaVideo) {
      const v = document.createElement('video');
      v.muted = true;
      v.defaultMuted = true;
      v.loop = true;
      v.autoplay = true;
      v.playsInline = true;
      v.preload = 'metadata';
      this.mediaVideo = v;
    }
    if (this.mediaVideo.getAttribute('src') !== url) {
      this.mediaVideo.src = url;
      this.mediaVideo.load();
    }
    const p = this.mediaVideo.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    this.setMedia(this.mediaVideo);
  }

  override removeVideo(): void {
    if (this.mediaVideo) {
      try {
        this.mediaVideo.pause();
      } catch {
        /* ignore */
      }
    }
    this.removeMedia();
  }

  override on(event: CursorEvent | (string & {}), callback: CursorEventHandler): void {
    super.on(event, callback);
  }

  override off(event: CursorEvent | (string & {}), callback?: CursorEventHandler): void {
    super.off(event, callback);
  }

  override getFromDataset(element: HTMLElement | SVGElement): DatasetCursorParams {
    const attr = this.options.dataAttr;
    if (!attr || !('dataset' in element)) return {};
    const d = element.dataset;
    return {
      state: d[attr],
      show: d[attr + 'Show'],
      text: d[attr + 'Text'],
      icon: d[attr + 'Icon'],
      iconImg: d[attr + 'IconImg'],
      img: d[attr + 'Img'],
      video: d[attr + 'Video'],
      stick: d[attr + 'Stick'],
      skew: d[attr + 'Skew'],
    };
  }

  override destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    clearTimeout(this.visibleInt);
    clearTimeout(this.mediaInt);
    this.gsap.killTweensOf(this.pos);
    this.gsap.killTweensOf(this);
    this.cleanupExtra.forEach((fn) => fn());
    this.cleanupExtra = [];
    this.stickEl = null;
    this.hoveredEl = null;
    if (this.mediaVideo) {
      try {
        this.mediaVideo.pause();
        this.mediaVideo.removeAttribute('src');
        this.mediaVideo.load();
      } catch {
        /* ignore */
      }
    }
    super.destroy();
  }
}

export { MouseFollower, gsap };
