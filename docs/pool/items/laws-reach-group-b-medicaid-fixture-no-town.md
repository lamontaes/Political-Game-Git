---
id: laws-reach-group-b-medicaid-fixture-no-town
title: "law-reach-group-b Medicaid fixture finds no town with an employed adult and Medicaid in forty draws"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr: #8414
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc2-done-from-records
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-laws-reach-group-b-medicaid-fixture-no-town
---

**What.** The test 'law reach, group B: Medicaid expansion and its work requirement' in src/core2/law-reach-group-b.test.ts throws 'no town with an employed adult and medicaid in forty draws' at its build helper (line 239). It fails the same way on clean main with GOLDEN_PATH_SEED=ce6921c4ecf8223891aef22043adad38db2ca4866c2a8df959c7d4dc5e98baab, found by Merger 4 on Oct 27 while checking PR 6339. Forty drawn towns had no employed adult with Medicaid, so either the fixture's need changed with a recent engine merge or the draw is too narrow. Guards: the Medicaid expansion and its work requirement reach a person's coverage in any town the player is dealt.

**Cause.** Found in code: src/core2/law-reach-group-b.test.ts, in its build helper, picks the player as the first employed adult by id (lines 139 to 142) and collapses the world to two levels (`collapseToTwoLevels`, line 149), which leaves only the player's household and circle as named people. For the Medicaid need it then keeps only named residents the two questions cover (`covers`, lines 162 to 165, the filter on `r.named`; a named resident is a full person, src/core2/law-reach/group-b-people.ts line 74) and redraws the place when either list is empty (lines 186 to 190). So a place passes only when one of the handful of named people happens to sit in the expansion's income band and one in the work requirement's reach, and forty draws can all miss. The towns do hold such adults among the counted residents; the fixture never makes one of them a named person. Read, not re-run: seed ce6921c4ecf8223891aef22043adad38db2ca4866c2a8df959c7d4dc5e98baab was not replayed on today's main.

**Fix.** First print, for that seed's forty places, how many named adults each holds and how many residents (named or counted) each question covers, to confirm the reading. Then, when the need is `medicaid`, choose the player from the people the questions cover: build the place once, take from `selectResidents` the id of a resident the expansion covers and the work requirement reaches (named or counted), and build the same place again with that person as the player, so they and their household are named. Redraw only a place where no resident at all is covered, and name each place passed over with its counts. Change no assertion and no engine code.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice; the draw stays over all 56 places and the test must not be narrowed to a pinned place to pass.

**Done when.** A second session, not the fixer, runs src/core2/law-reach-group-b.test.ts on seed ce6921c4ecf8223891aef22043adad38db2ca4866c2a8df959c7d4dc5e98baab and on two fresh drawn places (each named with its seed), built with buildBenchWorld, and sees it pass without a pinned place; the PR names the cause of the empty draw by file and line.

**Waits on.** Nothing.

**Files.** src/core2/law-reach-group-b.test.ts

**Notes.** Found Oct 27 by Merger 4; red on clean main with the seed above.

**Notes (Fable's check, Nov 10).** How to find the cause: Read why forty drawn towns hold no employed Medicaid adult (the coverage record or the opening changed), fix at that, and never pin a place.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:03 UTC) on branch claude/pool-laws-reach-group-b-medicaid-fixture-no-town.

Released by next (2026-11-11): no push to claude/pool-laws-reach-group-b-medicaid-fixture-no-town since 2026-11-11 01:03 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-laws-reach-group-b-medicaid-fixture-no-town and pull request #8414.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 07:06 UTC) on branch claude/pool-laws-reach-group-b-medicaid-fixture-no-town.

Released (2026-11-11): The Medicaid test passes on the named seed (26 of 32 in the file pass); six other tests in law-reach-group-b.test.ts fail on that seed and are separate items; see the note on #8414. Continue on branch claude/pool-laws-reach-group-b-medicaid-fixture-no-town and pull request #8414.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 07:10 UTC) on branch claude/pool-laws-reach-group-b-medicaid-fixture-no-town.

Released by next (2026-11-13): no push to claude/pool-laws-reach-group-b-medicaid-fixture-no-town since 2026-11-11 01:03 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-laws-reach-group-b-medicaid-fixture-no-town and pull request #8414.
