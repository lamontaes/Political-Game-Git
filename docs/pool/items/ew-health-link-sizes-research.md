---
id: ew-health-link-sizes-research
title: "Size three health links from fetched research: congestion and premature births, heat and deaths, eviction and hospital visits"
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

**What.** Three outcome-web links have no researched size, so nothing moves: congestion-to-premature-births, heat-to-deaths and eviction-to-hospital-visits. Find each study, quote it, and set the size, unit and spread in the links file, so the death, birth and visit engines have something to read.

**Cause.** Found in code: src/core2/health-web.ts line 77 marks SG-EW-HEALTH-unsized-links; data/research/outcome-web/links.json keeps congestion-to-premature-births, heat-to-deaths (status size-not-set) and eviction-to-hospital-visits without a size.

**Fix.** Fetch the studies, write each size with the quoted figure, the base it applies to and the default 25% spread where the paper gives none, and say in the notes which engine would read it. Do not wire the links: that is a later item per link. The two links that find about zero (coverage-to-blood-pressure, recession-to-total-mortality) stay at size 0 with their note.

**Time box.** 4 hours for a Sonnet session.

**Rules.** Research before building: a sourced size calibrates a rule and never decides one person's outcome. Every number tagged SOURCED or ESTIMATED with its citation and spread (skill researcher).

**Done when.** A second session reads links.json and sees each of the three links with a size, unit and quoted anchor from a page that was fetched, and runs src/core2/outcome-web.test.ts in three drawn seeds, each printed, seeing it pass.

**Waits on.** The research hosts reachable from the session (an environment network setting).

**Files.** data/research/outcome-web/links.json, src/core2/health-web.ts, src/core2/data/stopgaps/ew.json
