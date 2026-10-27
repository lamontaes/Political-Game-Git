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
claimed-at:
---

**What.** The new M1-05 checker drew Milo, Maine (2345985) at seed4f083fd757f4e0cd8e839662d5bbf67146747d0a7d8bbcaf5b35b19b9b8fae26 and measured median rent539.36 dollars at both start and end of its played year. The state county-median band is783 to1589 dollars and the recorded county median is837, while the town home values and yearly value change fall inside their stated bands. This is not the territory-to-national fallback: determine whether the rent generation is miscalibrated or the check mixes contract rent, gross rent or another incompatible measure before changing a value.

**Rules.** One rule, all56 places: diagnose from the drawn place and county records and apply any correction through shared data or readers, never a place condition. Research before building: establish compatible rent definitions and source coverage before adjusting a calibration or a comparison range; do not force a plausible town distribution into an unsupported proxy band.

**Done when.** Reproduce the named buildBenchWorld year and identify the county source, representative rent records and definitions used by the model and benchmark. Correct the demonstrated mismatch or document and repair an invalid comparator on its owning branch, with a drawn-place test and before/after values, without skipping a clause, inventing a source or forcing a state-specific result.

**Files.** src/core2/modules/housing.ts, housing source/calibration data; src/core2/tooling/m1-05-check.ts as the reproducer

**Notes.** The checker belongs to open PR5893; any checker correction stays on that branch or is coordinated with its writer. Start with a read-only definition/source diagnosis; do not create a competing checker writer.
Diagnosis (claude pool worker, Oct 27; released, fix tried and backed out). Reproduced: Milo, Maine (2345985, world seed 4f083fd757f4e0cd8e839662d5bbf67146747d0a7d8bbcaf5b35b19b9b8fae26), two days into the year, 187 renters at a median rent of $539.36 and a minimum of $539.36, against the county's median gross rent of $837 (Piscataquis, rentValueOf("23021")). Cause: in `withHousing` (src/core2/modules/housing.ts, the lease loop after the owners' rows) each rent is `medianRent * incomeScale(income)`, with the scale normalized so a household at the TOWN's median income pays the median rent. The ACS median gross rent is the median among RENTING households, who earn less than the town as a whole, and more than half of Milo's renters have no recorded income, so they all sit at the scale floor ((0 + offset) / (median + offset)) ^ elasticity = 0.644, and the renters' median is that floor: 0.644 * 837 = 539. The owners' values already normalize by the owners' own median scale (`ownerMedianScale`); the rents do not. This is a miscalibration, not a definition mismatch with the check. Fix tried: divide each rent's scale by the renters' median scale. It gave a median of exactly $837 (min 837, max 1,595 in Milo), but it also lifts every income-less renter from 0.64 to 1.0 times the median, and two tests moved: housing-calibration.test.ts (homeless count 19 against a bound of 17 in a random place) and housing-laws.test.ts (Cranston, Rhode Island, seed 7c1b800bf88e39673b3a0b58f187a364384ded65fdc5296772c334341b2336e2: expected 2 to be 1, nobody learned of the saving). I did not check either failure against clean main. Backed out. Do it with a rent spread that keeps low-income renters below the median (for example anchor the median renter at the county median but keep the scale's slope), calibrated against the HUD rent-burden share the homeless item already uses (world-homeless-puerto-rico-far-above-hud), in one change with that item's findings.
