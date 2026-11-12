---
id: words-blocked-bill-names-the-state-law
title: "A bill the state's law bars says which law bars it"
lead: words
area: play
kind: wiring
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-words-blocked-bill-names-the-state-law
pr: #8688
after:
blocked-on:
model: sonnet
effort: low
root: rc10-screens-keep-own-facts
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T06:05:58.088Z
---

**What.** When a town's income-tax, sales-tax or minimum-wage bill is barred by the state's law, the bill's screen says only that the state lets towns levy no such tax (src/bench/data/controls.json), and never which law says so. The bill's authority check already records that law's record id as its source (src/core2/modules/legislature.ts), and a state can now change the grant by bill. A player who sees their bill blocked should read the law's designation (the starting statute, or the bill that changed it, such as AB 54) beside the reason.

**Cause.** Found in code: src/bench/data/controls.json line 502 maps 'state-gives-no-local-tax' to 'The state lets towns levy no such tax'; src/core2/modules/legislature.ts records the barring law's record id as the authority source (reason 'state-gives-no-local-tax', line 1601), and a bill's number comes from designation(numbering, n) in src/core2/legislature-bill-form.ts (line 111).

**Fix.** Show the barring law's designation (its recorded statute, or the bill that changed it) beside the reason on the bill screen through a worded label from the record, never the raw record id; after a state bill grants the power the next bill shows no bar.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Player screen text: the law is named through worded labels from the record (its designation or its recorded statute), never its raw record id; no hand-written player text in code.

**Done when.** A second session plays buildBenchWorld in a drawn place whose state bars a local income tax (place and seed named), files a council income-tax bill and sees the barring law's designation beside the reason on the bill screen, with no raw record id; after a state bill grants the power passes, the next bill shows no bar; a test reads both from the bill's authority source record id.

**Waits on.** Nothing.

**Files.** src/bench/legislature.ts, src/bench/data/controls.json, src/core2/modules/legislature.ts, src/core2/legislature-bill-form.ts

**Notes.** TODO
