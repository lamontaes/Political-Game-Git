---
id: housing-web-lease-renews-without-town-factor
title: "housing-web red on main by draw: a lease in the shifted run renews with no web change (Macon, Georgia, seed d36f407e7c697a43)"
area: world
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-housing-web-lease-renews-without-town-factor
pr: #8565
after:
blocked-on:
lead: laws
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:58:17.491Z
branch: claude/pool-housing-web-lease-renews-without-town-factor
---

**What.** The housing-web test is red on main by draw. src/core2/housing-web.test.ts failed on clean main (31ad11a8c6, Oct 28) with WEB_HOUSING_SEED=d36f407e7c697a43 (Macon, Georgia): 'lease:household_5a537cd7cd145512: expected 1 to be close to 1.05'. The test shifts the town's outcome-web month (property-tax-to-rent 0.05) and expects every renewed lease to record a web change of 1.05; this lease records 1. A second seed fails the same way (WEB_HOUSING_SEED=38096aba2bd718a2, Felton, Delaware, lease:household_469542be0d124e00). Other seeds pass. Guards: the rent a renewed lease charges on a household's card, which the housing-web test keeps from being charged twice.

**Cause.** Found in code: `renewRentalLeases` in src/core2/housing-occupancy.ts computes `webChange = webFactor(tenant.placeId) / (last.webFactor ?? 1)` (line 502); a lease first recorded after the web shift stores 1.05 as its first factor and reads 1.05 over 1.05, which is 1.

**Fix.** Make the renewal base the factor in force when the lease was signed, or make src/core2/housing-web.test.ts expect the shift only for leases that existed before it. Decide which by reading what the web factor is meant to charge a lease signed after the shift (a steady factor must not be charged twice).

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Fix it at the root: either the renewal reads the web factor of the place the lease is in and the test should only expect the shift for leases in the shifted town, or the renewal reads the wrong place for this lease. One rule, all 56 places: no place named in code; the test keeps drawing its place.

**Done when.** A second session, not the builder, runs src/core2/housing-web.test.ts with WEB_HOUSING_SEED=d36f407e7c697a43 and WEB_HOUSING_SEED=38096aba2bd718a2 and on three further random seeds, each drawn place named, and all pass. The PR body names the lease ids checked, which place the failing lease is in and why its factor was 1.

**Waits on.** Nothing.

**Files.** src/core2/housing-web.test.ts, src/core2/housing-occupancy.ts (`renewRentalLeases`), src/core2/modules/housing.ts

**Notes.** Nov 1, 20:45 UTC (speed lead): a second seed, the same failure on clean main 8712646f8f: WEB_HOUSING_SEED=38096aba2bd718a2 draws Felton, Delaware, and fails with 'lease:household_469542be0d124e00: expected 1 to be close to 1.05'. It fails the same way on speed/evicted-stay-counted before and after its merge of main, so it is not that PR's. Probable cause, from renewRentalLeases (src/core2/housing-occupancy.ts): webChange is the town's factor over the factor stored on the lease's first renewals row, so a lease first recorded after the web shift (a lease signed during the run) reads 1.05 over 1.05.

Released (2026-11-11): Cause differs on main 37bf82a661: with WEB_HOUSING_SEED=d36f407e7c697a43 (Macon, Georgia) and 38096aba2bd718a2 (Felton, Delaware) the renewed-lease checks in src/core2/housing-web.test.ts now PASS (every lease records 1.05, the loop at lines 181-188); both seeds instead fail at line 193, expect(moved.exited).toBe(true): the homeless household's way back does not exit in the shifted run. That is a different defect (housing-homeless review with the vouchers factor) and needs its own item; the lease item as written is not reproducible. Continue on branch claude/pool-housing-web-lease-renews-without-town-factor.

Released (2026-11-11): Cause differs on main (Nov 11): WEB_HOUSING_SEED=d36f407e7c697a43 fails housing-web.test.ts after 163 s with 'expected false to be true' (a boolean assertion), not the item's 'expected 1 to be close to 1.05'; the code at housing-occupancy.ts line 502 matches the Cause, but the failing assertion must be identified first. Continue on branch claude/pool-housing-web-lease-renews-without-town-factor.
