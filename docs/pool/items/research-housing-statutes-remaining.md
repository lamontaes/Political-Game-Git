---
id: research-housing-statutes-remaining
title: "Research: read the eviction and foreclosure statutes the cloud could not reach, and the territories' shelter counts"
area: world
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The Oct 23 pass read eviction steps from statute text for 21 more places, but 24 places still have a notice, cure, hearing or stay value from secondary summaries: 14 because their codes are published only through Lexis or a JavaScript application or refused the cloud (AR, AS, CT, GA, GU, IL, IN, MS, NH, NM, NY, PR, TN, VI) and 10 because a step is set by court rules. Foreclosure steps are read from statute text only for Texas, and ATTOM publishes its own average days for 14 places. American Samoa and the Northern Marianas have no shelter count. Read these from the official text in a session that can open Lexis, the state court rules and the territory governments' pages, and record each with its section and a quote.

**Rules.** Research before building: each value is read from the official statute or court rule text, cited by section and quoted, and it calibrates the place's legal steps without deciding an outcome. One rule, all 56 places: the values stay per-place rows in data/research/world/ and the engine tables, never a state named in logic; Estimate, never UNKNOWN: a value still unread keeps the median of the read places, marked.

**Done when.** Every eviction field in data/research/world/eviction-statute-reads-2026.json and every foreclosure field for the places read is quoted from official text, scripts/research/housing-check.ts passes against housing.json and foreclosure.json, and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) shows an eviction case by record id following its place's read steps.

**Files.** data/research/world/eviction-statute-reads-2026.json, data/research/world/foreclosure-reads-2026.json, src/core2/data/housing/housing.json, src/core2/data/housing/foreclosure.json, scripts/research/housing-check.ts

**Notes.** TODO
