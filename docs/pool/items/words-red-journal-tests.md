---
id: words-red-journal-tests
title: "Fix the journal tests that are red on main by seed: a local address needs the offices engine, three tests assume the drawn world holds a watched person with the relatives they need, and two assume a line starts on its subject"
area: words
kind: bug
priority: 1
size: S
status: done
claimed-by: story/red-journal-tests
pr: #8119
blocked-on:
lead: words
source: src/director/journal.test.ts and journal-story.test.ts red on clean main at seeds 11 and 222 (Nov 10)
claimed-at: 2026-11-10T08:00:00.000Z
merged-at: 2026-11-10T07:18:33.119Z
seen-by: second-session-2
seen-at: 2026-11-11T02:58:07.088Z
---

**What.** (1) Writer: `speakerOf` in src/director/local-address.ts read the town's seats without checking that the offices engine is installed, so a day on which a local address fell due threw "Module has no registered state" in any core that lacks it. (2) Test assumption: journal.test.ts took its coworker, relative-moving and household-move people only from the director's watched set, which a drawn place may leave without them; it now falls back to any full person and has the director watch them. (3) Test assumption: journal.test.ts expected a death and a filing line to start on the subject, and a line may open on the time since the one before ("One month on,"). (4) Test assumption: journal-story.test.ts counted a partner's livelihood line as the player's own spell because a time link cites the earlier line's records; it now counts a line as telling a spell by its own moment ids.

**Done when.** journal.test.ts and journal-story.test.ts pass at seeds 11, 222 and 3333.

**Files.** src/director/local-address.ts, src/director/journal.test.ts, src/director/journal-story.test.ts

**Notes.** Seen in the game (2026-11-11, second-session-2): drawn test worlds, seeds 11, 222, 3333, seed 11, 222, 3333, main 67947ae8: journal.test.ts and journal-story.test.ts passed 22 of 22 at seeds 11, 222 and 3333, though seed 3333 took about 18 minutes
