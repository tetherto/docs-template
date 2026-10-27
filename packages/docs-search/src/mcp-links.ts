/**
 * What each MCP client takes to add a remote (streamable-HTTP) server: a
 * command, a deeplink, or a config to paste. No directive and no React, so the
 * strings are testable apart from the button.
 */

/** A name clients take as a bare identifier: `claude mcp add <name>`, Cursor's deeplink, a config key. */
export const SERVER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/** Throws unless `serverName` and `url` can be handed to a client as they are. */
export function assertInstallable(serverName: string, url: string): void {
  if (!SERVER_NAME_PATTERN.test(serverName)) {
    throw new Error(
      `McpInstallButton: serverName ${JSON.stringify(serverName)} must be letters, digits, "-" and "_" (at most 64), ` +
        `starting with a letter or digit. Clients take it as a bare identifier.`,
    );
  }
  let parsed: URL | undefined;
  try {
    parsed = new URL(url);
  } catch {
    // reported below
  }
  if (!parsed || !/^https?:$/.test(parsed.protocol)) {
    throw new Error(`McpInstallButton: url ${JSON.stringify(url)} is not an http(s) URL`);
  }
}

/**
 * The config object most clients store (Cursor's deeplink is the exception, see
 * `cursorHref`). `type: 'http'` is the streamable-HTTP transport, a plain POST
 * endpoint that answers JSON-RPC, as opposed to the `stdio` shape of
 * locally-spawned servers.
 */
export function serverConfig(url: string) {
  return { type: 'http' as const, url };
}

/** What a user pastes into any client that takes an `mcpServers` map. */
export function configJson(serverName: string, url: string): string {
  return JSON.stringify({ mcpServers: { [serverName]: serverConfig(url) } }, null, 2);
}

/**
 * Base64 of the string's UTF-8 bytes. `btoa` alone takes a Latin-1 "binary
 * string": it throws on anything outside Latin-1 and encodes the rest of
 * non-ASCII as Latin-1, not UTF-8. For ASCII the output is the same.
 */
export function base64Utf8(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Cursor's install deeplink takes the *inner* server config (no `mcpServers`
 * wrapper), JSON-stringified and base64-encoded. Cursor's docs show a remote
 * server as just `{ url }` (they document `type` only for stdio), so that is the
 * shape sent. Built at click time, not render time: `btoa` does not exist during
 * Next's server prerender of a client component.
 */
export function cursorHref(serverName: string, url: string): string {
  const config = base64Utf8(JSON.stringify({ url }));
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(serverName)}&config=${encodeURIComponent(config)}`;
}

/** VS Code takes the config inline as a URL-encoded JSON object, with the name folded in. */
export function vscodeHref(serverName: string, url: string): string {
  const payload = JSON.stringify({ name: serverName, ...serverConfig(url) });
  return `vscode:mcp/install?${encodeURIComponent(payload)}`;
}

/** The URL as one shell word: bare when it is plain, single-quoted when it has a character a shell would act on. */
function shellWord(s: string): string {
  return /^[A-Za-z0-9._~:/%@+=-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;
}

export function claudeCodeCommand(serverName: string, url: string): string {
  return `claude mcp add --transport http ${serverName} ${shellWord(url)}`;
}
