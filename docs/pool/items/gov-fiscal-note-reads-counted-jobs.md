---
id: gov-fiscal-note-reads-counted-jobs
title: "A bill's fiscal note counts the counted workers its wage floor raises, in the body's own place"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Oct 30 (review of gov-m3-01-fiscal-note-at-drafting)
lead: governing
after:
standard: 2
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-gov-fiscal-note-reads-counted-jobs
---

**What.** A wage bill's fiscal note counts only full people's open work commitments paid under the new floor. It never reads the counted jobs of the modeled wider population, so in a two-level town the note undercounts the workers and the yearly pay a raise reaches. It also walks every commitment in the world rather than the jobs in the drafting body's own place, and the note's words (town jobs paid under the new floor, no pay effect) are typed in code rather than worded by the English engine. Seen: the wage bill card's fiscal note, which counts the town's workers a raise reaches.

**Cause.** Found in code: `src/core2/modules/legislature.ts` `employerCosts` (line 740) and `costOf` (line 1652) count only full people's commitments; `countedJobsOf` in `src/core2/modules/jobs.ts` is never read there.

**Fix.** Add the counted jobs of the body's own place paid under the new floor to the note (by count and row id), restrict the commitments to the body's place, and word the note through a bill-paper bank line in `data/english/parts/bill-paper.json`, which Story writes (every line in data/english/parts/ is Story's, owner's ruling of Nov 10): send the Words line the facts the line must carry and build against the key it gives back.

**Time box.** 4 hours for one sonnet session.

**Rules.** One model, two tiers: a counted job is read by the same rule as a full person's commitment, times its count. One rule, all 56 places: the body's place comes from the bill's jurisdiction record, never a named place. No hand-written player text: the note's sentence comes from a bank (the Words session's), and the engine keeps only numbers and record ids.

**Done when.** A second session builds a world (`buildBenchWorld`, the seed it prints) in a drawn place, drafts a minimum-wage bill through `seatAct` and sees a fiscal note whose workers equal the full people's commitments plus the counted jobs (by count) in the body's place paid under the new floor, named by commitment id and counted-job row id, whose yearly pay matches the sum of the same rows, and whose words come from a bank line; a commitment in another place is not counted.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/jobs.ts, src/bench/bill-paper.test.ts, data/english/parts/bill-paper.json

**Notes.** TODO

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:24 UTC) on branch claude/pool-gov-fiscal-note-reads-counted-jobs.

Released (2026-11-11): Held by my own next loop while walking the queue; not worked (see the item's own size and Fix: M-sized or needs Story/Words lines, not started this pass). Continue on branch claude/pool-gov-fiscal-note-reads-counted-jobs.
