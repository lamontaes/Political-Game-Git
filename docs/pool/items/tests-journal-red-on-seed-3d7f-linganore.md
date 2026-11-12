---
id: tests-journal-red-on-seed-3d7f-linganore
title: "Three journal tests fail on main in Linganore, Maryland (seed 3d7f19f2)"
area: words
kind: bug
priority: 2
size: M
status: claimed
standard: 2
claimed-by: claude/pool-tests-journal-red-on-seed-3d7f-linganore
pr: #8798
blocked-on:
source: added with npm run pool -- add
after:
lead: words
model: opus
effort: medium
root: design-words-machine
checked: fable 2026-11-10
claimed-at: 2026-11-11T10:29:51.199Z
branch: claude/pool-tests-journal-red-on-seed-3d7f-linganore
---

**What.** With GOLDEN_PATH_SEED=3d7f19f27037978915428ed7093ff881432c851d, journal.test.ts draws Linganore, Maryland and three tests fail on main. "Never makes a school, a workplace or a visit an entry by itself" and "never titles a chapter by a school" expect an empty journal from a fixture, but the household's own past (where the family came from, a parent's new job) is told whatever the fixture holds; #6093 rewrites both checks to the lines their fixture moments give. "Tells a relative's race by the record's result" finds no race line (line 349). CI draws a random seed, so any PR can go red on these with no change of its own. Four earlier items are folded in, each with its own done-when line in the Notes.

**Cause.** Measured: on main 556c4ae7 (Nov 11) src/director/journal.test.ts passes 18 of 18 on the item's seed (Linganore, Maryland) and on the folded seeds 071e6c46e10b194175b55a10bad86c1feaef2a2f (Parma, Missouri) and 761a6f6af12d05ad (Rio del Mar); the relative's-race failure is gone. The folded seed e9539f3aa58c00a1 (North Weeki Wachee, Florida) fails three cases, two from real journal defects and one stale pattern (the journal printed by a probe in a working copy of the test, undone after). 1. 'No look-back twice' (journal.test.ts line 117): two birth lines end the same way, 'We welcomed my son Elliott. I was 27 when it happened.' and 'My daughter Brianna was born. I was 29 when it happened.'. The hook is guarded by `closedWith` (src/director/journal.ts lines 1726 to 1745, keyed by `journalClosing`'s last two words), so the repeated 'I was N when it happened.' reaches the line by another part that skips that guard. 2. The household move reads 'When I was 13 years old, we moved back to North Weeki Wachee, Florida. I was 13 that year.': the age frame (journal.ts lines 1596 to 1610, `framedByAge`, marks `framed`) and then the look-back hook (line 1729) both say the age, because the hook does not check `framed`. The test (line 755, `/^We /`) fails on the frame. 3. The relative's move reads 'When I was 13, my brother moved away.', a correct line under the young-age frame, but the test's pattern (`/^(My \w+( \w+)?|[A-Z][a-z]+) moved aw/`) predates the frame.

**Fix.** In src/director/journal.ts: 1. Do not render the look-back hook (line 1729) for a moment already framed by age (`framed.has(moment.id)`), so a line says the person's age once. 2. Find the part that adds 'I was {age} when it happened.' to a child's birth line (render the North Weeki Wachee journal and follow the second birth line's parts) and route it through `closedWith` like the hook, so no two lines end the same way. In src/director/journal.test.ts: 3. Let the relative-move and household-move checks accept the age frame ('When I was N,' or 'When I was N years old,') before the subject, keeping every other assertion. Words review applies (src/director, the play-first lane's rule).

**Time box.** 3 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: a test that draws a place must pass in every place it can draw. Ask why: name the record behind each failure, not a flake. Never weaken the positive assertions the folded items kept (the birth line citing its record, the move line tied to the moved person).

**Done when.** A second session runs src/director/journal.test.ts on seeds 3d7f19f27037978915428ed7093ff881432c851d, 071e6c46e10b194175b55a10bad86c1feaef2a2f, e9539f3aa58c00a1 and 761a6f6af12d05ad and on two fresh seeds, each in its drawn place named in the output, and sees every run pass, and reads the North Weeki Wachee journal with each age said once and no two lines ending the same way.

**Waits on.** Nothing.

**Files.** src/director/journal.test.ts, src/director/journal.ts

**Notes.** Found by the Words session on Oct 25 while checking tests-journal-world-moments-red-on-seed-2803 on a fresh seed. The two school and visit checks are fixed by #6093 when it merges; the race check is open.

Folded in Oct 25 from tests-journal-child-birth-red-on-seed-071e-parma. Its done when: journal.test.ts passes on seed 071e6c46e10b194175b55a10bad86c1feaef2a2f (Parma, Missouri) and on two fresh seeds named in the PR body, each naming the birth record id the line cites; the birth-line assertion is not weakened.

Folded in Oct 25 from tests-journal-north-weeki-raise-and-move. Its done when: On the recorded root e9539f3aa58c00a1 and two fresh drawn places named with their seeds, journal.test.ts passes in a played world with the raise moment and household-move line traced to subject and source record IDs. A missing applicable producer or wrong subject must fail the relevant test, and the PR must explain why the original generated fixtures failed.

Folded in Oct 25 from tests-journal-rio-del-mar-move-lines. Its done when: On the recorded Rio del Mar seed 761a6f6af12d05ad and three freshly drawn places named with seeds, journal.test.ts passes with positive move-line assertions tied to the moved person and record id; a deliberately wrong subject or missing move still fails.

Merger 1, Oct26 04:50 UTC: fresh Cottage Grove WI root7e53bd5ea7be7333 reproduces the folded North Weeki raise failure on BOTH main-integrated #6113 e424fce935a449fb1d62f94798c20a1d522984bb and clean main e5c370fafa9bcba53a9a4440b1d298e4f077b261: fixture-raise has no moment and journal.test.ts:248 throws while reading channels. The named2803regression passes23/23; this fresh failure is inherited. Preserve positive subject/producer assertions when repairing the fixture, and leave the dropped North Weeki part folded here. The distinct moved-away actor now a husk is recorded as tests-world-moments-husk-mover-oak-grove.

Cause finder (Nov 11, 2026, for Fable B): reran all four seeds on main 556c4ae7; three pass, and North Weeki Wachee's three failures are traced above. The item's original relative's-race failure does not reproduce.

Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 10:29 UTC) on branch claude/pool-tests-journal-red-on-seed-3d7f-linganore.
