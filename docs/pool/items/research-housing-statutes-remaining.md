---
id: research-housing-statutes-remaining
title: "Research: read the eviction and foreclosure statutes the cloud could not reach, and the territories' shelter counts"
area: world
kind: research
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
standard: 2
model: sonnet
effort: medium
root: rc9-place-facts-one-default
lead: researcher
after:
checked: fable 2026-11-10
---

**What.** The Oct 23 pass read eviction steps from statute text for 21 more places, but 24 places still have a notice, cure, hearing or stay value from secondary summaries: 14 because their codes are published only through Lexis or a JavaScript application or refused the cloud (AR, AS, CT, GA, GU, IL, IN, MS, NH, NM, NY, PR, TN, VI) and 10 because a step is set by court rules. Foreclosure steps are read from statute text only for Texas, and ATTOM publishes its own average days for 14 places. American Samoa and the Northern Marianas have no shelter count. Read these from the official text in a session that can open Lexis, the state court rules and the territory governments' pages, and record each with its section and a quote.

**Cause.** Found in code: the `eviction` table in src/core2/data/housing/housing.json still carries eviction notice, cure, hearing and stay values from secondary summaries for 24 places (item count, Oct 23), with the read values in data/research/world/eviction-statute-reads-2026.json.

**Fix.** Read the remaining places' eviction steps and foreclosure steps from statute or court-rule text with section and quote; unread values keep the median of read places, marked.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: each value is read from the official statute or court rule text, cited by section and quoted, and it calibrates the place's legal steps without deciding an outcome. One rule, all 56 places: the values stay per-place rows in data/research/world/ and the engine tables, never a state named in logic. Estimate, never UNKNOWN: a value still unread keeps the median of the read places, marked.

**Done when.** A second session opens data/research/world/eviction-statute-reads-2026.json and finds every eviction field, and every foreclosure field for the places read, quoted from official text with its section. scripts/research/housing-check.ts passes against src/core2/data/housing/housing.json and src/core2/data/housing/foreclosure.json, and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) shows an eviction case by record id following its place's read steps.

**Waits on.** Nothing.

**Files.** data/research/world/eviction-statute-reads-2026.json, data/research/world/foreclosure-reads-2026.json, src/core2/data/housing/housing.json, src/core2/data/housing/foreclosure.json, scripts/research/housing-check.ts

**Notes.** TODO

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have read 24 places' eviction notice, cure and stay steps from statute text instead of secondary summaries; no player sees the difference.
