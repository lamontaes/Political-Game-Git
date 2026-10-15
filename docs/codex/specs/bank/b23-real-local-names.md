# Real local names: the real high school, hospital, banks and big employers (bank id b23, phase Living world)

## What the player experiences

When you start in a real town, the places around you have the names people there actually know. Your character went to the town's real high school, was born at the real regional hospital, banks at the real local bank, and their neighbors work at the real school district, county government, college or hospital that employs the most people there. In a town with no high school of its own, kids go to the real one their district sends them to. Where no public list exists (most private shops and plants), the game makes up a name the way that region names things, so nothing reads as fake "Hickory Ridge" filler or the same two generic businesses in every town. The names never come with citations or "estimated" labels on screen; they just read like home.

## Owner decisions this rests on

- Register, Sept 26 vision: "If the real school exists in the game's data, use it by name; if not, generate one in real naming patterns (named for a local famous person, a county, a numbered public school)."
- Roadmap (Living world): "Real places keep real names: the real high school, hospital and big employers, not fake 'Hickory Ridge' or generic businesses in pairs."
- Sept 28 #3: "Banks: real banks in each town that can fail one by one, calibrated from FDIC data."
- Employers rule (Register :93; `docs/research/requests/employers-and-job-listings.json:43`): a real public body's name is used when an official source verifies it; a verified name does not create a vacancy.
- Nothing blank or unknown: unread values are estimated from similar places and marked estimated in data only. Real data calibrates the start only; one rule for all 50 states, D.C. and territories.
- Research timebox: one lookup per source, 10 minutes or less.

## Existing code it must use

