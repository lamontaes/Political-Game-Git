---
id: words-bring-up-knew
title: "Every line a person brings up cites a record showing how the speaker learned it, in a played year"
area: words
kind: bug
priority: 3
size: S
status: done
claimed-by: story/bring-up-knew
pr: #8143
blocked-on:
lead: words
source: owner rule "nobody attributes a change to a law unless they learned of it" (AGENTS.md); coordinator unit, Nov 10
claimed-at: 2026-11-10T13:00:00.000Z
merged-at: 2026-11-10T12:41:37.066Z
seen-by: second-session-2
seen-at: 2026-11-11T02:07:10.468Z
---

**What.** src/director/bring-it-up-knew.test.ts plays a year in a drawn place and, for every person who brings a change up to someone they know, checks: the line cites a record that is a fact of the speaker's own knowledge, learned on or before the talk day; the change itself is held by the speaker (a story they read under its own key, a telling they were given under `heard:`, or a record they saw); any cause they name came from a record they hold (a blame they were told, the record they saw, a public role they know of); the telling is on record and the listener holds the change. A record a line cites is dated no later than the talk.

**Result.** No line in the drawn worlds broke the rule; nothing in src/director needed fixing. Two things the test had to learn about the engines: a listener back in the counts keeps no knowledge to be told (the two-level rule), so the listener is a person the world keeps whole; and a change can be held under any of three keys, so the check accepts the story's `news:` key, a `heard:` key or the record's own source.

**Done when.** The test passes at three seeds with the speakers and lines counted in the printed line.

**Files.** src/director/bring-it-up-knew.test.ts

**Notes.** Seen in the game (2026-11-11, second-session-2): drawn test worlds, seed cf3f252d, abb99d77, 3265d1fd, main 3d787caa: bring-it-up-knew.test.ts passed at three fresh seeds, each run one passing test
