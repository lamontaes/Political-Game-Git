---
id: research-unemployment-claim-take-up
title: "Nearly every laid-off worker files for unemployment in the model; real take-up is 70 to 80 percent"
area: world
kind: research
priority: 3
size: S
status: done
claimed-by: claude/traits-ui-take-up
pr: #6681
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T18:24:54.894Z
---

**What.** benefitsFileBase (0.6) makes filing a claim nearly certain: skipping needs a lean at or below -(0.6 + stress), and observed leans run about -0.3 to +1, so no claim in eight played years was skipped. Real take-up among eligible unemployed is about 70 to 80 percent. Source the take-up rate and set the base so the played share matches it, with temperament and the claimant's circumstances deciding who skips.

**Rules.** Research before building; no dice: who skips comes from the claimant's case and temperament, never a roll.

**Done when.** benefitsFileBase is ESTIMATED from a quoted take-up study and a played year in a drawn place, seed named, shows a take-up share inside the study's band, with skipped claims' decision records named.

**Files.** src/core2/jobs-benefits.ts, src/core2/data/parameters.json

**Notes.** Filed Oct 24 by the traits lead from the hardship-coping work. Found Oct 26 by the traits lead's research helper (each read in fetched text): take-up among eligible unemployed 70.7% average over 1977-87 (Blank & Card, NBER WP 2871, https://www.nber.org/system/files/working_papers/w2871/w2871.pdf; 83.6% among PSID self-reported eligibles 1980-82); 77% over 1989-2012 (Auray, Fuller & Lkhagvasuren, SED 2018, https://red-files-public.s3.amazonaws.com/meetpapers/2018/paper_496.pdf); 0.734 mean, SD 0.201, over 714 state-years 2002-15 (Auray & Fuller, Quantitative Economics 2020, Table 1); 55% of eligible white and 42% of eligible Black job losers in SIPP 1986-2014 (Kuka & Stuart, NBER WP 29595); about 45% of eligible workers in Washington 2005-13 (Lachowska, Sorkin & Woodbury); Anderson & Meyer (NBER WP 4787) cite a literature range of 0.55 to 0.83. Benefit size: a 10% higher weekly benefit raises take-up 4.7% (elasticity 0.467, 95% CI 0.382 to 0.553; McQuillan & Moore, Washington ESD working paper, Nov 2025, https://esd.wa.gov/media/pdf/4240/endogenoustake-upuibenefts-working-paper-nov2025pdf); Anderson & Meyer report 0.46 to 0.78 and little effect of potential duration. Suggested build: a claim case that rises with the log of the weekly benefit against the lost pay (a logit slope near 0.47 / (1 - take-up)), with the base set so a played year's take-up sits in 0.55 to 0.80.

Oct 29 (CTO): set done; PR #6681 merged (the done flip failed while branch protection refused the flip job's push).
