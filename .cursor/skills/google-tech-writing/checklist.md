# Review checklist

Run this checklist when reviewing a docs page or diff. Mark each item per page.

Pear-runtime names are used as concrete examples below (`pear`, Hypercore, Hyperbee) because this skill ships from `tetherto/docs-template`. Substitute the product, command, and brand names of your own project when applying the rules.

## Audience and orientation

- [ ] First paragraph names the audience (who this is for).
- [ ] First paragraph states the outcome (what the reader will know or be able to do).
- [ ] First paragraph names prerequisites (what knowledge / setup is assumed).
- [ ] Page belongs in one Diataxis mode (see [`diataxis`](../diataxis/SKILL.md)).

## Voice and tense

- [ ] Active voice throughout. Passive only where the agent is genuinely unknown.
- [ ] Present tense for behaviour ("returns", not "will return").
- [ ] Second person ("you"), not "the user" or "one".
- [ ] Imperative for instructions ("Run…"), not "You should run…".

## Sentence shape

- [ ] No sentence over 30 words; few over 25.
- [ ] One main idea per sentence.
- [ ] No ambiguous "it", "this", "they", "these" — always check the referent is one clause away or replace with the noun.
- [ ] "That" for restrictive clauses, "which" + comma for non-restrictive.

## Word choice

- [ ] No banned filler: "easy", "simple", "simply", "just", "obviously", "of course", "merely", "basically", "actually".
- [ ] No condescending hedges: "sort of", "kind of", "tends to", "may sometimes".
- [ ] No "please" in instructions.
- [ ] Plain over fancy: "use" not "utilize", "help" not "facilitate", "start" not "initiate".
- [ ] Acronyms spelled out on first use per page; specialised terms defined.
- [ ] Same term used throughout (no alternation between "API endpoint" / "URL" / "route").

## Structure

- [ ] Sentence-case headings (proper nouns excepted).
- [ ] Headings describe content, not section number or filler ("Overview" is rarely useful).
- [ ] Three or more parallel items rendered as a list.
- [ ] Lists are grammatically parallel (all imperative, or all noun phrases).
- [ ] Tables compare alternatives or list reference data; not used for layout.

## Code, UI, product names

- [ ] Inline code (`backticks`) for commands, file paths, env vars, identifiers.
- [ ] **Bold** for UI elements the reader clicks.
- [ ] Product, command, brand names match upstream casing (Pear, Hypercore, Hyperbee, npm, GitHub).
- [ ] Error messages quoted verbatim in code formatting.

## Links

- [ ] Link text describes the destination (no "click here", "this page", bare URLs).
- [ ] Cross-mode links present where useful (tutorial → how-to → reference → explanation).
- [ ] No broken links (run `npm run check-links`).

## Inclusivity

- [ ] Gender-neutral language; singular "they" for unknown person.
- [ ] No "blacklist/whitelist", "master/slave", "guru/ninja" — use neutral alternatives.
- [ ] No idioms or jokes that depend on a specific culture or first language.

## Accuracy

- [ ] Code samples run as written (verify, don't trust).
- [ ] Versions, env var names, file paths match the current code.
- [ ] `lastModified` frontmatter updated if the content changed materially (see [`docs-frontmatter`](../docs-frontmatter/SKILL.md)).
