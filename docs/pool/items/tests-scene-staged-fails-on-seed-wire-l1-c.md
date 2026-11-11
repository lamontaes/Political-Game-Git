---
id: tests-scene-staged-fails-on-seed-wire-l1-c
title: "The director's scene test stages no scene on seed wire-l1-c"
area: director
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-tests-scene-staged-fails-on-seed-wire-l1-c
pr: #8403
after:
blocked-on:
lead: director
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:51:23.940Z
branch: claude/pool-tests-scene-staged-fails-on-seed-wire-l1-c
---

**What.** src/director/scene.test.ts 'builds each staged scene from its records, in second person, and opens a conversation' fails with 'expected 0 to be greater than 0' when GOLDEN_PATH_SEED=wire-l1-c, identically on clean main at 4732dda71c (Oct 28); its default seed scenes-a passes. The test builds its world from the seed with buildPopulation and the director module alone, so the staged-scene count depends on which past the seed draws, and on this seed no moment stages a scene. The cause is not yet traced to a record. Guards: a moment stages a scene built from records in second person; scene.test stages none on one seed.

**Cause.** Found in code: src/director/scene.test.ts, the test 'builds each staged scene from its records, in second person, and opens a conversation' (line 84), builds its world with buildPopulation and createLifeCore with only the director module and runs it to 2021-02-15 (45 days); on GOLDEN_PATH_SEED=wire-l1-c (Elmwood, Illinois) all 18 scheduled moments are past family and work facts with no staging type, so the staged count is 0 (item Notes, Oct 28).

**Fix.** Build the test's world with buildBenchWorld (every module installed), or run days until a moment stages, bounded, and name in the failure what was passed over. Do not change the seed or loosen the assertions.

**Time box.** 2 hours for one Sonnet session.

**Rules.** One rule, all 56 places: a test that claims a rule holds must hold on any seed, or say which records it needs and build them from the world. No dice: the fix is the cause in the records, not a seed change.

**Done when.** A second session runs src/director/scene.test.ts with GOLDEN_PATH_SEED=wire-l1-c and with three seeds it chose, each in a place named with its seed; every run builds at least one staged scene from its records, in second person, with an opening conversation, and a failure message names the records that were missing.

**Waits on.** Nothing.

**Files.** src/director/scene.test.ts, src/director/scheduling.ts

**Notes.** Found by wire-opening-and-home while merging main into PR #6568 (Oct 28). Read: OWNER-DECISIONS through Oct 28 05:30 UTC; searched the pool for scene.test.ts and the test's name.

Cause traced (wire-opening-and-home, Oct 28, 18:00 UTC; still fails on main after #6640): the test's world is the bare life core with only the director installed, run 45 days. On wire-l1-c (Elmwood, Illinois) all 18 scheduled moments are past family and work facts (journal lines, no staging type); no live moment happens. Ten acquaintance ties between watched people changed in the window, but none turned (no `tie:` moment), and with no world engines there are no deaths, job changes or news to stage. On scenes-a (Wendell, North Carolina) the two staged scenes are both `becoming-friends`. So the test passes only when chance turns a tie in 45 days. Not in the history or Journal engines: the fix is the test's world (buildBenchWorld, or run until a moment stages, bounded, naming what it passed over), for the director lead.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:51 UTC) on branch claude/pool-tests-scene-staged-fails-on-seed-wire-l1-c.
