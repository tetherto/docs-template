'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { Check, ClaudeIcon, Copy, CursorIcon, ExternalLink, Plug, VSCodeIcon, X } from './icons.js';
import { assertInstallable, claudeCodeCommand, configJson, cursorHref, vscodeHref } from './mcp-links.js';

const optionClassName =
  'text-sm p-2 rounded-lg inline-flex items-center gap-2 text-left hover:text-fd-accent-foreground hover:bg-fd-accent [&_svg]:size-4';
const muted = 'text-fd-muted-foreground';
const COPY_RESET_MS = 2000;

export interface McpInstallButtonProps {
  /** The service's MCP endpoint, e.g. `https://docs-search.example.com/mcp`. Renders nothing when empty. */
  url: string;
  /**
   * The name clients register the server under. Unique per site, or two sites'
   * servers would overwrite each other in a reader's config; the service's
   * QVAC_MCP_NAME is the same value.
   */
  serverName: string;
  /** The button's text. */
  label?: string;
  /** The line above the options. */
  description?: ReactNode;
  className?: string;
}

/**
 * "Add to your AI tool": installs the docs MCP server, which gives an agent
 * semantic search over the docs. Meant for `sidebar.banner`, which Fumadocs
 * places beneath the sidebar's search box.
 *
 * An empty `url` renders nothing, so a deploy not pointed at an endpoint yet
 * ships no dead button. A `serverName` or `url` that clients could not take
 * throws, which fails the site's build rather than shipping a broken install.
 */
export function McpInstallButton({
  url,
  serverName,
  label = 'Add to your AI tool',
  description = 'Give your agent semantic search over these docs.',
  className,
}: McpInstallButtonProps) {
  // `${key}:ok` or `${key}:fail` for the option last clicked, else null.
  const [copyState, setCopyState] = useState<string | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) window.clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  if (!url) return null;
  assertInstallable(serverName, url);

  async function copy(key: string, text: string) {
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Rejects in a non-secure context or when the permission is denied.
      // Silence here would dismiss the popover with an empty clipboard and no
      // hint that the one thing the button exists to do did not happen.
      ok = false;
    }
    setCopyState(`${key}:${ok ? 'ok' : 'fail'}`);
    if (resetTimeoutRef.current) window.clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = window.setTimeout(() => {
      setCopyState(null);
      resetTimeoutRef.current = null;
    }, COPY_RESET_MS);
  }

  function open(href: string) {
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  /** Copy options swap their icon to a tick, or a cross, for COPY_RESET_MS. */
  function icon(key: string, fallback: ReactNode) {
    if (copyState === `${key}:ok`) return <Check className={muted} />;
    if (copyState === `${key}:fail`) return <X className={muted} />;
    return fallback;
  }

  /** Replaces an option's trailing hint while its result is showing. */
  function hint(key: string, idle: string, done = 'copied') {
    if (copyState === `${key}:ok`) return done;
    if (copyState === `${key}:fail`) return 'copy failed';
    return idle;
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${label} over MCP`}
        className={buttonVariants({
          color: 'secondary',
          size: 'sm',
          className: ['w-full justify-start gap-2 font-normal', className].filter(Boolean).join(' '),
        })}
      >
        <Plug className={`size-3.5 ${muted}`} />
        {label}
      </PopoverTrigger>

      <PopoverContent className="flex flex-col">
        <p className={`p-2 pb-1 text-xs ${muted}`}>{description}</p>

        <button type="button" onClick={() => copy('claude-code', claudeCodeCommand(serverName, url))} className={optionClassName}>
          {icon('claude-code', <ClaudeIcon className={muted} />)}
          Claude Code
          <span className={`ms-auto text-xs ${muted}`}>{hint('claude-code', 'copy command')}</span>
        </button>

        {/*
          Not a config file: claude_desktop_config.json holds local (command/args)
          servers only. A remote server is added under Settings → Connectors →
          Add custom connector, which takes a name and a URL.
        */}
        <button
          type="button"
          onClick={() => copy('claude-desktop', url)}
          title="Copies the server URL. In Claude Desktop, open Settings → Connectors → Add custom connector and paste it."
          className={optionClassName}
        >
          {icon('claude-desktop', <ClaudeIcon className={muted} />)}
          Claude Desktop
          <span className={`ms-auto text-xs ${muted}`}>{hint('claude-desktop', 'copy URL', 'add in Connectors')}</span>
        </button>

        {/* Deeplinks still close the popover: they hand off to another app. */}
        <PopoverClose asChild>
          <button type="button" onClick={() => open(cursorHref(serverName, url))} className={optionClassName}>
            <CursorIcon className={muted} />
            Cursor
            <ExternalLink className={`ms-auto size-3.5 ${muted}`} />
          </button>
        </PopoverClose>

        <PopoverClose asChild>
          <button type="button" onClick={() => open(vscodeHref(serverName, url))} className={optionClassName}>
            <VSCodeIcon className={muted} />
            VS Code
            <ExternalLink className={`ms-auto size-3.5 ${muted}`} />
          </button>
        </PopoverClose>

        <div className="my-1 border-t" />

        <button type="button" onClick={() => copy('url', url)} className={optionClassName}>
          {icon('url', <Copy className={muted} />)}
          Copy server URL
          <span className={`ms-auto text-xs ${muted}`}>{hint('url', '')}</span>
        </button>

        <button type="button" onClick={() => copy('json', configJson(serverName, url))} className={optionClassName}>
          {icon('json', <Copy className={muted} />)}
          Copy JSON config
          <span className={`ms-auto text-xs ${muted}`}>{hint('json', '')}</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
