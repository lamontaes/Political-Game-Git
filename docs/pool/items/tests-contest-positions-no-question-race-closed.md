---
id: tests-contest-positions-no-question-race-closed
title: "The no-question town case fails when the only filing it saw was for a race already held (Derby Line, Vermont)"
area: elections
lead: laws-effects
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/contest-positions-race-closed
pr: #6361
blocked-on:
source: "Merger 7 on #6322, Oct 27; split from tests-contest-positions-cases-fail-on-drawn-places by the per-unit rule (owner, Oct 27)"
claimed-at: 2026-10-27T16:55:47.000Z
---

**What.** The no-question town case in `src/core2/contest-positions.test.ts` failed 1 of 10 runs, in Derby Line, Vermont (5017500), with "no campaign event choice for filing:contest:seat:gus2025:135935:council:0:2025-03-04". That is a town meeting race filed and held between two of the case's 50-day looks, so its campaign offered no event any more. The case then kept that filing, because it ranked a town filing above a filing whose campaign still offered an event shut on price. A filing whose race is over offers no event, which is a real world state the case must accept.

**Rules.** Never skip, disable or quarantine a case, and never pin a seed. One rule, all 56 places: a place where every race seen was already held is passed over and named, as places with no council or no local filing already are.

**Done when.** The case prefers a filing whose campaign still offers an event, passes over and names a place where none does, can replay a named place by key and place seed, and the test passes when replayed on Derby Line, Vermont and on two fresh seeds, each drawn place named in the PR body.

**Time box.** 1 hour.

**Files.** src/core2/contest-positions.test.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27. The other failure Merger 7 saw (Valdez, Alaska) stays on tests-contest-positions-cases-fail-on-drawn-places.
