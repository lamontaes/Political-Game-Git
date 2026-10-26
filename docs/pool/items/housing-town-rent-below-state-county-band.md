---
id: housing-town-rent-below-state-county-band
title: "M1-05 finds a town median rent below its state county-median band"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The new M1-05 checker drew Milo, Maine (2345985) at seed4f083fd757f4e0cd8e839662d5bbf67146747d0a7d8bbcaf5b35b19b9b8fae26 and measured median rent539.36 dollars at both start and end of its played year. The state county-median band is783 to1589 dollars and the recorded county median is837, while the town home values and yearly value change fall inside their stated bands. This is not the territory-to-national fallback: determine whether the rent generation is miscalibrated or the check mixes contract rent, gross rent or another incompatible measure before changing a value.

**Rules.** One rule, all56 places: diagnose from the drawn place and county records and apply any correction through shared data or readers, never a place condition. Research before building: establish compatible rent definitions and source coverage before adjusting a calibration or a comparison range; do not force a plausible town distribution into an unsupported proxy band.

**Done when.** Reproduce the named buildBenchWorld year and identify the county source, representative rent records and definitions used by the model and benchmark. Correct the demonstrated mismatch or document and repair an invalid comparator on its owning branch, with a drawn-place test and before/after values, without skipping a clause, inventing a source or forcing a state-specific result.

**Files.** src/core2/modules/housing.ts, housing source/calibration data; src/core2/tooling/m1-05-check.ts as the reproducer

**Notes.** The checker belongs to open PR5893; any checker correction stays on that branch or is coordinated with its writer. Start with a read-only definition/source diagnosis; do not create a competing checker writer.
