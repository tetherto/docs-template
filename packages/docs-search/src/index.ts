'use client';
// The entry point of the dialog, as one client module: a Next server component
// can import and render it. The server-side and client-free parts have their own
// subpaths (`/export`, `/client`, `/contract`).
export { DocsSearchDialog, createDocsSearchDialog, DocsSearchDialog as default } from './dialog.js';
export type { AskAIAdapter, DocsSearchDialogConfig, DocsSearchDialogProps, DocsSearchLabels } from './dialog.js';
export type { FallbackSearchOptions } from './fallback-search.js';
export { useSemanticSearch } from './use-semantic-search.js';
export type { SemanticSearch, UseSemanticSearchOptions } from './use-semantic-search.js';
export type { SearchHit } from './contract.js';
