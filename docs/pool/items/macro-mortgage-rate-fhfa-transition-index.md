---
id: macro-mortgage-rate-fhfa-transition-index
title: "After May 2019 the 30-year mortgage rate comes from Freddie Mac's survey, which the CTO excluded: use FHFA's own MIRS Transition Index"
area: world
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** src/core2/data/macro/history.json cites Freddie Mac's survey for mortgage30Pct after 2019, but the CTO excluded that survey (ruling on #3959) and stopgap SG-WORLD-macro-mortgage-spread says the post-April-2019 rate is the 10-year Treasury plus a spread. Replace every month from 2019-06 onward with FHFA's own government series, the Mortgage Interest Rate Survey Transition Index (https://www.fhfa.gov/data/mirs, 6.48 for September 2026), so that mortgageAt in src/core2/macro-model.ts reads a published figure for any month the index covers and adds no spread. Cite FHFA in the file's source block, and mark the series ESTIMATED because FHFA says the index is its adjusted version of Freddie Mac's survey and not a rate for new loans (it runs about 0.3 to 0.4 point below the old values). Register an owner-decision stopgap for that caveat and resolve SG-WORLD-macro-mortgage-spread.

**Rules.** No dice: the rate is a published series, and nothing rolls a monthly move. An effect is a read: housing.ts and the credit pass already read mortgage30Pct, so the lower rate must show in a mortgage payment a household pays. Estimate, never UNKNOWN: months the index has not yet published keep the Treasury-plus-spread fallback, marked as an estimate with its source. Look before you ask: the acting CTO ruled Oct 20 (OWNER-DECISIONS.md, pool rulings) that the index stands in from 2019-06, tagged ESTIMATED with FHFA's caveat in its citation; no owner question and no owner-decision stopgap.

**Done when.** A test in src/core2/macro.test.ts names the months where the old and new mortgage30Pct differ and by how much, and shows no month from 2019-06 reading the spread. In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed the builder did not choose) the rate the housing module reads for a new mortgage equals the index for that month, by the mortgage record id.

**Files.** src/core2/data/macro/history.json, src/core2/macro-model.ts, src/core2/macro.test.ts, src/core2/data/stopgaps.json

**Notes.** TODO

Checked Oct 20 before building: the page at https://www.fhfa.gov/data/mirs lists the index monthly (September 2026 6.48, August 6.51, July 6.35; history.json's PMMS-based mortgage30Pct for 2026-09 is 6.86, so the two differ by about 0.4 point). FHFA states the index is its own adjusted version of Freddie Mac's survey, "is not a replacement for PMMS" and is "intended to be used in lieu of the discontinued [ARM] index for currently outstanding loans, and not as a reference rate on newly-originated adjustable-rate mortgages". The game wants the level of new 30-year fixed rates, which the index is not meant to be, and it would move every post-2019 rate down by 0.3 to 0.4 point. That is a ruling for the CTO or the owner (whether the index may stand in for the excluded survey), not a data fetch. Not built.

Oct 20 (pool feeder): spec written; the build was blocked only on whether the index may stand in, and the open-decision stopgap pattern in AGENTS.md answers it (build, flag, keep going).
