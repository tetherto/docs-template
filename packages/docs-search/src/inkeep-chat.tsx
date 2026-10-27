'use client';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { InkeepModalChat, type AIChatFunctions, type InkeepModalChatProps } from '@inkeep/cxkit-react';
import type { InkeepAskAIOptions } from './inkeep.js';

function subscribeToColorMode(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

/** Whether the page is in dark mode, from the `dark` class Fumadocs (via next-themes) puts on <html>. */
function useIsDark() {
  return useSyncExternalStore(
    subscribeToColorMode,
    () => document.documentElement.classList.contains('dark'),
    () => false,
  );
}

export interface InkeepChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
  options: InkeepAskAIOptions & { apiKey: string };
}

export default function InkeepChat({ open, onOpenChange, question, options }: InkeepChatProps) {
  const chatRef = useRef<AIChatFunctions>(null);
  const dark = useIsDark();
  const delay = options.submitDelayMs ?? 300;

  // Send the typed query once the chat has mounted.
  useEffect(() => {
    if (!open || !question) return;
    const t = setTimeout(() => chatRef.current?.submitMessage(question), delay);
    return () => clearTimeout(t);
  }, [open, question, delay]);

  const brand = options.primaryBrandColor;
  const primaryBrandColor = typeof brand === 'string' ? brand : brand[dark ? 'dark' : 'light'];

  const config: InkeepModalChatProps = {
    baseSettings: {
      apiKey: options.apiKey,
      organizationDisplayName: options.organizationDisplayName,
      primaryBrandColor,
      colorMode: { forcedColorMode: dark ? 'dark' : 'light' },
      ...(options.settings as Partial<InkeepModalChatProps['baseSettings']>),
    },
    aiChatSettings: { chatFunctionsRef: chatRef },
    modalSettings: { isOpen: open, onOpenChange },
  };
  return <InkeepModalChat {...config} />;
}
