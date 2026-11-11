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

**Cause.** Found in code: docs/reports/effects-web-plan-2026-10-29.md lists families 2 to 5 (treasury interest, medical bills, voting relief, jobs pull to work); their links are rows in src/core2/data/outcome-web/unwired.json (for example relief-spending-to-votes, broadband-to-employment), read by no engine (see `unwired.json`).

**Fix.** Build the families in order, one PR each, per the plan's workflow: an engine reads each link's measure, the link leaves unwired.json, and the matrices are regenerated once per family.

**Time box.** 8 hours for one Opus session; stop at the time box and leave the finished families merged.

**Rules.** Replace, never layer: every PR deletes the second path and counts it. Wire to the world and an effect is a read, not a record: the law in force changes, the engine that pays or decides reads it, and a named person's money or view moves. The chain is the acceptance. A missing reader is a registered stopgap naming the engine, not a new mechanic.

**Done when.** A second session plays a year in two drawn places per family (places and seeds named) and sees a treasury interest, a medical bill, a voting-relief vote and a jobs-pull record each move because of its link, by record id; the links are gone from src/core2/data/outcome-web/unwired.json and the effect matrix counts them as reaching.

**Waits on.** Nothing.

**Files.** docs/reports/effects-web-plan-2026-10-29.md, src/core2/data/outcome-web/unwired.json, scripts/outcome-web/effect-matrix.ts, src/core2/modules/outcome-web.ts

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:24 UTC) on branch claude/pool-wire-law-links-to-people-part-2-effects-families-2-to-5.

Released (2026-11-11): Most links lack a record, not a reader; findings per link on PR 8700. Continue on branch claude/pool-wire-law-links-to-people-part-2-effects-families-2-to-5.
