'use client';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { create } from 'zbsearch';

// Dropped from queries so articles and other function words ("a worker")
// don't match pages on their own. The index is tokenized server-side, so
// this list only filters query tokens.
const STOP_WORDS = [
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
  'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'onto', 'to', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did',
  'can', 'could', 'should', 'would', 'will', 'may', 'might', 'shall',
  'i', 'it', 'its', 'this', 'that', 'these', 'those', 'as', 'than', 'too',
  'how', 'what', 'which', 'who', 'whom', 'why', 'not', 'no', 'so', 'such',
];

function initDB() {
  return create({
    schema: { _: 'string' },
    components: {
      tokenizer: { language: 'english', stopWords: STOP_WORDS },
    },
  });
}

export default function DefaultSearchDialog(props: SharedProps) {
  const { search, setSearch, query } = useDocsSearch({
    type: 'static',
    initDB,
    // Require every remaining query token to match (default threshold is 1 = OR).
    search: { threshold: 0 },
  });

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  );
}

