# Regional family illustrations still have no delivered street scenes

The regional coverage file has four street requests, and none has a delivered plate entry. Two landscape plates are delivered and hash-verified. Those can illustrate a compatible surrounding region; they do not show the player's street or home. The remaining requests need bank reconciliation before anyone paints replacements. Team 7 should first match the exact request keys and hashes below against its existing tagged images. A missing admitted plate does not prove that the source art is missing.

## 1. Why-chain

1. The family card can be neutral because its regional resolver returns no admitted raster.
2. The resolver can refuse a picture because geography, season, conflicting coverage, a null plate, or unavailable file bytes prevent a match.
3. The bundled coverage file names 23 researched requests. Only two carry plate records, both classified as open landscapes.
4. A street request without a plate cannot become a street background just because its filename or search tags sound suitable.
5. Eligibility and actual bytes must meet the existing consumer's rules. The terminal is authored art coverage and delivered-byte bookkeeping, not a person's decision or a simulated ecological fact.

The chain leaves out private source-bank holdings, owner pixel review and installed runtime snapshots that differ from this checkout. This report does not classify an unresearched town into its nearest region.

Evidence: `src/authoring/regional-scene-coverage.ts` applies context before geography. `src/presentation/regional-opening-plate.ts` returns an explicit miss if a declared file has no bundled URL. `src/player/WorldOrientationPanel.tsx` uses the admitted plate, an eligible private-review preview, or neutral for the parents card.

## 2. Research

Measured inventory at main `c240f91c3779034fe77d2eb3bed05671a7ed1e2b`, September 30, 2026. The family integration head is `a606af9230dd708da180c50fc89131d319ac3feb`; its art readers are unchanged from main.

The source file is `art/regions/regional-scene-places.json`. Its original catalog attribution is Art Bench `store-b40dfbc0`, lastSeq1229, generated September 21, 2026. Its 23 request keys are source keys, not inferred aliases for the separate 22-type presentation taxonomy. The source's researched geographic notes remain the authority for further qualification; county research leads are not admitted selectors.

