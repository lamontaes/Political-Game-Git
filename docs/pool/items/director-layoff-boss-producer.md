---
id: director-layoff-boss-producer
title: "A layoff writes the boss as the counterpart on the lost-job moment, and an eviction names the landlord, so the layoff and eviction-notice scenes can fire"
area: world
kind: wiring
priority: 2
size: M
status: done
claimed-by: claude/layoff-boss-producer
pr: #4812
blocked-on:
after: director-civic-producers-household
source: added with npm run pool -- add
claimed-at: 2026-10-16T19:47:45.599Z
---

**What.** The director's `layoff` and `eviction-notice` scene types wait on producers (`awaitingProducer` in `src/director/data/situation-types.json`) because the records they read name no counterpart: a lost job's moment (`money:job-ended`) has none when it is the worker's own, and an eviction's moment (`feeling:event:housing.eviction`) names no landlord. Make the jobs engine's layoff (`layOff` in `src/core2/modules/jobs.ts`, which already records `decidedBy`) and the housing engine's eviction carry the decider as the counterpart of the moment, then replace the `awaitingProducer` causes with matches. `director-civic-producers-household` made both types yield to the household's news-arrives scene, so one cause stages one scene.

**Rules.** No dice; the chain is the acceptance (cause record to scene to journal line); one rule, all 56 places; an effect is a read (the director reads the counterpart when it binds the boss).

**Done when.** In a one-year run of a drawn place, a worker with no household laid off gets a layoff scene at work with the boss named, traced to the layoff record id; a worker with a household still gets the one family scene at home. A test in `src/director/director.test.ts` covers both.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/housing.ts, src/director/data/situation-types.json

**Notes.** Found while building director-civic-producers-household: a matching record for `layoff` would also match the household's news (`money:job-ended`, counterpart none means the worker's own loss) and its other cause, counterpart some, means a relative's loss, so the boss cannot ride on that label.

Looked at Oct 16 (claude, released, not built): the `layoff` and `eviction-notice` types in `src/director/data/situation-types.json` each name their cause by `causeRecord` and `awaitingProducer`, and the director builds moments by diffing state in `src/director/ledger.ts` (the money block near line 905), where a lost job's counterpart list is empty for the worker's own loss and holds the member's id for a relative's. Giving the worker's own loss the boss as a counterpart changes the label the household news-arrives scene matches (counterpart none), so the household cause and its `director.test.ts` cases must change in the same step, and the ledger and situation catalog belong to the Words line. Build it as one change across the jobs engine's `work.job-lost` event (add the decider as a witness when a full person), a new ledger label for a decided layoff, the layoff cause match, and the household cause's guard, then re-run the director and world-moments tests; it is a Words-line session, not a world one.
