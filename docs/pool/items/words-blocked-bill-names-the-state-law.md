---
id: words-blocked-bill-names-the-state-law
title: "A bill the state's law bars says which law bars it"
lead: words
area: play
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When a town's income-tax, sales-tax or minimum-wage bill is barred by the state's law, the bill's screen says only that the state lets towns levy no such tax (src/bench/data/controls.json), and never which law says so. The bill's authority check already records that law's record id as its source (src/core2/modules/legislature.ts), and a state can now change the grant by bill. A player who sees their bill blocked should read the law's designation (the starting statute, or the bill that changed it, such as AB 54) beside the reason.

**Rules.** Player screen text: the law is named through worded labels from the record (its designation or its recorded statute), never its raw record id; no hand-written player text in code.

**Done when.** In a buildBenchWorld drawn place (seed named) whose state bars local income tax, a council member's income-tax bill shows the barring law's designation on its screen, and after a state bill granting the power passes, the next bill shows no bar; a test reads both from the bill's authority source record id.

**Files.** src/bench/legislature.ts, src/bench/data/controls.json

**Notes.** TODO