| Exact coverage region key            | Exact Art Bench source request key                     | Declared scene kind | Declared seasons               | Bundled plate result                  | Admitted place GEOIDs                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------ | ------------------- | ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `appalachian-town-january`           | `playtest65-region-appalachian-town-january`           | street              | winter                         | No plate entry                        | None declared                                                                                                                         |
| `basalt-coulee-steppe`               | `playtest65-region-basalt-coulee-steppe`               | open-landscape      | spring, summer, autumn         | No plate entry                        | None declared                                                                                                                         |
| `buchanan-small-town`                | `playtest65-region-buchanan-small-town`                | street              | spring, summer, autumn         | No plate entry                        | None declared                                                                                                                         |
| `champlain-lake-lowland`             | `playtest65-region-champlain-lake-lowland`             | shoreline           | summer                         | No plate entry                        | None declared                                                                                                                         |
| `colorado-plateau-redrock`           | `playtest65-region-colorado-plateau-redrock`           | open-landscape      | spring, summer, autumn, winter | No plate entry                        | None declared                                                                                                                         |
| `cross-timbers-oak-prairie`          | `playtest65-region-cross-timbers-oak-prairie`          | open-landscape      | spring, summer, autumn         | Delivered landscape; SHA-256 verified | 4013500, 4031700, 4066800, 4070300, 4819528, 4827984, 4837168                                                                         |
| `fort-pierre-prairie-pond`           | `playtest65-region-fort-pierre-prairie-pond`           | open-landscape      | spring, summer, autumn         | No plate entry                        | None declared                                                                                                                         |
| `great-plains-january`               | `playtest65-region-great-plains-january`               | open-landscape      | winter                         | No plate entry                        | None declared                                                                                                                         |
| `green-mountain-forest`              | `playtest65-region-green-mountain-forest`              | open-landscape      | summer                         | No plate entry                        | None declared                                                                                                                         |
| `lower-mississippi-delta-marsh`      | `playtest65-region-lower-mississippi-delta-marsh`      | open-landscape      | spring, summer, autumn         | No plate entry                        | None declared                                                                                                                         |
| `norcal-oak-woodland`                | `playtest65-region-norcal-oak-woodland`                | open-landscape      | summer, autumn                 | No plate entry                        | 0630028, 0633056, 0670098, 0672646, 0685922                                                                                           |
| `north-atlantic-granite-coast`       | `playtest65-region-north-atlantic-granite-coast`       | shoreline           | spring, summer, autumn         | No plate entry                        | None declared                                                                                                                         |
| `northwoods-lake-forest`             | `playtest65-region-northwoods-lake-forest`             | shoreline           | summer                         | No plate entry                        | None declared                                                                                                                         |
| `pacific-temperate-rainforest`       | `playtest65-region-pacific-temperate-rainforest`       | open-landscape      | spring, summer, autumn, winter | No plate entry                        | 5301780, 5324810, 5332650, 5356905                                                                                                    |
| `pikeville-valley-street`            | `playtest65-region-pikeville-valley-street`            | street              | spring, summer, autumn         | No plate entry                        | None declared                                                                                                                         |
| `rocky-mountain-montane`             | `playtest65-region-rocky-mountain-montane`             | open-landscape      | winter                         | No plate entry                        | None declared                                                                                                                         |
| `socal-inland-bungalow-neighborhood` | `playtest65-region-socal-inland-bungalow-neighborhood` | street              | spring, summer, autumn         | No plate entry                        | 0656000                                                                                                                               |
| `sonoran-desert`                     | `playtest65-region-sonoran-desert`                     | open-landscape      | spring, summer, autumn, winter | Delivered landscape; SHA-256 verified | 0400870, 0402830, 0410180, 0411160, 0411230, 0411300, 0425300, 0444270, 0451600, 0455000, 0455300, 0465000, 0477000, 0477035, 0477179 |
| `southern-high-plains`               | `playtest65-region-southern-high-plains`               | open-landscape      | spring, summer, autumn         | No plate entry                        | None declared                                                                                                                         |
| `southern-pine-hardwood`             | `playtest65-region-southern-pine-hardwood`             | open-landscape      | spring, summer, autumn         | No plate entry                        | None declared                                                                                                                         |
| `subtropical-mangrove-wetland`       | `playtest65-region-subtropical-mangrove-wetland`       | shoreline           | spring, summer, autumn, winter | No plate entry                        | None declared                                                                                                                         |
| `trans-pecos-desert-mountain`        | `playtest65-region-trans-pecos-desert-mountain`        | open-landscape      | spring, summer, autumn, winter | No plate entry                        | None declared                                                                                                                         |
| `upper-midwest-tallgrass-prairie`    | `playtest65-region-upper-midwest-tallgrass-prairie`    | open-landscape      | spring, summer, autumn         | No plate entry                        | None declared                                                                                                                         |

The four street requests cover a dormant Appalachian town, a Great Lakes main street, a Pikeville valley street and an inland Southern California bungalow neighborhood. Their exact keys are in the table. Each has a null plate. The other 19 rows describe 15 landscapes and four shorelines; none declares a street or a home scene. There is no home scene kind in this coverage contract. This is an admission/contract finding, not a claim that all 23 regions need a new painting.

The two delivered files are:

- `art/families/regional-opening/env_regional_cross_timbers_oak_prairie_v1.png`: 2496 by 1664 encoded pixels; SHA-256 `a400b48edb4b86f130b037c37f1bff87bb0b523b361b90684ff4bf6e6f7b7ce3`. File present and exact hash verified.
- `art/families/regional-opening/env_regional_sonoran_desert_v1.png`: 2208 by 1584 encoded pixels; SHA-256 `dabdae2c70e8703f527af384b8954c22854b16dc18403312596f5858858b7485`. File present and exact hash verified.

These landscape admissions do not establish street compatibility, a particular house, tenure or wealth.

## 3. Revisions

Keep coverage absence, delivery absence and approval absence distinct. The 21 null plate records are not 21 proven missing source images. Preserve season limits and exact GEOIDs. Empty geography is unqualified, not permission to use a whole state.

