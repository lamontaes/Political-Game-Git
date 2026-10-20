---
id: macro-mortgage-rate-fhfa-transition-index
title: "After May 2019 the 30-year mortgage rate comes from Freddie Mac's survey, which the CTO excluded: use FHFA's own MIRS Transition Index"
area: world
kind: research
priority: 2
size: S
status: blocked
claimed-by: claude/fhfa-mortgage-index
pr:
blocked-on: owner-decision: may FHFA's MIRS Transition Index (not a replacement for PMMS) stand in for the excluded Freddie Mac survey after 2019
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:11:00.147Z
---

**What.** src/core2/data/macro/history.json cites 'Freddie Mac Primary Mortgage Market Survey after 2019' for mortgage30Pct, although the CTO ruling on #3959 excluded Freddie Mac's survey and stopgap SG-WORLD-macro-mortgage-spread says the post-April-2019 rate is the 10-year Treasury plus a spread. FHFA publishes a government monthly series, the MIRS Transition Index (June 2019 onward, 6.48 for September 2026, published the last Thursday of each month) at https://www.fhfa.gov/data/mirs; the host is reachable from a cloud session. Replace the post-2019 mortgage30Pct values with that index, cite FHFA, and resolve the stopgap row. The index is FHFA's adjusted version of Freddie Mac's survey, so whether it is an acceptable government series is the CTO's call: build it, register an owner-decision stopgap, and flag it.

**Rules.** No dice. Numbers live in the parameter table or a cited data file; cite publisher, year and URL. Look before you ask: read docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md for the #3959 ruling first and quote it.

**Done when.** history.json carries the FHFA index for every month from 2019-06 with the citation; macro-model.ts reads no spread for a month the index covers; a macro test names the months where the old and new rates differ and by how much; the stopgap row is resolved or turned into an owner-decision with the question in OWNER-DECISIONS.md.

**Files.** src/core2/data/macro/history.json, src/core2/macro-model.ts, src/core2/data/stopgaps.json, docs/coordination/OWNER-DECISIONS.md

**Notes.** TODO

Checked Oct 20 before building: the page at https://www.fhfa.gov/data/mirs lists the index monthly (September 2026 6.48, August 6.51, July 6.35; history.json's PMMS-based mortgage30Pct for 2026-09 is 6.86, so the two differ by about 0.4 point). FHFA states the index is its own adjusted version of Freddie Mac's survey, "is not a replacement for PMMS" and is "intended to be used in lieu of the discontinued [ARM] index for currently outstanding loans, and not as a reference rate on newly-originated adjustable-rate mortgages". The game wants the level of new 30-year fixed rates, which the index is not meant to be, and it would move every post-2019 rate down by 0.3 to 0.4 point. That is a ruling for the CTO or the owner (whether the index may stand in for the excluded survey), not a data fetch. Not built.
