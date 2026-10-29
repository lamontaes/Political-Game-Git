---
id: play-bench-age-read-once
title: "The bench reads a person's age through the core's one rule, not three local copies"
area: play
kind: cleanup
priority: 2
size: S
status: done
claimed-by: claude/dup-bench-age
pr: #6479
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:01:35.824Z
---

**What.** src/bench/scene.ts, story.ts and places.ts each carried an identical ageOn that subtracts birth years. The core's ageOnDate in src/core2/kernel/dates.ts is the rule the person card, family, creator and government screens already read, and it also handles a February 29 birthday in a common year. Three copies of one fact in the screens (duplicates report row M6).

**Rules.** One source per fact (owner, Oct 27): a person's age is the core's rule, so the three bench copies are deleted and their callers read ageOnDate, with no wrapper left beside it.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56, the scenes of 300 people and the player's places on day one and a year on are identical on main and on this branch by fingerprint, and grep finds no function ageOn in src/bench.

**Files.** src/bench/scene.ts, src/bench/story.ts, src/bench/places.ts

**Notes.** TODO