The separate presentation taxonomy is declared in `src/presentation/opening-regional-plate.ts`. Its bundled active candidate metadata comes from `src/presentation/opening-regional-candidates.ts`, with optional installed override key `art/manifest/opening_regions.json`. The following lookup describes the bundled fallback only:

| Exact presentation region type        | Existing active candidate lookup                                                          | Regional home admission                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `great-plains-grassland`              | `env_playtest65_great_plains_pond_r1`; May–September; private review only                 | No explicit regional home coverage declaration |
| `appalachian-coal-region-town`        | `env_playtest65_wooded_valley_town_street_cleanup_r2`; May–September; private review only | No explicit regional home coverage declaration |
| `fishing-coast`                       | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `beach-coast`                         | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `northern-california-oak-woodland`    | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `southern-california-inland-bungalow` | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `southern-high-plains`                | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `trans-pecos-desert-mountain`         | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `southern-pine-hardwood`              | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `cross-timbers-oak-prairie`           | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `northwoods-lake-forest`              | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `upper-midwest-tallgrass-prairie`     | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `green-mountain-forest`               | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `champlain-lake-lowland`              | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `pacific-temperate-rainforest`        | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `sonoran-desert`                      | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `colorado-plateau-redrock`            | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `rocky-mountain-montane`              | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `subtropical-mangrove-wetland`        | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `north-atlantic-granite-coast`        | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `lower-mississippi-delta-marsh`       | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |
| `basalt-coulee-steppe`                | None in bundled active candidate list                                                     | No explicit regional home coverage declaration |

Twenty of 22 types have no candidate in the bundled active list. Two have private-review candidates, not released street/home admissions. No automatic join between the 23 coverage keys and the 22 presentation keys was executed. In particular, fishing and beach taxonomy keys do not silently become one of the four shoreline requests.

No effects link, rate, multiplier, time step or per-place simulated rule changes. Range requirements do not apply to this read-only inventory.

## 4. What gets built, in numbered parts

1. Publish this exact source-key inventory for the coordinator and Team 7. No source, coverage, art or runtime change.
2. Team 7 reconciles all 23 request keys, the 22 taxonomy keys and the three known candidate hashes below against its existing 825-image tags. It records matching original path/hash, reference versus finished output, explicit geographic/season eligibility and owner approval disposition.
3. Only after reconciliation identify a missing original, an undelivered existing original, an unapproved candidate, or missing researched geographic coverage. A generation request belongs to the art owner after that distinction; this report grants none.

Existing-bank lookup performed in this checkout:

- The asset manifest: `art/manifest/asset_manifest.json`.
- The environment inventory: `art/qa/asset_bank_inventory.json`.
- The limited master inventory: `art/qa/banked_master_inventory.json`.
- Both regional raster files and the active/banked candidate declarations.

The inventory's seven released environment records include two ordinary apartment interiors. They are existing home art, with no declared geographic link to these regional request keys.

Existing generic backdrop files:

- `art/backdrops/main-street__midday.jpg`.
- `art/backdrops/small-apartment__midday.jpg`.
- `art/backdrops/mobile-home__midday.jpg`.

Their presence does not admit them to every region or identify a recorded player's home.

Known candidate lookup records in the manifest:

| Exact asset ID                                        | Existing final-path key                                                                               | SHA-256                                                            | Result here                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `env_playtest65_pikeville_valley_street_434644_r1`    | `art/generated/candidates/art-desk/playtest65/regional/pikeville-valley-street-firefly-434644-r1.png` | `2cfa09f644d30749d8a129d7441f9bbde46b0b5875c1e9e8c6a253cd85e5377f` | generation pending; QA pending; unreleased; file absent here |
| `env_playtest65_wooded_valley_town_street_cleanup_r2` | `art/generated/candidates/art-desk/playtest65/regional/wooded-valley-street-cleanup-r2.png`           | `85720edf325911f8bbc741c2c88fa8b23cb40ba237e455390f6e4e1341515af0` | generation pending; QA pending; unreleased; file absent here |
| `env_playtest65_great_plains_pond_r1`                 | `art/generated/candidates/art-desk/playtest65/regional/great-plains-pond-r1.png`                      | `0df680c304a6ae6d0d7a1e7d8dfe43f35a8236ef19f696e191ba3207e98d5814` | generation pending; QA pending; unreleased; file absent here |

