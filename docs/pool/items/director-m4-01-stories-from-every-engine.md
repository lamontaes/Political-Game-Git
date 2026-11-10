---
id: director-m4-01-stories-from-every-engine
title: "M4-01 Stories from every engine"
area: director
kind: feature
priority: 3
size: L
status: open
standard: 2
claimed-by:
pr: #5336
after:
blocked-on:
lead: director
model: sonnet
effort: medium
root: design-story-director
milestone: M4
source: "docs/roadmap/later-specs-draft.md M4-01"
claimed-at:
checked: fable 2026-11-10
---

**What.** The director turns campaigns, votes, laws and money into moments: big ones interrupt, smaller ones wait or become journal lines, and callbacks come through people. Roadmap spec M4-01 is mostly built, and what remains has not been measured. (Owner: OPUS-PEOPLE.) Seen: after a campaign, a vote or a law, the people it touched have a scene or a Journal line sized to how big it was.

**Cause.** Needs cause. Looked at: `scheduleMoment` sizes interrupts by impact (`src/director/scheduling.ts`), director-civic-producers and its six parts are done, `src/director/world-moments.test.ts` and `src/director/journal.test.ts` exist. The spec's command in `docs/roadmap/features.json` (M4-01) has not been run in a drawn place to see which clauses fail (broad-event chapters, lie, favor and promise callbacks).

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session, to run the M4-01 spec in a drawn place and list the clauses that fail.

**Rules.** Spec approved by the owner Oct 12. Wire to the world: a moment comes from a record another engine wrote, by id. No dice: the director picks by what the records say. An effect is a read, not a record.

**Done when.** A second session plays a year in a drawn place (name and seed) and finds that a campaign, a vote and a law each produce moments for the people they touched, sized by impact, each with the record id that produced it. The clauses of the M4-01 spec that fail are listed with a rewritten item for each.

**Waits on.** Nothing.

**Files.** docs/roadmap/features.json, src/director/scheduling.ts, src/director/world-moments.test.ts, src/director/journal.test.ts

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.

Sent back 2026-10-20 from PR #5336 (branch claude/director-m4-01): merge conflict with main in code; merge main and resolve; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5336 (branch claude/director-m4-01): the body lacks the required Done-when evidence table mapping campaign, vote and law moment record IDs and their impact sizing; include the current played-year result rather than an obsolete gate claim; finish on that branch, merge main into it first.