- `src/simulation/school-names.ts:271 generateSchoolName`, `:377 measuredSchoolName`, `:431 generateSchoolNames` — every school name today is generated (header :8-14).
- `src/simulation/school-stages.ts:823 stageSchoolNames` (hard-codes v2 naming at :835 while new games use v3, `new-game.ts:328`); `:317 recordedSchoolFor`; `:425 schoolNameToday`.
- `src/presentation/production-world.ts:1761` (child schooling; legacy "<town> public school" at :1750); `src/simulation/character-history.ts:3390` (an adult's generated past schools).
- `src/education/catalog-load.ts:57 loadEducationCatalog` (CCD 2024-25 + IPEDS directory already shipped in `public/education/`, 101,333 schools; rows keyed by state + `LCITY`, no place GEOID); `src/education/catalog.ts:40 institutionDateReason` (refuses dates before the directory year).
- `src/simulation/living-world/town-employment.ts:610` (`${town} Regional Hospital`), `:626` clinic, `:342-356` name variants, `:527` bank names, `:1052 CIVIC_MINIMUM` (every town gets a hospital and clinic), `:1281 writeTownEmployer` (provenance always `generated`), `:150 townEmploymentMix` (CBP county → state → national).
- `src/simulation/local-economy.ts:67-150` (8 small-business kinds named `${family}'s Market`, max 2 per kind :160).
- `src/simulation/living-world/town-finances.ts:306 observedBankPool`, `:355 recordedBankShape`; `town-bank-shapes.generated.ts:74 FDIC_SMALL_BANK_RECORDS` (certificate + assets, no names); `town-deposits.generated.ts` (county deposits, no branch names); compilers `scripts/research/compile-fdic-town-banks.py`, `compile-fdic-county-deposits.py`.
- `src/simulation/nationwide-world/local-governments.ts:457 ensureLocalGovernmentOrganization` — THE pattern to copy: `source-record` provenance when an official list names the body, `authored` otherwise; `types.ts:1376-1388` provenance kinds.
- `src/simulation/local-business-counts.ts:220 localBusinessSupplyFor` — county → state → nation fallback with an "ESTIMATED FROM AVERAGE" basis string (the estimate convention to reuse).
- `src/simulation/life-places.ts:1021 lifePlaceByJurisdictionId` (`sourceGeoid`), `:399 residentNameForJurisdiction`; `src/simulation/government-units.ts:319 countyGeoidsForPlace`.

## Quickest data source plan (one lookup each, all U.S. government, names are facts)

| What                     | Source                                                                                                                                                                    | Join to place                                                                                             | Status                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------ |
| High schools + districts | NCES CCD 2024-25 (already in repo: `data/source/education/raw/ccd-2024-25.zip`; use LEVEL=High, SCH_TYPE=regular, LEAID, LEA_NAME, LCITY, LZIP)                           | state + city name to Census place, ZIP as tiebreak; district (LEAID) gives the school for towns with none | in repo                  |
| Colleges                 | IPEDS HD (in repo)                                                                                                                                                        | city + state                                                                                              | in repo, already shown   |
| Hospitals                | CMS Provider Data Catalog "Hospital General Information" CSV (name, city, state, ZIP, county, type incl. critical access)                                                 | city + state, county fallback                                                                             | one download             |
| Clinics (optional)       | HRSA Health Center Service Delivery Sites                                                                                                                                 | city + state                                                                                              | one download             |
| Banks                    | FDIC Summary of Deposits branch file (NAMEFULL, CITYBR, STCNTYBR, CERT) — same data the compilers already read, keep the name and branch city                             | branch city → place; county otherwise                                                                     | re-run existing compiler |
| Public big employers     | Already in repo: general-purpose governments (Census Gov Units 2025), school districts (CCD LEA), colleges (IPEDS), hospitals (CMS)                                       | above                                                                                                     | in repo / above          |
| Private big employers    | SEC EDGAR company business addresses (public companies headquartered in the place) + CBP establishment size classes (how many large plants exist in the county, no names) | HQ city → place                                                                                           | one download             |

**Estimate rule (no source):** a kind of institution the place has (from CBP counts, CIVIC_MINIMUM, the district map) but no named row → name generated by the existing generators (`generateSchoolName` v3, `writeTownEmployer`) from the place's own naming patterns, provenance `generated` with basis "ESTIMATED FROM AVERAGE: no official listing names this <kind> in <place>; named in the <state> pattern". A town with no hospital row uses the nearest listed hospital in its county (people really drive there) before generating one; a town that genuinely has none never gets one invented just to fill `CIVIC_MINIMUM`.

## What to change

1. **One compiled file, one reader.** `scripts/source/local-institutions.ts` builds `data/research/places/local-institutions.json` keyed by place GEOID: `{ highSchools[], districts[], hospitals[], banks[], colleges[], largeEmployers[] }`, each row `{ name, kind, sourceKey, sourceId, asOf }`; a county-keyed section for rows that match only a county. Add to `data/source/MANIFEST.json`. Reader `localInstitutionsFor(world, jurisdictionId)` in a new `src/simulation/local-institutions.ts` using `lifePlaceByJurisdictionId(...).sourceGeoid`, falling back to the county section.
2. **Schools use the real name.** `stageSchoolNames`, `production-world.ts:1761` and `character-history.ts:3390` take the real high school (and district) from the reader first, the generator second. Fix the v2/v3 mismatch at `school-stages.ts:835`. For years before 2024-25, the name of a school that exists now is carried back (schools are long-lived) and marked estimated in data; `institutionDateReason` keeps refusing enrollment terms, not the name.
3. **Hospitals, clinics, banks.** `town-employment.ts` hospital/clinic/bank workplaces take the reader's rows (with `source-record` provenance, like `ensureLocalGovernmentOrganization`); `CIVIC_MINIMUM` seats a hospital worker only where the town or county has one. `town-finances.ts` matches a town's bank by the FDIC certificate from the same row so the name and the money are the same bank.
4. **Big employers.** `writeTownEmployer` seats the largest real public employers from the reader first (district, county, college, hospital, state offices), then any EDGAR-headquartered company in the place, then generated private employers in the count CBP implies. Replace "max 2 per kind" duplication in `local-economy.ts` naming with distinct names drawn from the place's own patterns (no two businesses in one town share a template shape).
5. **All places, one path.** Test loops all 50 states + D.C. + territories (territories: CCD and CMS include PR, GU, VI; AS and MP fall to the estimate rule).

## Must NOT build

- Per-town hand-entered name lists or any single-place special case.
- A second school or employer generator; the existing ones become the fallback.
- Names on screen with sources, "estimated", or "real" badges.
- Invented hospitals or high schools for places that have none; vacancies created because a name was found.
- OpenStreetMap or licensed business databases (Infogroup/Data Axle) as a source.

## Done when (proof in a played game)

- Three random places (one city, one small town, one territory place): the Personal screen and journal name the character's real high school and hospital where the place has them; the job screen lists the real school district, county and hospital among employers; the bank on record matches an FDIC branch in that town or county. A place with no listed high school shows the district's real one; a place with no row shows a regional-pattern name and the data marks it estimated.
- Tests: `local-institutions.test.ts` (every state/DC/territory compiles; a known CCD/CMS row resolves to its place); `school-stages` and `town-employment` tests updated (real name preferred, generator on miss, provenance correct); `town-finances` test (bank name and certificate come from one row).

## Depends on

- Queued Q7 part 2 (`ensureTownSeated` for every town; clinic kind `enterprise:health-clinic`) — name through this reader there, do not seat twice.
- Session 6 (pre-2021 school records use these names) and Session 7 (loading journal shows them).

## Open questions for the owner

- Should real PRIVATE companies (a real plant, a real store chain) appear by name, given that in play they can lay people off, lobby, bribe or go bankrupt? (a) Only public bodies, hospitals, colleges and banks get real names; private businesses get local-pattern names; (b) real private names too; (c) real names only for companies headquartered in the town.
