# HUD shelter beds provide a national anchor, not county vacancies

The 2025 HUD Housing Inventory Count supports a national anchor of 11.77 year-round emergency-shelter beds per 10,000 residents for the 50 states and D.C. State rates span 2.22–61.09 beds per 10,000. That is observed state variation, not a researched county-level draw distribution. Team 3 can use the anchor for a flagged estimate, but county allocation and actual admission still need geographic and household records. A listed bed is not an available bed for a particular evicted family.

## 1. Why-chain

CTO’s 4:40 dispatch asks for emergency shelter between host placement and no fixed home. Inventory matters because admission requires a real bed, suitable household capacity and eligibility. Inventory alone cannot establish occupancy, refusal, opening hours or placement. The research chain ends at measured bed inventories and an unjoined county/CoC population geography; no household admission outcome is proven.

The dispatch’s county-capacity draw is an authorized modeling arrangement. It must remain a stable world/place capacity estimate, not a per-household admission roll. Team 3 must name the person-level admission reader, or mark “no person feels this yet.”

## 2. Primary evidence and calculation

Measured source: HUD’s [2025 AHAR release page](https://www.huduser.gov/portal/datasets/ahar/2025-ahar-part-1-pit-estimates-of-homelessness-in-the-us.html) links the [2007–2025 HIC workbook by CoC](https://www.huduser.gov/portal/sites/default/files/xls/2007-2025-HIC-Counts-by-CoC.xlsx). The 2025 sheet contains 386 CoC rows plus a Total row. Column F is “Total Year-Round Beds (ES).” Column O repeats that emergency-shelter total within its detailed program section. Other columns separately identify transitional housing, safe havens, seasonal and overflow beds.

Calculated from the 386 CoC rows, without including the Total row again: 402,719 year-round emergency-shelter beds. Listed territorial records are GU-500: 95; PR-502: 185; PR-503: 186; VI-500: 45. Subtracting these 511 beds leaves 402,208 beds for the 50 states and D.C.

Measured denominator: Census’s [2025 state population table](https://www2.census.gov/programs-surveys/popest/tables/2020-2025/state/totals/NST-EST2025-POP.xlsx) gives 341,784,857 U.S. residents as of July 1, 2025. Summing the 50 state and D.C. rows reproduces that total. Therefore 402,208 / 341,784,857 × 10,000 = 11.7678706871 beds per 10,000 residents.

This calculation combines the 2025 HIC inventory snapshot with July population estimates; it is not an exact same-day density. The national population excludes Puerto Rico and the other territories, so their beds are excluded from this national ratio. Territorial rows remain separate evidence; missing AS/MP rows are not proof of zero capacity.

## 3. Range and breadth

Calculated state-level range: Mississippi has 656 beds / 2,954,160 residents × 10,000 = 2.2206; New York has 122,202 / 20,002,427 × 10,000 = 61.0936. Across 51 state/D.C. rates, the median is 7.3337. The national population-weighted ratio is 11.7679; an unweighted state average must not replace it.

The observed 2.22–61.09 envelope describes state capacity variation. It is not a confidence interval, county distribution or causal law-effect range. Using it for county draws would be an explicitly flagged coarse modeling estimate, not empirically validated county coverage. It also cannot establish that every county has a shelter: counties without providers are possible within states with positive capacity. No county-zero share or placement probability was estimated.

A CoC may cover one county, several counties or a city/county combination. CoC bed totals cannot be divided by one arbitrarily chosen county population or repeated in each constituent county. CoC-specific per-capita rates remain pending a boundary/population join. Provider geocodes in the detailed [2025 HIC CSV](https://www.huduser.gov/portal/sites/default/files/xls/2025-HIC-Counts-by-State.csv) may assist a county-location crosswalk; they were not converted here.

## 4. Numbered parts for Team 3 and CTO

1. Keep the 11.77 national beds-per-10,000 anchor, scoped to year-round emergency shelter and the 50 states/D.C.
2. Keep 2.22–61.09 as an observed state envelope only. If CTO chooses it for the authorized county-capacity estimate, mark that transfer of scale in developer data; do not label it county research.
3. Preserve beds for households with children, without children and only children separately. Family units and beds are distinct columns; total beds alone do not establish family placement capacity.
4. Require local capacity, occupancy and eligibility records for the household reader. Never treat inventory as nightly vacancies or an actor-level chance.
5. Resolve CoC/county geography and territorial population denominators before replacing estimates with place-specific densities.

Priority conflict: this new 4:40 shelter packet takes priority over numbering batch two and the incomplete fertility conversion follow-up. Those findings and sources remain preserved; national cost anchors and political socialization remain queued. No county capacity is invented to close the deadline.

## 5. Simulated, records, world pieces and checks

SIMULATED: none. RECORDS: measured HIC inventories and derived density checks. WORLD PIECES: Team 3’s shelter writer, available-bed records and household eligibility were not audited here. CHECKS: source inventories can check appropriately scoped aggregate capacity. No resident or family was placed.

None-case: unavailable capacity is not permission to place a household. Missing data do not prove zero beds. Existing occupied beds do not imply vacancy. A home remains unavailable after eviction as specified by CTO; this research does not alter that rule.

Connections added or changed: zero. Team 3 owns the household destination/admission reader, the coordinator owns claims and effects wiring, and Team 2 supplies actual watched proof.

## 6. Proof and validation

The national ratio and state range were calculated from those inputs. No runtime tests, typecheck, browser, release, zero-dice, named placement or watched proof was run. No implementation acceptance or merge is claimed.

## 7. Worked example and next step

No simulated household example was run. The numeric state comparisons above are source calculations, not game outcomes. Next: join CoC boundaries or provider geocodes to county populations, preserve family bed/unit categories, and validate a county estimate contract with Team 3 through the coordinator.

## Method

END00 was read through the exact 4:40 entry. Feature-walkthrough remains invoked from its pinned 1191 source. HUD workbook and Census population table were retrieved September 30, 2026. Local sources and derived 51-place rows are preserved under /workspace/scratch/team9-hic/; no full third-party prose is published.

HIC workbook: 2,598,803 bytes; SHA-256 d4dd3a9dc84384976fa2efcde2d89081a4deeea57be43c73eb587c77ed527bc1. Initial guessed Census paths returned 404; the verified public directory supplied NST-EST2025-POP.xlsx. QuickFacts returned 403. No access restriction was bypassed.

Executed workbook parsing and aggregation, with the total row excluded; 51-state/D.C. population sum reconciled to the U.S. row. All 386 CoC identifiers are unique, both repeated ES total columns match, and the sum equals HUD’s Total row of 402,719.
