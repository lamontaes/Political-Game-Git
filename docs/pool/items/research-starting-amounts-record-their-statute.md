---
id: research-starting-amounts-record-their-statute
title: "Starting law amounts record the statute they rest on (terms.cite), so a bill amending one cites it"
lead: laws-effects
area: laws
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Of 1,259 starting-law amount rows (src/core2/data/laws/starting-law.json), none carries terms.cite; only the 49 local-minimum-wage-authority rows and the policy answers do, and that structured field is what Issues shows and, after laws-bill-section-cites-research-source, what a bill section amending a starting law cites. Most amount rows name a web page or a survey as their source, but some begin with the statute itself (26 U.S.C. 11(b) for the corporate income tax, 26 U.S.C. 3101(a) for the Social Security tax, Ky. Rev. Stat. 140.070 for Kentucky's inheritance tax, Md. Code, Tax-General 7-203). The owner's ruling keeps laws in force as the real starting law, citations included (OWNER-DECISIONS: realistic, not real, for every statistic unless it is in law), so each row whose law has a code section should record it as data, read from the statute, never parsed from the source text at run time.

**Rules.** Estimate, never UNKNOWN: a row whose statute was not read keeps no citation and says so in its note, never a guessed section. One rule, all 56 places: the same field for every series, level and place, filled from each place's own code.

**Done when.** Every starting amount row whose law has a code section records it in terms.cite with the page it was read from, a test lists the rows still without one by series, and in a drawn place a bill amending a starting amount cites its terms.cite in the section text, shown by a test naming the place, seed and law record id.

**Files.** src/core2/data/laws/starting-law.json, scripts/laws/starting-law-check.ts

**Notes.** Found Oct 28 01:20 by the laws-and-effects lead revising laws-bill-section-cites-research-source to the look-first audit's narrowing.
