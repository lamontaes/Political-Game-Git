---
id: tests-counted-demotion-not-counted-on-return-day
title: "counted-demotion.test fails by seed: a demoted person is not in the counts on the day they return (Lookout Mountain, Georgia)"
area: core
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-tests-counted-demotion-not-counted-on-return-day
pr: #8398
blocked-on:
source: added with npm run pool -- add
after:
lead: speed
model: sonnet
effort: low
root: design-one-model-two-tiers
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:42:22.418Z
branch: claude/pool-tests-counted-demotion-not-counted-on-return-day
merged-at: 2026-11-12T09:25:33.038Z
---

**What.** The test src/core2/counted-demotion.test.ts, "demotes it after a long while out of the player's life...", fails on main 56acfdbe2 with GOLDEN_PATH_SEED=df6e76e8e58c78ac7e0fcd05f68ce334, drawn at Lookout Mountain, Georgia. Right after the household's demotion is found, expect(residentPerson(core, id)?.id).toBe(id) gets undefined for person_be97cb8c926abd3c, so the counts do not hold that person on the day the household returns to them. The Memory fix session found it on Nov 9, and the same seed fails identically on memory/full-demotion, so it is not that branch's change. A later change to the test (a888e786b7) may have touched it, so the first step is to run it again on current main.

**Cause.** Measured: `GOLDEN_PATH_SEED=df6e76e8e58c78ac7e0fcd05f68ce334 npx vitest run src/core2/counted-demotion.test.ts` still fails on main e7b97b11fd (Nov 10; Lookout Mountain, Georgia), now one line earlier: a member is of the light tier but `isDemoted` is false. A replay of the test's own steps printed why. On 2025-09-01 the monthly review returned household_d90faca9222b0715 to the counts (record demotion:household_d90faca9222b0715:2025-09-01), and on the same day the counted moves' month picked that household to leave: record move:out:household_d90faca9222b0715:2025-09-01, to the rest of Georgia, two people, reasons a life-stage pull of 0.04 against an owner's hold of 1.21 (its group owed movers and it was first in the group's order). Both members (person_be97cb8c926abd3c and person_be97cc8c926abeef) ended the day alive, of the light tier, at the destination's place and in no counted record. Found in code: the test (src/core2/counted-demotion.test.ts, lines 91 to 96) checks on the return day that every member is held by the counts, and only looks for a move out much later (line 129). Both engines run their month on the 1st, the review first, so a household can return and leave in one day. Nothing is lost or wrong in the records; the test's order is.

**Fix.** In the test, look for the household's move out (the lookup now at line 129) straight after the demotion is found. When the counted moves' record shows it left on the return day, check that day's members as people who moved away: of the light tier, at the place the move names, with the move's record id printed, and skip the checks that need them in the counts. Otherwise keep every check as it is. No engine changes: a household that has just returned to the counts may be the next in its group to move.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One model, two tiers (owner, Oct 14): a person returned to the counts must be held by the counted record under their own id from the day they return, as every engine reads them there. One rule, all 56 places: the fix is proven on the failing seed and on fresh draws from all 56 places, never by naming a place. Ask why: name the person and the record.

**Done when.** A second session runs src/core2/counted-demotion.test.ts on GOLDEN_PATH_SEED=df6e76e8e58c78ac7e0fcd05f68ce334 in Lookout Mountain, Georgia and on 10 fresh drawn places and sees every run pass, with the Lookout Mountain run printing the move's record id. The test still fails when a member is in neither the counts nor a move record.

**Waits on.** Nothing.

**Files.** src/core2/counted-demotion.test.ts

**Notes.** TODO

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:42 UTC) on branch claude/pool-tests-counted-demotion-not-counted-on-return-day.
