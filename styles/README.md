# Vale styles

This directory holds the style rules Vale uses to lint the docs. Configured in [`../.vale.ini`](../.vale.ini).

[Vale](https://vale.sh) itself ([errata-ai/vale](https://github.com/errata-ai/vale)) is licensed **MIT**.

## Style packages 

These are third-party packages pulled by `vale sync` (listed under `Packages =` in `.vale.ini`).
Never edit files inside them — changes are lost on the next sync. Tune behavior via `.vale.ini` instead.

| Package | Source | License |
| --- | --- | --- |
| **Google** — [Google developer documentation style guide](https://developers.google.com/style) (our main style) | [errata-ai/Google](https://github.com/errata-ai/Google) | MIT |
| **proselint** | [errata-ai/proselint](https://github.com/errata-ai/proselint) (port of [amperser/proselint](https://github.com/amperser/proselint)) | BSD-3-Clause — see [`proselint/README.md`](proselint/README.md) |
| **write-good** | [errata-ai/write-good](https://github.com/errata-ai/write-good) (port of [btford/write-good](https://github.com/btford/write-good)) | MIT — see [`write-good/README.md`](write-good/README.md) |

## Tether custom style

[`Tether/`](Tether/) holds our own rules (acronyms, headings, terms, weasel words, etc.). Where a Tether rule covers the same ground as a package rule, the package rule is switched off in `.vale.ini` (the `<Package>.<Rule> = NO` lines, e.g. `Google.Acronyms = NO`, `Google.Headings = NO`, `write-good.Weasel = NO`) so the Tether version is the one that applies.

### Config

[`config/`](config/) holds the project vocabulary (`vocabularies/Tether-common/`) and spelling-ignore lists (`ignore/Tether-common/`).

#### Which list to update

The two lists behave in opposite ways on case and word endings.

| | Ignore list: `ignore/…/project-words.txt` (blockchain terms: `web3-words.txt`) | Vocabulary: `vocabularies/…/accept.txt` |
| --- | --- | --- |
| Use for | Common words and camelCase identifiers that only need to pass spelling | Proper nouns and terms whose casing must be enforced |
| Case | Write the entry in lowercase. `ant` accepts `ant`, `Ant`, `ANT` and even `aNt`. An entry with capitals is stricter: `Ant` accepts `Ant` and `ANT`, but not `ant`. | Exact, unless the entry allows both, as in `[Aa]nt`. |
| Endings | Not covered. Entries are plain words and regular expressions don't work, so each form needs its own line: `ant`, `ants`, `anted`. | Entries are regular expressions, so `[Aa]nts?` covers the singular and plural on one line. |

Proper nouns that belong to one product go in that product's vocabulary, so the casing rule doesn't reach other docs sets. For example, `vocabularies/MDK/accept.txt` holds `Workers?`, which only configs with `Vocab = Tether-common, MDK` load.

Every `accept.txt` entry is also an exception to the heading capitalization rule. A common word added there, such as `[Vv]alidators?`, lets "Use Validators" pass as a heading. Keep common words in the ignore list, which doesn't have this side effect.

So don't move ignore-list words into `accept.txt` just to use regular expressions. A trial in November 2026 did this to cut repetition in `project-words.txt`. Real heading errors stopped being flagged, and lint times rose about threefold. The ignore list has few multi-form families, so the repetition it would remove is small.

Heading exceptions in [`Tether/Headings.yml`](Tether/Headings.yml) also accept regular expressions, and they match from the start of a word. A singular entry such as `Gateway` already covers `Gateways`, so a regular expression is only needed when the listed form is the plural, for example `"WebSockets?"`.

## Language

US English is enforced: the `Google.Spelling` rule ([`Google/Spelling.yml`](Google/Spelling.yml)) flags British spellings such as `colour`, `centre`, and `-ise` endings. Reference: [Google style — spelling](https://developers.google.com/style/spelling).
