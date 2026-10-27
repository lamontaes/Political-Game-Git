---
id: laws-opening-past-fits-the-chosen-age
title: "The family, schooling, work and money drawn for a life fit the age the player chose"
area: people
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/laws-opening-past-chosen-age
pr: #6271
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: laws-effects
milestone: play-first
claimed-at: 2026-10-27T07:10:01.057Z
---

**What.** The owner opened the creator on its default birthday (August 6, 1954, age 70) and set August 6, 1989, so Jackson Knox is 35 on January 20, 2025. In the played world his parent Kendall Roberts is 47, only 12 years older than he is; his brother Leo is 21; Who you are lists only "Northwestern MS" and "Northwestern El Sch" (no high school, college or job); Money reads $0.00 and he has no work. "Why, every time": a defect until a record answers why (OD:190). The likeliest cause is the registered stopgap SG-PLAY-creator-age-keeps-past in src/bench/creator.ts: changing the age moves only the birth date and the generated past (schooling, work, household, family ages) stays as drawn for the original age. This item makes a chosen birthday build the family, schooling, work and money for the chosen age before Begin.

**Rules.** Serves LAW.md §11, The world on screen makes sense (Why, every time, OD:190) and LAW.md §5, Journal and the past (the player's own context is kept facts from day one, OD:122; the world has a past, OD:120). Wire to the world: parents, schooling and work come from the deep-past builder's causes. No dice: ages and histories follow the builder's calibrated causes, never a fixed roll. Estimate, never UNKNOWN: money starts from the real average with a per-world spread.

**Done when.** In a drawn place built with buildBenchWorld with the creator's birthday set to make the player 18, 35 and 70, every parent in the household is at least the child-bearing minimum that the M0-06 check uses older than the player (birth dates compared by record id); Who you are lists schooling through high school and any college the record holds, written in full school names, and a job or a recorded reason for none for the 35-year-old; Money is not $0.00 without a record that says why; a test in src/bench/creator.test.ts names the place and seed, shown by a screenshot of Who you are for the 35-year-old.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** A 35-year-old's mother is old enough to be his mother, and his Who you are shows school after school, a job or a reason, and money that makes sense.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/creator.ts, src/core2/deep-past.ts, src/core2/population.ts, src/bench/creator.test.ts, src/core2/m0-life-at-18.test.ts

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "start at 35 so you can run for offices" (his reason for the age, not a ruling on the default). No owner words on the parent's age; the CTO saw "parent · Age 47" against a 35-year-old. The family surname mismatch (Knox against Roberts) is play-stop-15-family-unexplained, and the school abbreviations are play-school-names-abbreviated. The existing stopgap rollup is play-stopgap-creator-partial-model (its in-pr claim points at the unrelated draft PR #5180). Verify the cause first (does the family come from the original age's draw?) and say what you found in the PR body. Lead: laws-effects (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
