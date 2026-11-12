---
id: outcome-causes-health-programs-part-3-lead-and-abortion-links
title: "Blood lead moves reading and a denied abortion moves financial distress"
area: people
kind: wiring
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: split from outcome-causes-health-programs in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Two links wait on causes no engine records as a measure: lead-to-reading (children's blood lead, outcome school.far-below-proficient) and abortion-denied-to-financial-distress (a person whose abortion was denied, outcome finance.past-due-debt). Record each cause in the engine that owns it and keep each outcome with its base and source. Each cause is a count or level over the place's people, read from rows the engines already write.

**Cause.** Found in code: linkCoverage in src/core2/outcome-web-model.ts (line 456) leaves both unwired; src/core2/data/outcome-web/coverage.json lists lead-to-reading (waitingOn health.blood-lead, school.far-below-proficient) and abortion-denied-to-financial-distress (waitingOn person.abortion-denied, finance.past-due-debt) under "waiting".

**Fix.** Add a child blood-lead measure to the health engine and a denied-abortion count to the pregnancy path, keep the two outcomes with base and source, and regenerate coverage.json.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: an effect is a read, not a record, so the outcome is read by the engine that owns it through outcomeWebFactor or a kept measure that views and news read. No dice: the cause record moves the outcome by the link's researched size, never a roll. One rule, all 56 places: place facts live in data.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in a drawn place and a seed the builder did not choose (both named in the PR body), raises the place's children's blood lead and denies an abortion, and sees reading and the denied person's past-due debt move after the links' lags, named by engine record id, link key and web month record id. coverage.json shows both links under wired.

**Waits on.** Nothing.

**Files.** src/core2/modules/health.ts, src/core2/modules/school.ts, src/core2/modules/outcome-web.ts, src/core2/data/outcome-web/outcome-web.json, src/core2/data/outcome-web/coverage.json, src/core2/outcome-web.test.ts

**Notes (Fable B, Nov 10, depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have added two researched links to the outcome web; the web's estimates stand and no screen shows the difference.
