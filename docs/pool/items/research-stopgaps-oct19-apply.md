---
id: research-stopgaps-oct19-apply
title: "Apply the Oct 19 stopgap research: 112 rows have sourced values or estimates with spreads"
area: core
kind: stopgap
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: "data/research/stopgaps-oct19/README.md"
---

**What.** `data/research/stopgaps-oct19/` holds a researched value, spread, sources and a one-line builder note for each of 112 open stopgap rows. Apply them: move each value into the game's data or code, resolve the stopgap row with the source, and keep low-confidence rows labeled as estimates with their spread. Split by file (A to E) so several builders can take a part each.

**Rules.** One rule, all 56 places; estimate, never unknown; estimate labels show only in developer mode; never copy a publisher's table whole; AGENTS.md rules.

**Done when.** Every row in the five files is applied or carries a written reason it can't be yet, and the stopgaps report shows them resolved.

**Files.** data/research/stopgaps-oct19/, src/core2/data/stopgaps.json

**Notes.** The rows still blocked on the Census API key are named in the README.

Applied Oct 20 (claude, PR for D-economy-world): SG-WORLD-housing-shelter-territory (island-area median 6.18, spread 2.47 to 10.9, data `estimated` block + `shelterRateFor` + test; row kept open with revised text since the replacement is each territory's own count). Next in D: SG-WORLD-housing-foreclosure-steps needs the place's process class plumbed to housing-foreclosure.ts before the 174/2007/2293 fills apply; SG-WORLD-macro-mortgage-spread is a constant-to-table swap in macro-model.ts; rows whose note says Bernoulli (SG-M1-opening-pregnancies) break the no-dice rule and need a rewrite, not a copy.
