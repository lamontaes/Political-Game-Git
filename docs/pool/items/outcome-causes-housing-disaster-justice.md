---
id: outcome-causes-housing-disaster-justice
title: "The home-price, disaster and pretrial-detention links run: housing, disasters and justice record their causes and the web keeps the outcomes"
area: world
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/pool-outcome-causes-housing-disaster-justice
pr:
blocked-on:
source: "split from core-outcome-causes-recorded, Oct 19"
claimed-at: 2026-11-11T04:42:58.439Z
after:
standard: 2
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
lead: laws-effects
checked: fable 2026-11-10
branch: claude/pool-outcome-causes-housing-disaster-justice
---

**What.** Three links still wait on causes or outcomes the disaster, justice and school-year engines do not record as measures: disaster-to-public-transfers (a severe disaster), release-lower-level-to-larceny and heat-to-learning. The home-price births, disaster-to-home-values and disaster-to-out-migration links are already wired, and the two pretrial-detention links are carried by the court and jobs engines. A link runs only when its cause is readable and its outcome is one the web keeps. Add the cause measure and the kept outcome for each of the three. Seen: the outcome web's links that carry a law or a disaster to Metrics numbers, which run only when the cause is recorded and the outcome is kept.

**Cause.** Found in code: linkCoverage in src/core2/outcome-web-model.ts (line 456) leaves these unwired; src/core2/data/outcome-web/coverage.json lists disaster-to-public-transfers (waitingOn gov.nondisaster-transfers), release-lower-level-to-larceny (law.low-level-offense-reclassified) and heat-to-learning (env.school-year-temperature, school.ac-share, school.learning) under "waiting"; disaster-to-home-values and disaster-to-out-migration are under "wired", and the pretrial-detention links carry a carriedBy entry.

**Fix.** Add the cause measure (a severe disaster's effect on non-disaster transfers, a lower-level release law, school-day heat) and the kept outcome for each of the three links, then regenerate coverage.json so they move from waiting to wired.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: an effect is a read, not a record, so the outcome is read by the engine that owns it through outcomeWebFactor or a kept measure that views and news read. No dice: the cause record moves the outcome by the link's researched size, never a roll. One rule, all 56 places: place facts live in data.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in a drawn place and a seed the builder did not choose (both named in the PR body) and sees a recorded severe disaster move non-disaster transfers, a lower-level release law move larceny, and school-day heat move learning, each named by the engine record id, the link key and the web month record id. src/core2/outcome-web.test.ts lists each link as built and coverage.json moves them from waiting to wired.

**Waits on.** Nothing.

**Files.** src/core2/modules/outcome-web.ts, src/core2/data/outcome-web/outcome-web.json, src/core2/data/outcome-web/coverage.json, src/core2/gov-measures.ts, src/core2/modules/housing.ts, src/core2/outcome-web.test.ts

**Notes.** Split from core-outcome-causes-recorded, which was really three bounded pieces (found building it: engine measures are read from world-metrics month fields, government measures from `gov-measures.ts`, and a wired link also needs a kept outcome, so no link is a one-line change). The links' sizes and anchors are in data/research/outcome-web/links.json.

Released (2026-11-11): 8-hour item adding three new cause measures and kept outcomes across the disaster, justice and school engines; not started. Continue on branch claude/pool-outcome-causes-housing-disaster-justice.
