---
id: research-starting-amounts-record-their-statute
title: "Starting law amounts record the statute they rest on (terms.cite), so a bill amending one cites it"
lead: laws-effects
area: laws
kind: research
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
standard: 2
model: sonnet
effort: medium
root: rc9-place-facts-one-default
after:
checked: fable 2026-11-10
---

**What.** Of 1,259 starting-law amount rows (src/core2/data/laws/starting-law.json), none carries terms.cite; only the 49 local-minimum-wage-authority rows and the policy answers do, and that structured field is what Issues shows and, after laws-bill-section-cites-research-source, what a bill section amending a starting law cites. Most amount rows name a web page or a survey as their source, but some begin with the statute itself (26 U.S.C. 11(b) for the corporate income tax, 26 U.S.C. 3101(a) for the Social Security tax, Ky. Rev. Stat. 140.070 for Kentucky's inheritance tax, Md. Code, Tax-General 7-203). The owner's ruling keeps laws in force as the real starting law, citations included (OWNER-DECISIONS: realistic, not real, for every statistic unless it is in law), so each row whose law has a code section should record it as data, read from the statute, never parsed from the source text at run time.

**Cause.** Found in code: of 1,259 amount rows in src/core2/data/laws/starting-law.json none carries `terms.cite` (item count, Oct 25); only the 49 local-minimum-wage-authority rows and policy answers do.

**Fix.** Fill terms.cite with the code section and the page read for every amount row whose law has one, add a test listing rows still without one by series, and show a bill amending a starting amount citing it in a drawn place. The nearest existing script is scripts/research/check-start-law-2025.ts.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Estimate, never UNKNOWN: a row whose statute was not read keeps no citation and says so in its note, never a guessed section. One rule, all 56 places: the same field for every series, level and place, filled from each place's own code.

**Done when.** A second session opens a drawn place's starting amount and finds terms.cite with the code section and the page it was read from; a test lists the rows still without one by series; and in that place a bill amending a starting amount cites its terms.cite in the section text, shown by a test naming the place, seed and law record id.

**Waits on.** Nothing.

**Files.** src/core2/data/laws/starting-law.json, scripts/research/check-start-law-2025.ts, scripts/research/build-starting-law.py

**Notes.** Found Oct 28 01:20 by the laws-and-effects lead revising laws-bill-section-cites-research-source to the look-first audit's narrowing. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): it adds a statute citation to 1,259 starting-law rows so a bill section can cite it; the paper reads fine without.
