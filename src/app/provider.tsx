"use client";
import { RootProvider } from "fumadocs-ui/provider/next";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import type { ReactNode } from "react";
import { createDocsSearchDialog } from "@tetherto/docs-search";
import { inkeepAskAI } from "@tetherto/docs-search/inkeep";

const InkeepSearchDialog = dynamic(() => import("@/components/inkeep-search"));
// The site's own static search. Fumadocs' built-in dialog queries /api/search per
// keystroke, which this site serves as one static index, so it must be set explicitly.
const StaticSearchDialog = dynamic(() => import("@/components/search-dialog"));

// The QVAC docs search service's origin. When set, the search box asks it (semantic
// search over the site's index) and falls back to this site's own search if it fails.
const QVAC_API_URL = process.env.NEXT_PUBLIC_QVAC_API_URL?.trim() ?? "";

// Created once at module level: the dialog's identity must not change between renders.
const QvacSearchDialog = QVAC_API_URL
  ? createDocsSearchDialog({
      apiUrl: QVAC_API_URL,
      // The site's own static index, same as search-dialog.tsx. Imported on demand, so
      // the search engine is only downloaded once the service has failed.
      fallback: {
        type: "static",
        initDB: async () => (await import("@/components/search-dialog")).initDB(),
        search: { threshold: 0 },
      },
      // No Inkeep key: no adapter, so no Ask AI button.
      askAI: inkeepAskAI({
        apiKey: process.env.NEXT_PUBLIC_INKEEP_API_KEY,
        organizationDisplayName: "DOCS",
        primaryBrandColor: "#16E3C1",
      }),
    })
  : null;

function hasInkeepSearchEnv(): boolean {
  const key = process.env.NEXT_PUBLIC_INKEEP_API_KEY;
  return typeof key === "string" && key.length > 0;
}

type NoPrefetchLinkProps = React.ComponentProps<"a"> & { prefetch?: boolean };

function NoPrefetchLink({ prefetch: _prefetch, href, ...props }: NoPrefetchLinkProps) {
  // Work around static-export navigation edge cases by disabling prefetch globally.
  // We still use Next's <Link> so navigation stays client-side and preserves sidebar behavior.
  return <NextLink href={href ?? "#"} prefetch={false} {...props} />;
}

export function Provider({ children }: { children: ReactNode }) {
  const inkeepSearch = hasInkeepSearchEnv();
  const SearchDialog = QvacSearchDialog ?? (inkeepSearch ? InkeepSearchDialog : StaticSearchDialog);

  return (
    <RootProvider
      components={{
        Link: NoPrefetchLink,
      }}
      search={{ SearchDialog }}
    >
      {children}
    </RootProvider>
  );
}
