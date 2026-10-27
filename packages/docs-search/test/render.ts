import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// The few Testing Library calls the component tests use, on react-dom and the
// DOM from ./dom.ts. Import it after registerDom().

type Matcher = string | RegExp;

const mounted = new Set<{ root: Root; container: HTMLElement }>();

/**
 * act(), with the flag it wants set only while it runs. Between calls an update
 * (a fetch that lands, a debounce that fires) is React's to schedule, as in a
 * browser, rather than an "update not wrapped in act" warning.
 */
function inAct(fn: () => void) {
  const g = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const prev = g.IS_REACT_ACT_ENVIRONMENT;
  g.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    act(fn);
  } finally {
    g.IS_REACT_ACT_ENVIRONMENT = prev;
  }
}

export function render(ui: ReactNode) {
  const container = document.body.appendChild(document.createElement('div'));
  const root = createRoot(container);
  mounted.add({ root, container });
  inAct(() => root.render(ui));
  return { container };
}

export function cleanup() {
  for (const { root, container } of mounted) {
    inAct(() => root.unmount());
    container.remove();
  }
  mounted.clear();
}

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
const matches = (text: string, m: Matcher) => (typeof m === 'string' ? text === m : m.test(text));
/** An element's own text, as Testing Library matches it: its text children, not its descendants'. */
const ownText = (el: Element) => normalize([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''));

function one(found: Element[], what: string) {
  if (found.length > 1) throw new Error(`Found ${found.length} elements ${what}`);
  return (found[0] as HTMLElement | undefined) ?? null;
}
function only(found: Element[], what: string) {
  const el = one(found, what);
  if (!el) throw new Error(`Found no element ${what}`);
  return el;
}
const byText = (m: Matcher) => [...document.body.querySelectorAll('*')].filter((el) => !el.matches('script, style') && matches(ownText(el), m));

export const screen = {
  getByText: (m: Matcher) => only(byText(m), `with the text ${m}`),
  queryByText: (m: Matcher) => one(byText(m), `with the text ${m}`),
  /** Buttons by accessible name: aria-label, else their text. What a modal hides (aria-hidden) is left out. */
  getByRole(role: 'button', { name }: { name: Matcher }) {
    const found = [...document.body.querySelectorAll('button, [role="button"]')].filter(
      (el) => !el.closest('[aria-hidden="true"]') && matches(el.getAttribute('aria-label') ?? normalize(el.textContent ?? ''), name),
    );
    return only(found, `with the role ${role} and the name ${name}`);
  },
};

export const fireEvent = {
  click(el: Element) {
    inAct(() => void el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })));
  },
  /** Sets the value past React's value tracker, as typing does, and fires change. */
  change(el: Element, { target: { value } }: { target: { value: string } }) {
    const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
    if (!set) throw new Error(`<${el.localName}> has no value to change`);
    inAct(() => {
      set.call(el, value);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  },
};

/** Retries `check` until it stops throwing, and returns what it returned. */
export async function waitFor<T>(check: () => T, { timeout = 1000, interval = 20 } = {}): Promise<T> {
  const giveUp = Date.now() + timeout;
  for (;;) {
    try {
      return check();
    } catch (e) {
      if (Date.now() >= giveUp) throw e;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}
