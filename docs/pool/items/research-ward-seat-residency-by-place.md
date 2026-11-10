---
id: research-ward-seat-residency-by-place
title: "Research: which places make a ward or district council candidate live in the ward"
area: gov
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
source: stand-in triage, Nov 10, 2026 (SG-GOV-ward-residency)
lead: researcher
standard: 2
model: sonnet
effort: medium
root: rc9-place-facts-one-default
---

**What.** A candidate for a council seat chosen by ward must live in that ward in every place, because no place's rule has been read. Read, for each of the 56 places, whether its state law or the charters of its larger towns require a ward or district candidate to live in the ward (as against living in the town), cite each, and record it as data so the filing check applies the rule only where it holds.

**Cause.** Found in code: `src/core2/modules/elections.ts` lines 1134 to 1148 add a `district-residency` check for every ward seat with the source text "Assumed: most charters with district seats ask it"; the only seat-qualification data, `data/research/local-government/governing-body-seat-qualification.json`, holds a minimum age and the qualified-elector basis, nothing on ward residence. Stopgap `SG-GOV-ward-residency` (row in `src/core2/data/stopgaps/gov.json`).

**Fix.** Research each place's rule from state code and the larger towns' charters, putting one row per place (value: required, not required, or estimated required with the source and spread) in a new `data/research/local-government/ward-seat-residency.json`; add a reader beside the one for `governing-body-seat-qualification.json`; make the check at `elections.ts` line 1136 apply only where the row says required (an estimated row keeps the check, marked ESTIMATED). Resolve the stopgap when every place has a row or a marked estimate.

**Time box.** 3 hours for one Sonnet session. When it runs out, write what was found in the item and stop.

**Rules.** Research before building: each row cites a statute or charter section with its retrieval date. One rule, all 56 places: the per-place rows live in data, never in logic. Estimate, never UNKNOWN: a place not found keeps the check as a marked estimate. No hand-written player text: the clerk's words stay with the English engine.

**Done when.** A second session plays a one-year world (`buildBenchWorld`, a drawn place with ward seats and a seed named, one the builder did not choose), files a resident of another ward and sees the refusal where the row says required and the acceptance where it says not required, by filing record id; the data holds a row for each of the 56 places, and `src/core2/modules/elections` tests name one place of each kind.

**Waits on.** Nothing.

**Files.** src/core2/modules/elections.ts, src/core2/data/stopgaps/gov.json, data/research/local-government/governing-body-seat-qualification.json
