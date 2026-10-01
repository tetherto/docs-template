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

## Language

US English is enforced: the `Google.Spelling` rule ([`Google/Spelling.yml`](Google/Spelling.yml)) flags British spellings such as `colour`, `centre`, and `-ise` endings. Reference: [Google style — spelling](https://developers.google.com/style/spelling).
