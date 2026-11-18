'use client';
import { lazy, Suspense } from 'react';
import type { AskAIAdapter } from './dialog.js';

// The chat is loaded on the first open, so Inkeep's SDK is not part of every
// page's bundle. `@inkeep/cxkit-react` is an optional peer: only a site that
// calls `inkeepAskAI` needs it installed.
const Chat = lazy(() => import('./inkeep-chat.js'));

export interface InkeepAskAIOptions {
  /** The site's Inkeep API key. Empty or missing gives no adapter, so the dialog shows no Ask AI. */
  apiKey: string | undefined;
  organizationDisplayName: string;
  /** The brand colour Inkeep themes its chat with: one colour, or one per colour mode. Inkeep requires one. */
  primaryBrandColor: string | { light: string; dark: string };
  /** Wait this long after the chat opens before sending the question. */
  submitDelayMs?: number;
  /** More `baseSettings` for `InkeepModalChat`, merged over the above. */
  settings?: Record<string, unknown>;
}

/**
 * An Ask AI adapter for `DocsSearchDialog` backed by Inkeep's modal chat, or
 * undefined without an API key (a preview deploy without one then shows no
 * Ask AI rather than a broken one). Call it once, at module level: the dialog
 * keeps the chat mounted by the adapter's identity.
 */
export function inkeepAskAI(options: InkeepAskAIOptions): AskAIAdapter | undefined {
  if (!options.apiKey) return undefined;
  const resolved = { ...options, apiKey: options.apiKey };
  return {
    Component: ({ open, onOpenChange, question }) =>
      open ? (
        <Suspense fallback={null}>
          <Chat open={open} onOpenChange={onOpenChange} question={question} options={resolved} />
        </Suspense>
      ) : null,
  };
}
