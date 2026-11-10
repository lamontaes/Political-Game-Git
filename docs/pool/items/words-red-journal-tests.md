---
id: words-red-journal-tests
title: "Fix the journal tests that are red on main by seed: a local address needs the offices engine, three tests assume the drawn world holds a watched person with the relatives they need, and two assume a line starts on its subject"
area: words
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: story/red-journal-tests
pr: 8119
blocked-on:
lead: words
source: src/director/journal.test.ts and journal-story.test.ts red on clean main at seeds 11 and 222 (Nov 10)
claimed-at: 2026-11-10T08:00:00.000Z
---

**What.** (1) Writer: `speakerOf` in src/director/local-address.ts read the town's seats without checking that the offices engine is installed, so a day on which a local address fell due threw "Module has no registered state" in any core that lacks it. (2) Test assumption: journal.test.ts took its coworker, relative-moving and household-move people only from the director's watched set, which a drawn place may leave without them; it now falls back to any full person and has the director watch them. (3) Test assumption: journal.test.ts expected a death and a filing line to start on the subject, and a line may open on the time since the one before ("One month on,"). (4) Test assumption: journal-story.test.ts counted a partner's livelihood line as the player's own spell because a time link cites the earlier line's records; it now counts a line as telling a spell by its own moment ids.

**Done when.** journal.test.ts and journal-story.test.ts pass at seeds 11, 222 and 3333.

**Files.** src/director/local-address.ts, src/director/journal.test.ts, src/director/journal-story.test.ts
