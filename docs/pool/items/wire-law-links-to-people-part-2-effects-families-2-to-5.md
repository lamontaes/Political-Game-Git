---
id: wire-law-links-to-people-part-2-effects-families-2-to-5
title: "Effects-web families 2 to 5 reach records"
area: laws
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
source: split from wire-law-links-to-people in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-wire-law-links-to-people-part-2-effects-families-2-to-5
---

**What.** Part of wire-law-links-to-people. Families 2 to 5 of the Oct 29 effects plan (treasury interest, medical bills, voting relief, jobs pull to work) are unread links: the research exists but no engine reads the measure, so the law's effect stops at a record. Each family is one PR, proven in two drawn places, with the matrices regenerated once. Seen: a person's medical bills, treasury interest, voting relief and job pull after a law.

**Cause.** Needs cause. Looked at (opus-5234, Nov 11, PR #8700, table there): the sizes landed (data/research/outcome-web/sizes-2026-10-29.json), but most links lack a record, not a reader. federal-deficit-to-borrowing-cost is already wired. newspaper-closure-to-borrowing-cost needs a county or city bond record (the only gov.borrowing-cost reader reprices the state's interest line; law-wiring-civic-web.test.ts pins it). coverage-to-catastrophic-bills has no health.coverage record; eviction-to-hospital-visits has no hospital-visits measure; transit-loss-to-unemployment has no record of who loses service; birth-year-pollution-to-adult-earnings needs each person's exposure record. Buildable as written: broadband-to-employment (size 0.0014 per enrollee, read in the jobs engine's pull to work) and relief-spending-to-votes (a unit adapter and the voting engine crediting the President's party; four-year proof). The writer splits this item into those two and the record items.

**Fix.** None until the cause is found.

**Time box.** 8 hours for one Opus session; stop at the time box and leave the finished families merged.

**Rules.** Replace, never layer: every PR deletes the second path and counts it. Wire to the world and an effect is a read, not a record: the law in force changes, the engine that pays or decides reads it, and a named person's money or view moves. The chain is the acceptance. A missing reader is a registered stopgap naming the engine, not a new mechanic.

**Done when.** A second session plays a year in two drawn places per family (places and seeds named) and sees a treasury interest, a medical bill, a voting-relief vote and a jobs-pull record each move because of its link, by record id; the links are gone from src/core2/data/outcome-web/unwired.json and the effect matrix counts them as reaching.

**Waits on.** Nothing.

**Files.** docs/reports/effects-web-plan-2026-10-29.md, src/core2/data/outcome-web/unwired.json, scripts/outcome-web/effect-matrix.ts, src/core2/modules/outcome-web.ts

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:24 UTC) on branch claude/pool-wire-law-links-to-people-part-2-effects-families-2-to-5.

Released (2026-11-11): Most links lack a record, not a reader; findings per link on PR 8700. Continue on branch claude/pool-wire-law-links-to-people-part-2-effects-families-2-to-5.
