# B23 Local names: real public bodies, hospitals, colleges and banks; generated private businesses

Bank id b23 (spec file `b23-real-local-names.md`) · Phase "Living world" · Unlocks the "reads like home" half of every town: the school, hospital, bank and employers people recognize.
Code checked at origin/main ec9a9601a.

## What the player experiences

In a real town the places around you carry the names people there know. Your character went to the town's real high school, was born at the real regional hospital, banks at a real local bank, and neighbors work for the real school district, county government, college or hospital. Where kids have no high school of their own, they attend the real one their district sends them to. Private shops, plants and offices are different: the game makes up their names from the town itself (families who live there, streets, the county), so nothing is fake "Hickory Ridge" filler, nothing is a national chain, and no two businesses in a town share a template. Names never come with citations or "estimated" labels on screen.

## Owner decisions it rests on

- Owner ruling Oct 5: private companies get GENERATED names from the town's own records (family names, streets); real names only for public bodies, hospitals, colleges and banks; no national chains. (This closes the spec's open question: option a.)
- Register Sept 26: "If the real school exists in the game's data, use it by name; if not, generate one in real naming patterns." Roadmap: real places keep real names, not generic businesses in pairs. Sept 28 #3: real banks per town, calibrated from FDIC data.
- Employers rule (Register :93; `docs/research/requests/employers-and-job-listings.json:43`): a verified public body name is used; a verified name does not create a vacancy.
- Session 12 is removing every single-place special case (Lexington etc.): b23 uses ONE generated path for every place and adds no per-town branch.
- Zero dice at play (names come from the seeded world, as today). Nothing blank (estimate from similar places and mark it in data only). One rule for all 50 states, D.C. and territories. One writer per record kind. Delete what you replace.

## Existing code to extend (verified)

- `src/simulation/school-names.ts:271 generateSchoolName`, `:377 measuredSchoolName` (private), `:431 generateSchoolNames`; stock list including "Hickory Ridge" at :133. `SCHOOL_NAMES_V3_VERSION` at :169.
- `src/simulation/school-stages.ts:823 stageSchoolNames` hard-codes `SCHOOL_NAMES_V2_VERSION` (:835); `:323 recordedSchoolFor`; `:425 schoolNameToday`. `src/presentation/production-world.ts:1753` still builds "<town> public school" (legacy, comment :1722). `character-history.ts:3390` calls `generateSchoolNames` for adults' pasts (version param :3367).
- `src/education/catalog-load.ts:57 loadEducationCatalog` (CCD 2024-25 + IPEDS in `public/education/`); `education/catalog.ts:40 institutionDateReason`.
- `src/simulation/living-world/town-employment.ts`: hospital `name` at :613 (`${town} Regional Hospital`), clinic :629, bank workplace :527, `CIVIC_MINIMUM :1052` used :1728 (every town gets hospital and clinic), `townEmploymentMix :150`, `writeTownEmployer :1281`. Name styles `MORE_NAMES :271`, with stock phrases the new rule removes ("Hometown Fitness", "Country Mercantile", "Hometown Janitorial", "Farmers and Merchants Bank", "Citizens Bank", "Peoples Bank", "Heritage Care Center", "Family Care Clinic"). Families come from `townFamilyNames :385` (real residents of the town: keep); streets come from a fixed generic list `TOWN_STREETS :245` (Main, Oak, Maple, Washington...), which is NOT the town's records.
- `src/simulation/local-economy.ts:80` onward (`LOCAL_BUSINESS_KINDS`, names like `${family}'s Market`), `LOCAL_BUSINESS_MAX_PER_KIND = 2` at :160.
- `living-world/town-finances.ts:306 observedBankPool`, `:355 recordedBankShape`; `town-bank-shapes.generated.ts:74 FDIC_SMALL_BANK_RECORDS` (certificate and assets, no names); compilers `scripts/research/compile-fdic-town-banks.py`, `compile-fdic-county-deposits.py`.
- Pattern to copy: `src/simulation/nationwide-world/local-governments.ts:457 ensureLocalGovernmentOrganization` (`source-record` provenance when an official list names the body; provenance union at `types.ts:1376-1388`). Estimate convention: `local-business-counts.ts:220 localBusinessSupplyFor` ("ESTIMATED FROM AVERAGE ..." basis strings, county to state to nation).
- Places: `life-places.ts:1021 lifePlaceByJurisdictionId` (field `sourceGeoid :134`), `residentNameForJurisdiction :399`; `government-units.ts:319 countyGeoidsForPlace`. `scripts/source/` holds the compilers; `data/research/places/` does not exist yet; `data/source/MANIFEST.json` exists.
- Newer code covering part: none; `local-institutions` does not exist.

## Build steps (each is one PR)

