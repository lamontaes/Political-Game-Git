---
id: words-civic-clerk-fill-seed-red
title: "The filing-office clerk fill carries an end date on some drawn places"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-words-civic-clerk-fill-seed-red
pr: #8607
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:55:30.754Z
branch: claude/pool-words-civic-clerk-fill-seed-red
---

**What.** On Plandome Heights, New York (place 3658486, GOLDEN_PATH_SEED=f38fd92f521cda30), src/director/civic-roles.test.ts 'fills the clerk with the person the filing office's records name' fails on clean main. The clerk the fill returns carries an end date of 2025-02-19, where the test expects a sitting clerk with no end date. Find whether the fill reads an ended clerk term or the test reads the wrong field. Fix it at the root, not in the test.

**Cause.** Found in code: src/director/civic-roles.test.ts line 193 expects `job?.endsAt` to be undefined for the clerk; src/core2/modules/filing-clerk.ts localClerkFor (line 142, appointment branch) picks a town appointment when its holder is alive (`living(...)`), without checking that the clerk's payroll job has not ended. Seen at Plandome Heights, New York (place 3658486), GOLDEN_PATH_SEED=f38fd92f521cda30: the job ended 2025-02-19. Not run.

**Fix.** In localClerkFor take the appointment only if it is still in force on the date (its job has not ended), as the filing office's records say; fix at the root in filing-clerk.ts, not in the test.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Ask why: the clerk is the person the filing office's records name on the scene's date. One rule, all 56 places: the test passes on any drawn place and seed.

**Done when.** A second session runs src/director/civic-roles.test.ts at Plandome Heights, New York (GOLDEN_PATH_SEED=f38fd92f521cda30) and on three more places drawn from all 56 with seeds it chose, each named; it passes and the clerk the fill returns has a job with no end date on the scene's date.

**Waits on.** Nothing.

**Files.** src/director/civic-roles.ts, src/director/civic-roles.test.ts, src/core2/modules/filing-clerk.ts

**Notes.** TODO

Released (2026-11-11): Cause differs on main 67fe8ebbf1: at GOLDEN_PATH_SEED=f38fd92f521cda30 (Plandome Heights, New York, 3658486) src/director/civic-roles.test.ts 'fills the clerk with the person the filing office's records name' now fails earlier, at its first line (civic-roles.test.ts:163, expect(contests.length).toBeGreaterThan(0): expected 0 to be greater than 0), because openContests holds no open contest in that world at the test's date; the clerk's ended payroll job (endsAt 2025-02-19) the item names is never reached. So localClerkFor cannot be judged from this seed; the failure is the test's setup finding no open contest in a drawn place, and needs the item re-written around that. Continue on branch claude/pool-words-civic-clerk-fill-seed-red.
