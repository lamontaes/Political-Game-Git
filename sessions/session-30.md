# Session 30 — Upbringing, families, outfits, placeholders

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
Finish the decided design items and remove stand-in values.

## Milestones
1. #3049 upbringing (approved): unrecorded siblings and pay start from the national distribution with a per-world spread, labeled estimated; then reaching-out-goals, the journey's remote contact, practical-life-journey.
2. #3019 BG-83 (approved): families weighted toward the Census two-parent share. #3043 Congress principle rows (approved).
3. #2981 outfits: rebase onto personDayRecipe, reapply no-shared-outfit (SCREEN).
4. Placeholders: POOL PH-* rows; close #2692–#2701 (relabels without sources).

## Endpoint
#3049, #3019, #3043 merged-ready, #2981 READY with shots, ≥10 placeholder rows done.

## CTO instructions and findings (do these)
- BUG from the owner's grading batch: parents and grandparents with impossible ages — a grandmother aged 121 for a 52-year-old player (Isleta, NM), a mother aged 104 for a 70-year-old (Enfield, NC). Family members must be alive only at real ages; older relatives are dead or never generated. Fix where family members are generated/aged and add a test over 56 random places.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