1. **One compiled file, one reader.** `scripts/source/local-institutions.ts` builds `data/research/places/local-institutions.json` keyed by place GEOID: `{highSchools, districts, hospitals, banks, colleges, largeEmployers}`, rows `{name, kind, sourceKey, sourceId, asOf}`, plus a county section for county-only matches; add to `data/source/MANIFEST.json`. Reader `localInstitutionsFor(world, jurisdictionId)` in new `src/simulation/local-institutions.ts` using `sourceGeoid`, falling back to the county section. Real rows only for public bodies, hospitals, colleges, banks.
2. **Schools use the real name.** `stageSchoolNames`, `production-world.ts` and `character-history.ts:3390` take the real high school and district from the reader first, the generator second. Fix the v2 hard-code at `school-stages.ts:835` (use the world's version). Years before 2024-25 carry the present name back, marked estimated in data; `institutionDateReason` still refuses enrollment terms, not the name. Delete the "<town> public school" legacy line.
3. **Hospitals, clinics, banks.** `town-employment.ts` hospital, clinic and bank workplaces take the reader's rows with `source-record` provenance. `CIVIC_MINIMUM` seats a hospital worker only where the town or county has one (use the nearest listed county hospital before generating; a town with none never gets one invented). `town-finances.ts` matches a town's bank by the FDIC certificate from the same row so name and money are one bank.
4. **Private names from the town, one path.** In `writeTownEmployer` and `local-economy.ts`, private names are built only from the town's own families (`townFamilyNames`), its county, and its real street names; no national chain names. Replace the stock phrases in `MORE_NAMES` and the generic `TOWN_STREETS` with rows built per place; raise or drop `LOCAL_BUSINESS_MAX_PER_KIND` duplication so no two businesses in a town share a template shape. Public employers (district, county, college, hospital, state offices) are seated first from the reader. No Lexington-style branch: if Session 12 has not landed, do not touch those branches, and never add one.
5. **All places.** One test loops all 50 states, D.C. and territories (CCD and CMS include PR, GU, VI; AS and MP take the estimate rule).

## Must not build

Hand-entered per-town name lists or any single-place case; a second school or employer generator (the existing ones become the fallback); names on screen with sources, "estimated" or "real" badges; invented hospitals or high schools; vacancies created because a name was found; real private company names, national chains or brand names; OpenStreetMap or licensed business databases as a source.

## Research tables

In repo: CCD 2024-25 and IPEDS (`data/source/education`, `public/education`), FDIC compilers. One download each, 10 minutes max, U.S. government, names are facts: CMS Hospital General Information (name, city, state, ZIP, county); FDIC Summary of Deposits branch file (NAMEFULL, CITYBR, STCNTYBR, CERT: re-run the existing compiler keeping names); Census TIGER/Line road names by place or county (the missing source for streets; if the lookup fails the streets row is the current generic list marked estimated). Join key: place GEOID, county fallback. Estimate rule for a kind a place has (CBP counts, district map) but no row names: generated, basis "ESTIMATED FROM AVERAGE: no official listing names this <kind> in <place>; named in the <state> pattern", data only.

## Done when

Three random places (a city, a small town, a territory place): the Personal screen and journal name the character's real high school and hospital where the place has them; the job screen lists the real district, county and hospital among employers; the bank on record matches an FDIC branch in that town or county; private businesses read as local (family, street, county) with no chain names and no repeated template. A place with no high school shows its district's real one; a place with no row shows a regional-pattern name and data marks it estimated. Tests: `local-institutions.test.ts` (every state, D.C. and territory compiles; a known CCD or CMS row resolves to its place); updated `school-stages` and `town-employment` tests (real name preferred, generator on miss, provenance correct); `town-finances` test (bank name and certificate from one row); a test that no generated private name matches a banned chain list and no stock phrase from the old `MORE_NAMES` survives; a grep test that no place-name literal appears in the naming path.

## Proof to post

Under `docs/codex/evidence/b23-real-local-names/`: screenshots of the Personal screen, journal and job list in the three places; printed reader rows with their sources; the generated private names of one town with the family, street and county each came from.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."

Open owner questions named in this doc: none (private names ruled). Open items, each with its switch:

- Street source: a data row `streetNamesFor(place)` returns TIGER names when compiled, else the generic list marked estimated; the lookup replaces the data only.
- Which employers count as "large": one function `largeEmployerThreshold(place)` from CBP size classes; changing it edits that function only.
- If `ensureTownSeated` (Q7 part 2) or Session 12's cleanup has not landed: build steps 1, 2, 3 and 5 now, step 4 on the current `writeTownEmployer` without removing any place-special branch, and call the new reader from the seating code when it lands.

## Standing rule (owner, Oct 5)

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."
