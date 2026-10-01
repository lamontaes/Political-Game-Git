# Butte's government exists in the source but is not linked to its place

Butte-Silver Bow is present in the national place corpus, and its consolidated government is present in the government-unit source. The government has no place identifier, so the local lookup misses it. Five of the eight balance places in the same national cohort return no municipal, county or township government. Teams need a sourced consolidated-government identity and footprint crosswalk. They should preserve independent towns and distinguish a missing government link from the absence of a government.

## Butte-Silver Bow is an actual identity-link gap

Measured source: Butte-Silver Bow (balance) is Census place 3011397, with functional status F, in data/source/places/corpus.json:15881. Its source locator points to the Census 2025 Gazetteer place row. The generated government corpus holds active unit gus2025:108124, named CITY AND COUNTY OF BUTTE-SILVER BOW, classified municipality, county area 30093, with placeGeoid null at src/simulation/government-units.generated.ts:1. The government-unit corpus contains 38,704 rows.

Measured read-only result: lifePlaceByKey finds Butte, and countyGeoidsForPlace returns county area 30093. PlaceLocalGovernmentUnits returns zero municipal, county and township units, county status not-established, and the reason “Which county government serves this place is not known.” MunicipalGovernmentForLifePlace returns null. These pure reader outputs are preserved at docs/codex/audit-systems-consolidated-government.json:1. No World was created or advanced.

Measured source cause: the government loader indexes a unit by place only when placeGeoid exists at src/simulation/government-units.ts:117. Its county index admits only county-classified units at line 118. CountyGovernmentUnitsForPlace therefore cannot use Butte's municipality-classified consolidated unit at line 208. The local reader takes municipality matches from the place index at src/simulation/nationwide-world/local-governments.ts:145. With neither municipality nor county matches, it returns not-established at line 184.

Measured source: municipalGovernmentForPlaceGeoid falls back to the game profile at src/simulation/municipal-government.ts:373. That route still requires a matched government unit. The local fiscal identity validator also rejects municipality units with null placeGeoid at src/simulation/local-ordinance-game-profile.ts:63. A town's existence alone cannot supply this missing canonical government binding.

## The exact national cohort count

Measured inventory: all 32,350 place rows were examined. Exactly eight have functionalStatusCode F. All eight can be resolved through lifePlaceByKey. The following canonical reader results are measured for this complete F-status balance-place cohort, not for every consolidated government in the country.

| Balance place | Place GEOID | Municipal units | County units | Township units | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Milford, Connecticut | 0947515 | 1 | 0 | 0 | Municipal identity found |
| Athens-Clarke County, Georgia | 1303440 | 0 | 0 | 0 | Identity link missing |
| Augusta-Richmond County, Georgia | 1304204 | 1 | 0 | 0 | Municipal identity found |
| Indianapolis, Indiana | 1836003 | 1 | 0 | 0 | Municipal identity found |
| Greeley County, Kansas | 2028412 | 0 | 0 | 0 | Identity link missing |
| Louisville-Jefferson County, Kentucky | 2148006 | 0 | 0 | 0 | Identity link missing |
| Butte-Silver Bow, Montana | 3011397 | 0 | 0 | 0 | Identity link missing |
| Nashville-Davidson County, Tennessee | 4752006 | 0 | 0 | 0 | Identity link missing |

Measured source corroboration: each of the five missing cases has an active municipality-classified unit in its county area with a null placeGeoid. Their IDs are gus2025:161834, gus2025:164742, gus2025:165866, gus2025:108124 and gus2025:175728, respectively. The JSON retains exact names and county areas. A coincident county area is a diagnostic candidate, not a sufficient automatic identity or jurisdictional match.

Unmeasured national limit: this eight-place cohort does not cover consolidated governments represented by other status codes or different footprints. The complete count of consolidated local governments and all their alias gaps remains unestablished. Five of eight is the measured gap denominator; it is not five of all consolidated governments nationwide.

## Exact builder contract

Proposed source repair: admit explicit publisher-government IDs with sourced governing footprints and Census place aliases. Distinguish full consolidated area, balance area and separately incorporated municipalities. Preserve separate government identity, legal powers and procedure evidence. Do not use runtime name matching or assign the consolidated government to every municipality merely because it lies in the same county.

Measured boundary example: Walkerville is separately present as place 3077650 in data/source/places/corpus.json:1. Butte's repair must retain Walkerville's own identity and the actual consolidated government's legally supported reach. MunicipalGovernmentForUnit accepts a published identity link at src/simulation/rule-capability-resolver.ts:564; that existing identity route should remain distinct from the place lookup.

Proposed runtime acceptance: verify each corrected place-to-government mapping, full/balance coverage and preserved independent municipality. Then exercise the existing local jurisdiction and fiscal-authority readers against those explicit aliases. A data repair does not itself establish council procedure, tax power or a successful ordinance. The existing engineering lane owns this repair; Audit/Systems supplies the measured crosswalk gap.

## Method and checks

Production pin remained fd4925e6a6dae3446d2fefe40df2cfc2d2ef931e. The read-only entrypoint is docs/codex/audit-systems/consolidated-readers.mts:1. It invoked canonical geography/government readers and saved their outputs. Zero simulation worlds, browser checks, ordinance passages or production writes occurred. The nationwide campaign remains a separate single process; these counts do not depend on its pending Montana world.