The Pikeville candidate is banked with exact placeKey 2160852 and May–September eligibility, but it is not in the bundled active list. The other two have the region-type coverage listed above. `candidateEstablishingPlate` requires candidate-review mode, a matching manifest hash, usable dimensions and actual URL bytes. These descriptors grant no production approval.

Team 7's existing 825-image source tags are external to this cloud checkout. Its assigned source folder is `/Users/lamontae/Documents/OCD-Art-Sept29`; Team 7's README specifies its tag destination. The complete 825-tag index and its source hashes were NOT inspected here. The repository master inventory is only a 14-file priority subset and cannot substitute for that index. Team 7's acknowledged reconciliation dependency remains pending. Do not treat this packet as permission to generate.

## 5. Simulated, records, world pieces, checks

SIMULATED: no decisions or outcomes change.

RECORDS: saved home IDs, date, source GEOIDs and existing kinship remain read-only. No relatives or attendance are created.

WORLD PIECES: existing regional coverage, bounded place/profile associations, candidate metadata, available raster URLs and the recorded home's own scene. Installed runtime-art metadata may replace the bundled candidate list. The installed owner's snapshot was NOT inspected, so this report makes no global claim about its holdings.

CHECKS: 23 source requests, 4 street rows, 2 delivered landscapes and 21 null plates were counted. Both delivered SHA-256 values match. There is no explicitly declared home scene among the 23 coverage rows. Candidate bytes missing locally do not prove a missing bank original. With no qualified family illustration, the parents card remains neutral.

## 6. Proof run

This is a read-only inventory, not a new watched game run. The integrated family's sole changed test ran 4/4 PASS, exit 0, 45.41 seconds at `a606af9230dd708da180c50fc89131d319ac3feb`.

The three saved-world seeds are listed in the lookup table. The latter includes unincorporated Tab, Indiana; Quantico, Maryland is also unincorporated.

A fresh read-only resolver lookup of those saved fixtures is recorded below. Previous six family browser captures at the earlier source head showed neutral regional backgrounds; those are retained evidence, not a browser rerun at the integrated head.

| Saved seed          | Name               | State key | Place/source GEOID | County GEOID | Saved date/season        | Declared region types | Resolver result                               |
| ------------------- | ------------------ | --------- | ------------------ | ------------ | ------------------------ | --------------------- | --------------------------------------------- |
| `team8-opening-1-a` | Quantico, Maryland | `US-MD`   | `2464475`          | `24045`      | January 5, 2026 / winter | None                  | `no-region-covers-this-place`; no region keys |
| `team8-opening-1-b` | Rockland, Idaho    | `US-ID`   | `1669130`          | `16077`      | January 5, 2026 / winter | None                  | `no-region-covers-this-place`; no region keys |
| `team8-opening-1-c` | Tab, Indiana       | `US-IN`   | `1874780`          | `18171`      | January 5, 2026 / winter | None                  | `no-region-covers-this-place`; no region keys |

Browser, installed runtime snapshot,825-tag full reconciliation, new art review, full suite, year-speed, creator-to-day and law-linked money proof: NOT RUN for this inventory. No independent helper was created, per the session's no-new-team instruction.

## 7. Worked example

A saved family in Tab uses source place GEOID 1874780 and the world's January 5, 2026 date. The existing regional coverage lookup returns the recorded result in the table above. The saved home is not assigned a nearest prairie region. The family card can still illustrate the saved parents and guardians with a neutral background. It creates no house or attendance record. No paycheck, rent, tax or monthly money change follows from this illustration lookup.

Next bounded action: coordinator forwards this inventory to Team 7's existing-bank reconciliation. Team 7 returns exact matched originals and review status before any art request or import. The separate family integration awaits CTO exact-head renewal and Merge validation.
