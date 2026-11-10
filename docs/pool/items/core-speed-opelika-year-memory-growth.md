---
id: core-speed-opelika-year-memory-growth
title: "Opelika, Alabama's year at the sample size takes about 27 minutes and its heap grows from 0.9 GB in July to 4.9 GB by October"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #5787
after:
blocked-on:
model: sonnet
effort: medium
root: rc5-full-detail-every-day
lead: speed
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** A played year of Opelika, Alabama (place 0157048, seed op1) at the sample size, buildBenchWorld two-level, once took about 27 minutes on a 4-core container, against the two-minute rule, with the heap growing from 0.9 GB in July to 4.9 GB by October. The speed lead's Oct 25 month-by-month run named a cause: from August 6 the player (born 2007) takes up a cause and joins cause groups, each member becomes a tie, every tie with the player adds the other person to the focus set for good, and every focus person's acts and reasons are kept (durableLog 16,387 records in July, 380,070 by January; focus set 47 to 327). Since then core-speed-focus-daily-recent-contact, core-speed-cause-holder-weekly-contacts and core-speed-contact-offers-grow-with-ties are done, and nothing has been re-measured. Seen: the game running, since this town's year once took about 27 minutes and 4.9 GB.

**Cause.** Needs cause. Looked at: the item's Oct 25 month-by-month (Opelika, key 0157048, seed op1: durableLog 16,387 records in July to 380,070 by January; focus set 47 to 327) against the three done focus and contact items.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. Never scan or keep a whole history every day. Replace, never layer: a growing store is fixed at its source, not trimmed after.

**Done when.** A second session, not the builder, re-runs Opelika, Alabama (place 0157048, seed op1) month by month on main in the played world and reports the year's seconds and the live heap after each month; if the heap still grows from August, it names the table that grows by file and function and this item is rewritten with Found in code and a Fix, otherwise it is proposed for dropping.

**Waits on.** Nothing. The first step is to re-run Opelika, Alabama (op1) month by month on main.

**Files.** src/core2/state.ts, src/core2/module-state.ts

**Notes.** Found working world-census-scale-closures-rise (PR #5553), whose pinned Opelika case plays 220 days because of it.

Sent back 2026-10-23 from PR #5787 (branch claude/opelika-memory): The table explicitly leaves the under-two-minute flat-heap year unmet and speed:year unrun; bind the retention slice separately so fallback completion cannot close the unfinished memory item; finish on that branch, merge main into it first.

Oct 25 (speed lead), on main 01f5cd4715, Opelika (key 0157048, seed op1), one process on a four-core container, month by month with the live heap after a full collection: the year takes about 404 s, not 27 minutes. Months one to six run 9 to 16 s with the heap 0.64 to 0.84 GB. From the month to August 18 they slow: 32, 45, 53, 55, 71 and 76 s, with the heap 1.0 to 2.2 GB. What grows is the kept log (`core.durableLog`): 16,387 records in July, 380,070 by January, about 29,000 `person.acted` and 13,000 to 57,000 `person.weighed` a month, plus 8,000 `cause.shared`. The cause: from August 6 the player (born 2007) takes up a cause and joins cause groups, and each group member gets a "met-in-group" tie with the player (16 to 61 new ties a day, `cause: met-in-group`, source `membership:organization_…`). Any tie change with the player adds the other person to `focusPersonIds` for good (state.ts, the relationship writer), so the focus set goes from 47 to 264 in that month and 327 by October, and every focus person's acts and reasons are kept. In the ninth month's profile (57.8 s), the drives engine takes 16.6 s, mostly the cause-group offers (`groupKnown` 6.15 s; filed `core-speed-cause-group-offers-per-topic`). The rest is the same runaway cause activity as Bedford (people-cause-holder-activity-calibrated, people-drives-cause-acts-pull-less). Open questions for the people area: whether meeting a group's members should tie the player to all of them at once, and whether a tie that weak makes someone a person the player deals with (the owner's Oct 11 rule on whose reasons are saved).
