import * as linkedom from 'linkedom';

/**
 * Puts a DOM on the globals, where a browser has it, for the component tests.
 *
 * linkedom is a DOM without a browser around it: no layout, no focus and no
 * script runner (so no shell or eval in the dependency tree either, which is
 * why it is used over happy-dom or jsdom). What React, Radix and Floating UI
 * reach for that it leaves out is filled in here, as no-ops where they measure.
 * Call it before React or a component is imported.
 */
export function registerDom(url: string) {
  const { window, document } = linkedom.parseHTML('<!doctype html><html><head></head><body></body></html>');
  const g = globalThis as unknown as Record<string, unknown>;
  const w = window as unknown as Record<string, unknown>;

  // linkedom's window writes through to globalThis, so `window.open = …` in a
  // test is the `window.open` a component calls.
  g.window = window;
  g.document = document;
  for (const name of ['Node', 'Element', 'Text', 'DocumentFragment', 'ShadowRoot', 'MutationObserver', 'Event', 'CustomEvent', 'InputEvent'])
    g[name] = w[name];
  for (const name of Object.keys(linkedom)) if (/^(HTML|SVG)\w*Element$/.test(name)) g[name] = w[name];

  // An <input> with no type attribute is a text input; linkedom says null, and
  // React then does not treat it as one, so typing in it never reaches onChange.
  Object.defineProperty((w.HTMLInputElement as typeof HTMLInputElement).prototype, 'type', {
    configurable: true,
    get(this: HTMLInputElement) {
      return this.getAttribute('type')?.toLowerCase() || 'text';
    },
    set(this: HTMLInputElement, type: string) {
      this.setAttribute('type', type);
    },
  });

  // Events that keep the rest of their init (button, key, relatedTarget…).
  const Base = w.Event as typeof Event;
  class DetailedEvent extends Base {
    constructor(type: string, init: EventInit & Record<string, unknown> = {}) {
      super(type, init);
      const { bubbles: _b, cancelable: _c, composed: _d, ...rest } = init;
      Object.assign(this, rest);
    }
  }
  for (const name of ['UIEvent', 'MouseEvent', 'PointerEvent', 'FocusEvent', 'KeyboardEvent']) g[name] = class extends DetailedEvent {};

  // Focus: which element has it, and the events that move it. Only what a
  // browser would focus takes it, or Radix's focus-the-first-candidate loop
  // stops at a <div>.
  let focused: Element | null = null;
  const current = () => (focused?.isConnected ? focused : null);
  const focusable = (el: Element) => el.matches('input, select, textarea, button, a[href], [tabindex]') && !el.hasAttribute('disabled');
  const FocusEvent = g.FocusEvent as typeof globalThis.FocusEvent;
  const move = (to: Element | null) => {
    const from = current();
    if (to === from) return;
    focused = to;
    from?.dispatchEvent(new FocusEvent('blur', { relatedTarget: to }));
    from?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: to }));
    to?.dispatchEvent(new FocusEvent('focus', { relatedTarget: from }));
    to?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: from }));
  };
  Object.defineProperty(document, 'activeElement', { configurable: true, get: () => current() ?? document.body });
  const { prototype } = w.HTMLElement as typeof HTMLElement;
  prototype.focus = function (this: HTMLElement) {
    if (this.isConnected && focusable(this)) move(this);
  };
  prototype.blur = function (this: HTMLElement) {
    if (current() === this) move(null);
  };
  prototype.scrollIntoView = () => {};

  // React checks for `oninput` on the document to listen for input events
  // rather than its IE9 fallback, which never fires here.
  Object.defineProperty(document, 'oninput', { configurable: true, writable: true, value: null });

  const noop = () => {};
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  Object.assign(g, {
    location: new URL(url),
    innerWidth: 1024,
    innerHeight: 768,
    ResizeObserver: Observer,
    IntersectionObserver: Observer,
    NodeFilter: { SHOW_ALL: 0xffffffff, SHOW_ELEMENT: 1, SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3 },
    // No layout, so no computed style beyond what is set inline.
    getComputedStyle: (el: HTMLElement) => el.style,
    matchMedia: (media: string) => ({ media, matches: false, onchange: null, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
    requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0),
    cancelAnimationFrame: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  });
}
