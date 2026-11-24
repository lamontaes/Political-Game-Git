---
id: tests-relative-work-agrees-journal-misses-term-by-seed
title: "relative-work-agrees is red by seed: the Journal tells no line on a relative's seat"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
root: none
claimed-by:
pr:
after:
blocked-on:
lead: lives
source: "Civic roles builder, Nov 15, comparing #9538's reds against the clean Train"
model: opus
effort: medium
---

**What.** In `src/bench/relative-work-agrees.test.ts`, both cases fail on the clean Train b22cd350 at RELATIVE_WORK_SEED=2922651856da1b0a. Case b fails in Summit, Oklahoma (4071450) with "the journal tells no line on term:seat:gus2025:191259:council:4:2025-01-20". Case a fails with "no drawn place had someone at home in office". At RELATIVE_WORK_SEED=abd0c057ebae646e both failed the same way, in West MS and Dustin OK, on the clerk's and treasurer's terms. Seen: a relative sits on the council, and the card says so but the Journal does not.

**Cause.** Needs cause. Measured: the case in What fails the same way on the clean Train 892427ec at the place and seed named there; the cause is not yet traced.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Opus.

**Rules.** Ask why: the Journal's reader of a relative's term must be named by function and the rule that leaves it out.

**Done when.** A second session runs both cases at both seeds above and in a drawn place of its own, and sees the relative's office told the same on the card, in the Journal and on Travel.

**Waits on.** Nothing.

**Files.** src/bench/relative-work-agrees.test.ts

**Notes.** Filed by hand by the civic roles builder, Nov 15. The same seed is red with and without #9538. Case a's draw finding no one in office is a drawn-place-tests matter. Also red on the clean Train 892427ec at RELATIVE_WORK_SEED=023cba4074efbc5d (Snowville, Utah, the prosecutor's term).
