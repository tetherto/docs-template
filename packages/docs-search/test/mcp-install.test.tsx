import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register({ url: 'https://docs.example.com/' });

const { createElement: h } = await import('react');
const { render, screen, cleanup, fireEvent, waitFor } = await import('@testing-library/react');
const { McpInstallButton } = await import('../src/mcp-install.js');
const { inkeepAskAI } = await import('../src/inkeep.js');

const URL_ = 'https://docs-search.example.com/mcp';

afterEach(cleanup);

function clipboard(fail = false) {
  const written: string[] = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (t: string) => {
        if (fail) throw new Error('denied');
        written.push(t);
      },
    },
  });
  return written;
}
function windowOpen() {
  const opened: string[] = [];
  window.open = ((u: string) => void opened.push(u)) as unknown as typeof window.open;
  return opened;
}
const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /over MCP/ }));
// By role: the brand icons carry a <title> of their own, so their names also match as text.
const option = (name: RegExp) => waitFor(() => screen.getByRole('button', { name }));

test('the button opens a menu of ways to add the server', async () => {
  render(h(McpInstallButton, { url: URL_, serverName: 'wdk-docs' }));
  openMenu();
  for (const name of [/Claude Code/, /Claude Desktop/, /Cursor/, /VS Code/, /Copy server URL/, /Copy JSON config/]) await option(name);
  screen.getByText('Give your agent semantic search over these docs.');
});

test('Claude Code copies a command that carries this site\'s server name', async () => {
  const written = clipboard();
  render(h(McpInstallButton, { url: URL_, serverName: 'wdk-docs' }));
  openMenu();
  fireEvent.click(await waitFor(() => screen.getByText('Claude Code')));
  await waitFor(() => screen.getByText('copied'));
  assert.deepEqual(written, [`claude mcp add --transport http wdk-docs ${URL_}`]);
});

test('the JSON config and the URL are copied as they are', async () => {
  const written = clipboard();
  render(h(McpInstallButton, { url: URL_, serverName: 'wdk-docs' }));
  openMenu();
  fireEvent.click(await waitFor(() => screen.getByText('Copy server URL')));
  await waitFor(() => assert.equal(written.length, 1));
  fireEvent.click(screen.getByText('Copy JSON config'));
  await waitFor(() => assert.equal(written.length, 2));
  assert.equal(written[0], URL_);
  assert.deepEqual(JSON.parse(written[1]), { mcpServers: { 'wdk-docs': { type: 'http', url: URL_ } } });
});

test('a copy that is refused says so rather than looking done', async () => {
  clipboard(true);
  render(h(McpInstallButton, { url: URL_, serverName: 'wdk-docs' }));
  openMenu();
  fireEvent.click(await waitFor(() => screen.getByText('Claude Code')));
  await waitFor(() => screen.getByText('copy failed'));
});

test('Cursor and VS Code open their deeplinks in a new window', async () => {
  const opened = windowOpen();
  render(h(McpInstallButton, { url: URL_, serverName: 'wdk-docs' }));
  openMenu();
  fireEvent.click(await option(/Cursor/));
  openMenu();
  fireEvent.click(await option(/VS Code/));
  assert.equal(opened.length, 2);
  assert.match(opened[0], /^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=wdk-docs&config=/);
  assert.match(opened[1], /^vscode:mcp\/install\?/);
});

test('label, description and class are the site\'s to set', async () => {
  render(h(McpInstallButton, { url: URL_, serverName: 'wdk-docs', label: 'Use in your agent', description: 'Search WDK from your editor.', className: 'my-extra' }));
  const trigger = screen.getByRole('button', { name: 'Use in your agent over MCP' });
  assert.match(trigger.className, /my-extra/);
  fireEvent.click(trigger);
  await waitFor(() => screen.getByText('Search WDK from your editor.'));
});

test('no URL renders nothing; a name or URL clients cannot take fails loudly', () => {
  const { container } = render(h(McpInstallButton, { url: '', serverName: 'wdk-docs' }));
  assert.equal(container.innerHTML, '');
  const quiet = console.error;
  console.error = () => {}; // React logs the error it rethrows
  try {
    assert.throws(() => render(h(McpInstallButton, { url: URL_, serverName: 'wdk docs' })), /serverName/);
    assert.throws(() => render(h(McpInstallButton, { url: 'javascript:alert(1)', serverName: 'wdk-docs' })), /not an http\(s\) URL/);
  } finally {
    console.error = quiet;
  }
});

test('inkeepAskAI gives no adapter without an API key, and an adapter that renders nothing while closed', () => {
  const options = { organizationDisplayName: 'WDK Docs', primaryBrandColor: '#fff' };
  assert.equal(inkeepAskAI({ ...options, apiKey: '' }), undefined);
  assert.equal(inkeepAskAI({ ...options, apiKey: undefined }), undefined);
  const askAI = inkeepAskAI({ ...options, apiKey: 'key' });
  assert.ok(askAI);
  const { container } = render(h(askAI.Component, { open: false, onOpenChange: () => {}, question: 'q' }));
  assert.equal(container.innerHTML, '');
});
