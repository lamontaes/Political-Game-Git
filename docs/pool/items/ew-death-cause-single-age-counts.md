---
id: ew-death-cause-single-age-counts
title: "Source single-age firearm and overdose deaths so the child access law reaches young children and ages 20 to 24 split from the teen band"
area: people
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage of the ew register, Nov 10, 2026
lead: laws-effects
standard: 2
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** Every death takes a cause from sourced shares by age, but the source gives firearm deaths for ages 10 to 24 as one band and nothing under 10, so a child access law reaches no toddler and ages 20 to 24 take the teen band's share. Replace the bands with one-year counts from CDC WONDER (underlying cause of death, ages 0 to 24).

**Cause.** Found in code: src/core2/health-web.ts line 97 marks SG-EW-HEALTH-death-cause; src/core2/data/health/death-causes.json holds the firearm and overdose bands (its citation says nothing is reported under age 10), and src/core2/death-cause.ts assigns causes from them.

**Fix.** Fetch the single-age counts, write them into src/core2/data/health/death-causes.json as bands of one year with the citation and spread, tag them SOURCED or ESTIMATED, and let src/core2/death-cause.ts read them unchanged. Remove the stand-in's text that no longer holds. Counted people still have no substance-use condition (births-counted.ts); that stays a marked estimate.

**Time box.** 4 hours for a Sonnet session.

**Rules.** Research before building: real counts check the simulation and never decide one death. Estimate, never UNKNOWN: a cell with no count takes the nearest sourced age with its spread marked.

**Done when.** A second session reads death-causes.json and sees one-year firearm and overdose bands for ages 0 to 24 with fetched citations, runs src/core2/death-cause.test.ts in three drawn places and seeds (each printed), and sees a firearm death under age 10 carry its cause in a played year in a place the builder did not choose.

**Waits on.** CDC WONDER reachable from the session (an environment network setting).

**Files.** src/core2/data/health/death-causes.json, src/core2/death-cause.ts, src/core2/health-web.ts, src/core2/data/stopgaps/ew.json
