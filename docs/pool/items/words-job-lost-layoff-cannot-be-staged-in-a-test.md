---
id: words-job-lost-layoff-cannot-be-staged-in-a-test
title: "A layoff cannot be staged through the engine, so the layoff telling is not played in a test"
area: director
kind: cleanup
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc2-done-from-records
source: Account lead thread S2 while carrying PR 8941, Nov 14, 2026; asked for by the Account lead
checked: S2 2026-11-14
---

**What.** The lost-job talk has a layoff telling ("{employer} let me go {when}") that is only composed, never played: the closure is staged through the business engine's `closeBusinessByChoice` in `src/director/job-lost-talk-played.test.ts`, but no act lays off one named worker. Seen: a played layoff telling at a pinned place.

**Cause.** Found in code: `src/core2/modules/jobs.ts` writes a layoff as a record decided inside the jobs engine from a firm's demand and `layoffPerQuarter` (the record kinds "layoff" and "staff-shed" near line 387); the module exports no act that ends a named worker's job for a layoff, so a test would have to write the record by hand.

**Fix.** Export one jobs-engine act that lays off a named job for a firm's reason (the same record and ledger moment the quarterly decision writes), have the quarterly decision call it, and stage a layoff through it in `job-lost-talk-played.test.ts`.

**Time box.** 2 hours, Sonnet.

**Rules.** One engine for a mechanic: the quarterly decision and the test use the same act.

**Done when.** At three drawn places (the three pinned in `job-lost-talk-played.test.ts`) a staged layoff through the act opens the layoff telling, every offered reply is answered, and the quarterly decision's own layoffs still write the same records. A second session, on main, plays a life to a layoff in a firm that cut staff and sees the relative tell it.

**Waits on.** PR 9122 on the train.

**Files.** src/core2/modules/jobs.ts, src/director/job-lost-talk-played.test.ts

**Notes.** Also needed by the Work and school scenes thread's layoff-at-work scene (Account lead, Nov 14).
