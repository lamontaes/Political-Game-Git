---
id: web-research-rent-burden-steeper
title: "Find the steeper slope of homelessness against rent burden past 32 percent"
area: world
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "stand-in triage of the web register, Nov 10 (docs/stopgaps/triage-2026-11-10/web.md)"
claimed-at:
after:
standard: 2
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
lead: laws-effects
---

**What.** Homelessness rises with rent burden from 22 percent, and the research says faster past 32 percent, but the steeper part's slope is not set, so the effect does not steepen (SG-WEB-rent-burden-steeper-past-32).

**Cause.** Found in code: data/research/outcome-web/links.json line 1907, `steeperExtraSize: null`, read by src/core2/outcome-web-model.ts line 414 (`link.shape.steeperExtraSize ?? 0`). Colburn and Aldern 2022 give the 22 and 32 percent thresholds in charts only; GAO-20-433 gives a rent-level association and no burden-band slope.

**Fix.** Read the steeper slope from Colburn and Aldern 2022 (Homelessness Is a Housing Problem, UC Press) chapter data or its replication files, fetch and quote the page, set `steeperExtraSize` and its range, tagged SOURCED or ESTIMATED with the spread. If no slope can be derived, write that finding in the link's notes and keep the flat slope as a marked estimate.

**Time box.** 4 hours.

**Rules.** Research before building. Sliding scale: the extra slope applies above 32 with no jump.

**Done when.** `steeperExtraSize` is set from a quoted source or the no-slope finding is written, the outcome-web tests pass, and a second session, in a drawn place and seed it chose (named) with a rent burden above 32 percent, sees the web's homelessness factor rise faster than below 32, and reads the quoted page and finds the number matches.

**Waits on.** Nothing.

**Files.** data/research/outcome-web/links.json, src/core2/outcome-web-model.ts, src/core2/data/stopgaps/web.json
