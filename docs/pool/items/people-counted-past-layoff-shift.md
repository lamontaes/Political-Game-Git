---
id: people-counted-past-layoff-shift
title: "A counted resident's lean carries no past layoff, so counted and full residents open from different means"
area: people
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: governing
model: opus
effort: medium
source: Views thread, Nov 15 (planning SG-PEOPLE-past-views-full-people-only)
---

**What.** A full person's lean carries the shift of their own last layoff as an adult (`pastViewShifts` in src/core2/modules/views.ts, from the past-work pass's records); a counted resident's (`countedLean`) is their opening lean alone, so the two tiers open from different means and a counted resident's lean jumps when they are filled in. Registered as SG-PEOPLE-past-views-full-people-only (marker in src/core2/modules/people.ts `pastViewsOf`). Seen: Feeds: the counted ballots of every race, where counted residents vote by `countedLean`.

**Cause.** Measured: Gilliam, Missouri (2927028), world seed 53a4a04a, at the opening (Nov 15). Three routes were measured and none fits as it stands. (1) An expected value from the layoff rate does not match the full tier: the past-work pass (src/core2/past-work.ts `runPastWork`) does not draw layoffs from a hazard; it runs a race of pulls, layoffs 0.029 a quarter against quits 0.06, both reset at each new job (`begin`), so a layoff happens only where its pull outruns the quit pull (a quarter of rising unemployment, or traits that lean far to being let go). A hazard sum would give far more counted residents a recent layoff than full people have. (2) Running the pass itself for each counted adult is exact but costs 1.3 ms a person (`pastWorkFor`, timed over 100 people), about 26 seconds a year at a town of 20,000 counted adults, past the 20% speed limit. (3) The group shares the stopgap's replacement names are too thin to read: at the opening 6 of 961 full people have their whole past written, 68 any work record and 13 a layoff.

**Fix.** Design first, by the past-work pass's owner. A route the Account lead suggested (Nov 15), not a decision: run the real past-work pass once per world for one stand-in person per age band and trait group (a few hundred runs at 1.3 ms, under a second) and let every counted adult in that group read the group's result; exact in the mean and cheap, if the owner says a stand-in per group is fair to how the pass reads the year's economy. The parent's-layoff term stays out either way: a counted resident has no parent record whose lean it could pull toward.

**Time box.** 3 hours to write the design with the pass's owner, no code.

**Rules.** One model, two tiers: a counted resident's lean comes from the same rule as a full person's, times the count. Speed: no change makes a year more than 20% slower.

**Done when.** A second session, in a drawn place (place and seed named), opens counted residents as full people and sees their counted lean and their filled-in lean differ only by their own past's draw, with the group means equal within a stated spread.

**Waits on.** Nothing.

**Files.** src/core2/modules/views.ts, src/core2/past-work.ts, src/core2/modules/people.ts

**Notes.**
