---
id: words-paper-side-stories
title: "The town paper prints side stories: one-line briefs from the town's records (police log, school results, honors, new businesses)"
area: play
kind: feature
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-words-paper-side-stories
pr: #8439
blocked-on:
source: added with npm run pool -- add
after:
lead: words
standard: 2
model: sonnet
effort: low
root: rc4-hand-written-words
checked: fable 2026-11-10
claimed-at: 2026-11-11T01:23:09.086Z
branch: claude/pool-words-paper-side-stories
---

**What.** The owner asked on Oct 29 for side stories on the newspaper for realism: a fourth car stolen when crime is up, someone opening a business, a local child winning a spelling bee, Division I recruits on the high school team. They are a line or two and not clickable. The CTO ruled (OWNER-DECISIONS Oct 29 17:40) that the one press desk prints them from records it already sees, chosen by cause, never padded. Wording exists (#6800, brief: true); the school honors record is on words/school-honors; the wire lacks the police log and the school results, and the desk has no briefs column.

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, Oct 29 17:40 (the one press desk prints one-line briefs from records it already sees, chosen by cause, never padded). Briefs are built (src/core2/press-desk.ts, src/bench/printed-words.ts); the done-when's test that fails when a brief kind is on the wire with space and nothing printed is not in src/bench/printed-words.test.ts.

**Fix.** Add that test, and run a played year in three drawn places to check that police log, school honor and new-business briefs print monthly where the records exist; close the item if they do.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every brief reads a record the world keeps (a crime.victimized event, a school measures row, a school.honor event, an organization.founded event), never a typed item. No dice: the desk picks briefs by its own score (proximity, reader care, people involved) up to the outlet's space, and prints none when the town recorded none. One engine: the same desk and printItem, no second press.

**Done when.** A second session, not the builder, plays a year in three drawn places (named with seeds) and sees the town paper print briefs in each month its records hold one (the police log, a school honor, a new business), each with its source record id; the new test in src/bench/printed-words.test.ts fails when a brief kind is on the wire, the desk had space and nothing printed.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/core2/press-desk.ts, src/core2/data/press/parameters.json, src/core2/school-honors.ts, src/core2/modules/school.ts, src/bench/printed-words.ts, src/bench/printed-words.test.ts

**Notes.** lead: words. Owner, Oct 29, to the words session. Ruling: OWNER-DECISIONS Oct 29 17:40 UTC.

Words handoff, Nov 2 02:50 UTC (the account at its weekly limit): branch words/press-briefs, head 0b8354b84b, fully merged (#6824 and follow-ups). Next step: confirm the done-when's test exists on main (a brief kind on the wire with space and nothing printed fails) and set the item done, or write that test.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:23 UTC) on branch claude/pool-words-paper-side-stories.
