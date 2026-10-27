---
id: outcome-causes-press-government
title: "The newspaper-closure and exposed-corruption links run: the press and officials engines record their causes and the web keeps the turnout and re-election outcomes"
area: people
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from core-outcome-causes-recorded, Oct 19"
claimed-at:
---

**What.** Two links wait on causes the press and officials engines do not record: `newspaper-closure-to-engagement` (a local daily newspaper closing lowers local turnout, cause press.local-newspaper) and `exposed-corruption-to-reelection` (two or more exposed violations lower an incumbent's re-election, cause gov.corruption-exposed, moderated by press.local-outlets). The press engine already keeps outlets and closures, and the officials engine keeps scandals, so the cause is a count read from those rows. A link runs on the new core only when its cause is readable (an engine measure in `engineMeasures`, a government measure in `src/core2/gov-measures.ts`, or a law) and its outcome is one the web keeps (`keptOutcomes` in `src/core2/data/outcome-web/outcome-web.json` with a sourced or estimated national base), and `linkCoverage` in `src/core2/outcome-web-model.ts` checks both. So each link here needs two things: the owning engine's record of the cause, and a kept outcome with its base and source.

**Rules.** Wire to the world: an effect is a read, not a record, so the outcome is read by the engine that owns it through `outcomeWebFactor` or a kept measure that views and news read. No dice: the cause record moves the outcome by the link's researched size, never a roll. One rule, all 56 places: place facts live in data.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place of all 56 and a seed the builder did not choose, a newspaper closing in the place shows a lagged move in voting.local-turnout, and an exposed corruption record shows a move in election.incumbent-reelection, each named by the press or scandal record id, the link key and the web month record id. The test src/core2/outcome-web.test.ts lists each link as built, and `src/core2/data/outcome-web/coverage.json` moves it from waiting to wired.

**Files.** src/core2/modules/outcome-web.ts, src/core2/gov-measures.ts, src/core2/modules/press.ts, src/core2/data/outcome-web/outcome-web.json

**Notes.** Split from core-outcome-causes-recorded, which was really three bounded pieces (found building it: engine measures are read from world-metrics month fields, government measures from `gov-measures.ts`, and a wired link also needs a kept outcome, so no link is a one-line change). The links' sizes and anchors are in data/research/outcome-web/links.json.
