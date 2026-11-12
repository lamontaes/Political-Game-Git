---
id: laws-reach-rows-stale-as-people-age
title: "Law reach rows chosen by age or a child in the home are written once and never end or open as people age"
area: laws
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-laws-reach-rows-stale-as-people-age
pr: #8576
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-11T04:41:52.247Z
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
branch: claude/pool-laws-reach-rows-stale-as-people-age
---

**What.** A law's reach rows for a person are written when the law takes effect and stay as they were. A row chosen by age or by a child in the home (the child access prevention storage duty, concealed carry age, juvenile age) is never ended when the last child turns 18 and never opened for a household that gains a child or an adult who turns of age. Measured on the household-firearms seed 2724fc27c0417f7c: the adults of household_024d52d706dd18ce keep a storage duty the day after their youngest member turned 18.

**Cause.** Found in code: `targetsOf` and `personMatches` in src/core2/law-reach/group-a-records.ts (lines 322 and 410) choose people by age and household when a law takes effect, and no code in src/core2/law-reach re-evaluates them at a birthday, a birth or a move, so rows chosen by age or a child in the home go stale. Seen on the household-firearms seed 2724fc27c0417f7c: household_024d52d706dd18ce kept a storage duty after its youngest turned 18 (its test file has since been deleted).

**Fix.** Open and end age-gated rows on the birthday, birth or move event (not a monthly scan), deciding whether the law is in force independently of its rows so an active law with no eligible people can gain its first row.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Sliding scales and causes: a row opens or ends from a cause, the record of a birth, a birthday or a move, never on a schedule. An effect is a read: the engines that read the rows must see the household as it is now. One model, two tiers: counted households follow the same rule as full people, times their count.

**Done when.** A second session, not the builder, plays a year in a drawn place (place and seed named) and sees: a person who turns 18 gains the age-gated rows on their birthday, and the adults of a household whose last child turns 18 have their storage duty row ended on that date, each named by row id. A test in src/core2/law-reach-aging.test.ts (new) checks the open set against the household records on a date after the law's effective date. Nothing shows on screen yet; Politics > Issues and Government is where it would show.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-a-records.ts, src/core2/law-reach/group-a.ts, src/core2/firearm-ownership.ts, src/core2/law-reach-aging.test.ts (new)

**Notes.** TODO

Sent back 2026-10-20 from PR #5403 (branch claude/reach-stale): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5403 (branch claude/reach-stale): src/core2/law-reach/group-a-records.ts:588 returns when open.length is zero, treating an active law with no eligible people as repealed. Its refresh then stops forever, so a later birthday or birth can never add the first eligible row. Determine whether the law is still in force independently of its rows and add that empty-to-eligible regression. Also, the first-of-month refresh does not prove the items required eligibility change on the actual birthday or household-change date; retain named row-id evidence for that acceptance.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5403 (branch claude/reach-stale): The in-force/empty-row repair fixes that part of the earlier return. src/core2/law-reach/group-a-records.ts scheduleRefresh still sets the next month to day 1, and the new law-reach-aging.test.ts explicitly waits until that later refresh. The item Rules require a birthday, birth or household-change cause, never a schedule, and Done when requires the named age-gated row and child-at-home duty to change on the actual date. The monthly scan and delayed-row proof do not meet that acceptance. Preserve the governing-law fix, implement and prove the change on its cause date, and reconcile the storage-duty proof with its current owning public-safety engine rather than dropping the requirement.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5403 (branch claude/reach-stale): Normal main integration conflicts in src/core2/law-reach/group-a-records.ts; resolve code and rerun exact-date birthday and household refresh evidence; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5403 (branch claude/reach-stale): The household-event refresh still skips active laws with zero rows, the birthday witness can be empty, and the required age-18 and current storage-duty proofs are not supplied; finish on that branch, merge main into it first.

Merger 1 recheck, 2026-10-26: PR #5397 at16924210760bb9670a22b0c990b859b5965fe0fe still fails current-main integration: src/core2/household-firearms.test.ts is deleted on main but modified on the branch, and src/core2/law-reach/group-a-records.ts has a content conflict. Merge aborted; no deleted test restored and no code conflict hand-merged. The existing code-conflict return remains applicable; no duplicate PR comment or completed gate is claimed. Finish on claude/reach-stale-causes and integrate current main before validation.

Released (2026-11-11): read the code: applyRecords/writeRows (law-reach/group-a-records.ts) only run on law-took-effect; there is no birthday or birth event kind and no calendar hook to re-evaluate a person's age-gated rows, so it needs a per-person scheduled check at the threshold birthday (and on birth, move and a child's 18th birthday) plus ending rows in writeRows; not started, 6-hour design. Continue on branch claude/pool-laws-reach-rows-stale-as-people-age and pull request #5403.
