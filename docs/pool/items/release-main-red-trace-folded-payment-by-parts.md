---
id: release-main-red-trace-folded-payment-by-parts
title: "Dev mode's trace no longer says a campaign payment's record was folded, since a composed id answers from its parts"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-campaign-mail-trace-by-parts
pr: 8984
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 13 (the filing sweep of tests-filing-fixed-date-thirteen-files, PR #8976)
---

**What.** `src/bench/campaign-mail.test.ts` fails on clean main at every seed tried (Horn Hill, Alabama 34c05193691935ba; Modena, Utah 2c89147eae23b180; East Griffin, Georgia b4fa578480553dbf): the player's gift's money record, let go once it posts, is found by dev mode's `findRecord`. The receipt's trace then no longer shows the link as folded in words. Seen: in dev mode, a receipt for a campaign gift says "The record behind this was folded once the payment posted".

**Cause.** Found in code: #7110 (merged Nov 12) lets campaign money records go at posting and has `traceNode` in src/bench/dev-trace.ts say so where `!findRecord(core, sourceRef.id)`; it was built on a main without #8108 (Nov 9), whose `Lookup.record` answers an id no store keeps from the records it names (`ID_PARTS_ENGINE`, kind `composed-id`). A donation's id names its filing and giver, so `findRecord` always answers and the folded line never shows.

**Fix.** `traceNode` treats a source record kept by no store (none found, or found only by its parts) as folded; the test checks that no store keeps the gift's record (its `findRecord` answer is `id-parts`). The test's next red is separate and stays open: where the race is a county or district one, mail sends the town only its share (`townShareOfRace`), and the test's amounts assume the town is the whole race.

**Time box.** 0.5 hours

**Rules.** One system: the trace's folded line and `findRecord` read the same lookup. An effect is a read, not a record: dev mode says in words what became of a record nobody keeps.

**Done when.** A second session runs campaign-mail.test.ts on main at GOLDEN_PATH_SEED=34c05193691935ba and a fresh seed, each naming its drawn place, and sees it pass the receipt's folded line and the kept-nowhere check; in dev mode, a campaign gift's receipt shows the folded line.

**Waits on.** Nothing.

**Files.** src/bench/dev-trace.ts, src/bench/campaign-mail.test.ts
