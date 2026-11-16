---
id: laws-restating-row-nudges-business-prices
title: "A law row that restates the value already in force changes every business's price by one part in a million"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "law-links thread, Nov 16, 2026, tracing why a do-nothing bill moves a world (lead's question, 02:05Z)"
model: opus
effort: medium
root: none
---

**What.** A law row that restates the value already in force should change nothing. At its next price review every business in town prices one part in a million differently from the same world without the row, and sales drift from there. Any comparison against a do-nothing bill carries this as noise. Seen: dev mode's Industries check shows businesses moved that no law reached.

**Cause.** Needs cause. Measured: at Choteau, Montana (place 3014650), seed ilt-3014650, by a probe that enacts `enactLaw` for the state's expand-medicaid-eligibility question at value 1 on the opening day (already 1), the first difference from the untouched world is on 2025-04-20, each business's `price` (finance books) 1008789 against 1008788 millionths. Probe: /mnt/project-files/law-links/probes/null-row.md.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort to find the cause. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a restated law changes no value, so nothing an actor decides may move because of it.

**Done when.** A second session, in a drawn place (named, with its seed), enacts a row that restates a law in force and runs the world six months, and every business's books match the world without it.

**Waits on.** Nothing.

**Files.** src/core2/modules/laws.ts, src/core2/finance-state.ts, src/core2/modules/outcome-web.ts

**Notes.** Law-links thread, Nov 16, 2026.
