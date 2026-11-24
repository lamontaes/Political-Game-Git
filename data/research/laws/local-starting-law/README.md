# M1-laws research intake

Builder: CODEX-LAWS, Codex (GPT-6; exact deployment identifier unavailable).
Work order effort: high, because later engines depend on law in force.
Started (approximate): 2026-10-10 11:08:30 p.m. America/New_York (2026-10-11T03:08:30Z).
Finisher send-backs: 0. Usage: unavailable.

## Contract

M1-01: For a random place, tracked laws (minimum wage; income, sales and property taxes; major benefit amounts) match that place's real starting law at every level; a higher level's override wins where it legally does; a law that hasn't taken effect yet doesn't apply.

Research precedes the module. The approved work order and feature test are unchanged.
Starting base: `pool/M0-core-pieces` at `8249aaba6473ea2ca7ac483199d8f55b547bd704`.

## Source intake, checked October 10, 2026 (America/New_York)

- HHS FY2026 Medicaid notice, [89 FR 94742](https://www.govinfo.gov/content/pkg/FR-2024-11-29/html/2024-27910.htm): full notice opened; Table 1 covers all 56 jurisdictions. Effective October 1, 2025 through September 30, 2026. Preserve the disaster-adjusted and regular rates separately; Medicaid matching percentages are not benefits paid to residents.
- HHS FY2027 notice, [90 FR 54696](https://www.govinfo.gov/content/pkg/FR-2025-11-28/html/2025-21332.htm): notice located; all 56 numerical matching rates transcribed and structurally checked. Effective October 1, 2026 through September 30, 2027.
- USDA [FY2026 SNAP memorandum](https://www.usda.gov/sites/default/files/guidance-documents/fns.snap-cola-fy26memo.pdf): full official PDF opened. Maximum allotments by household size appear on pages 4 and 5, including three distinct Alaska areas. Effective October 1, 2025 through September 30, 2026.
- DOL [Significant Provisions, July 2026](https://oui.doleta.gov/unemploy/content/sigpros/2020-2029/July2026.pdf): official PDF opened from the [state law index](https://oui.doleta.gov/unemploy/statelaws.asp). Do not silently apply July figures to a January start; earlier dated editions and state changes still need checking.
- Census [ACS five-year developer documentation](https://www.census.gov/data/developers/data-sets/acs-5year.html): latest available release is 2024. ACS covers the states, D.C. and Puerto Rico, not the other four territories. County property-tax research must distinguish survey effective-rate estimates from statutory assessment rules. The API documentation currently requires a key; downloadable Census files are a possible alternative.

## Recorded terms

Federal numerical agency facts: U.S. government work, public domain under 17 USC 105. Checked [GovInfo policies](https://www.govinfo.gov/about/policies), Public Domain & Copyright Notice. Preserve attribution; third-party photographs or contributed material are excluded. No commercial-use prohibition was found for the official HHS and USDA numerical tables.

Census API: checked [Terms of Service](https://www.census.gov/data/developers/about/terms-of-service.html). Statistical analysis is permitted, respondent identification is prohibited, endorsement must not be implied, and API products must display the required notice. No API data has been incorporated yet. Prefer Census downloadable tables if that avoids an API-specific product obligation; check those terms first.

State and local source terms must be checked individually. No blanket federal-public-domain claim applies to them.

## Research status (OPUS-GOV, October 12, 2026)

All research is integrated through `scripts/research/build-starting-law.py`, which writes `src/core2/data/laws/starting-law.json` for the laws module (`src/core2/modules/laws.ts`). Rebuild it after any change here.

| File                                                                           | Kind                                             | Coverage                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sales-tax.json`                                                               | State and local sales tax, January 1, 2026       | All 56. State rates from the Tax Foundation January 2026 table, 11 checked against revenue departments; average local rate per state (estimate); 61 sampled cities with Census place codes, 24 from official rate tables; territories' gross-receipts and excise systems; 2026 rate changes |
| `property-tax-effective.json`                                                  | Effective property tax by county                 | 50 states, D.C. and Puerto Rico, 3,207 counties, ACS 2020-2024 (`scripts/research/export-acs-property-tax.py`); estimates. Guam, USVI, American Samoa and the Northern Marianas not yet researched                                                                                          |
| `local-income-tax.json`                                                        | Local income taxes                               | 50 states (16 allow them); 155 named jurisdictions: every Indiana and Maryland county, the largest cities elsewhere. Pennsylvania's and Ohio's full municipal tables not yet transcribed                                                                                                    |
| `local-minimum-wage.json`                                                      | City and county minimum wages                    | 71 cities and counties, 92 dated rows, from the UC Berkeley Labor Center inventory and ordinances                                                                                                                                                                                           |
| `minimum-wage-regions.json`                                                    | State minimum-wage regions                       | New York and Oregon, by county                                                                                                                                                                                                                                                              |
| `state-income-tax-married-2026.json`                                           | Married-filing-jointly state income tax          | 50 states and D.C.; the January 1 table is the law in force at the start, later 2026 acts are recorded beside it                                                                                                                                                                            |
| `territory-income-tax-2026.json`                                               | Territory income tax systems                     | All 5 territories: Puerto Rico's own code, Guam/USVI/Northern Marianas mirror codes, American Samoa's frozen code                                                                                                                                                                           |
| `state-effective-dates.json`                                                   | Default effective date and emergency-clause rule | All 56; not yet read by the effective-date rules                                                                                                                                                                                                                                            |
| `snap-maximums.json`, `unemployment-weekly-bounds.json`, `medicaid-match.json` | Benefit amounts                                  | As above; Alaska's rural SNAP areas are separate tiers, a place reads the urban amount until its area is mapped                                                                                                                                                                             |

## Research still required before implementation (original intake)

| Kind                                                       | Status                                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| State sales tax, all 56                                    | Not researched                                                          |
| Local sales tax samples and unsampled spreads              | Not researched                                                          |
| County property effective rates; assessment rules and caps | Source route identified; data not acquired                              |
| Local income tax                                           | Not researched                                                          |
| Local minimum wage                                         | Existing matrix needs primary-source and coverage check                 |
| Married-filer and territory income-tax systems             | Not researched                                                          |
| UI bounds, SNAP household tables, Medicaid match           | 112 Medicaid phases and 110 SNAP area phases transcribed; UI still open |
| Default effective dates and emergency clauses              | Existing metadata needs statute verification                            |

No missing fact has been entered as zero or permission. Research intake is not shipped starting law, and the feature remains `passes:false`.

## Startup evidence

The supplied checkout is `97ffc169508e0f4d5ff7a12726a2ef76b28668b7`, with no `src/core2`, no M1 packages and no installed dependencies. `npm run bench -- --help` fails with “Missing script: bench.” The required base is absent from the local object store. `git fetch origin main pool/M0-core-pieces pool/P14-laws` and HTTPS to GitHub both fail to connect to the configured proxy on port 8080. DNS resolves the proxy, but its endpoint is unavailable. GitHub connector reads/writes and connected-browser research work. No engine implementation or runtime proof has been attempted on this stale checkout.

The storage workspace command also fails creating the absent home registry directory. Reuse the supplied checkout when repaired; do not provision another repository.

## Completed intake and checks

`medicaid-match.json`: 56 place IDs, each with FY2026 and FY2027 phases (112 rows). FY2026 preserves the disaster-adjusted Medicaid match and its regular base as separate terms.

`snap-maximums.json`: 53 place IDs and 110 area phases across FY2026/FY2027. Each phase records households 1–8; FY2027 records the additional-person range and published cap at 18 or more. Area membership and nutrition assistance in the other three territories still need research. These are omissions in research, not shipped defaults.

Source tables were opened in full; USDA pages 4–5 were also checked visually in the official PDFs. Each row has a primary citation, retrieval date, estimate flag, effective/end dates and recorded reuse terms. Data remains unintegrated.

A dependency-free Node diagnostic passed exact Medicaid coverage against the existing 56-place matrix, provenance fields, date continuity, numerical bounds, the disaster adjustment and SNAP household monotonicity. Two earlier diagnostic attempts failed because they assumed the USDA cap and increment could be reproduced exactly from already-rounded allotments. Visual source checking confirmed the transcribed numbers; preserve the independent published amounts. The relaxed arithmetic sanity check allows a one-dollar rounding difference; it is not a change to M1-01's feature test.

`npm run zero-dice` passes on the supplied checkout. `npm run release:check -- --mode pr` cannot load `tsx`; no dependencies are installed. Typecheck, formatting tooling, the required base's bench and the paired year were not run. No M1-01 acceptance evidence or worker record exists.

Blocked at approximately six minutes of elapsed session work, including environment startup. No finisher send-backs. Owner action: repair the configured cloud proxy and supply a usable registered workspace/dependencies so the required base can be fetched and baseline checks can run. No scope or test change is requested.

## Continuation — 2026-10-11 04:58 UTC

GitHub fetch now succeeds. Reused the existing checkout, selected `pool/M1-laws` at `c4f8d11b402270af556a11a32c33db80be81af8e`, and confirmed its core-pieces base is still `8249aaba6473ea2ca7ac483199d8f55b547bd704`. Read the current M1-laws/M1-common contract from main, PR discussion, saved research, progress and branch log. Startup bench skipped per owner instruction.

Registered CODEX-LAWS's existing workspace with `OCD_STORAGE_STATE_DIR=/workspace/.ocd-dev`. Initial npm install failed because the default home cache did not exist (`ENOENT: no such file or directory, mkdir '/home/agent/.npm/_cacache'`); the storage-guarded retry with `/workspace/.npm-cache` installed 182 packages and changed one, with no tracked lockfile change. No registry policy bypass or repository copy.

Added research-only `unemployment-weekly-bounds.json`: 53 January 2026 DOL jurisdiction rows, primary source, PDF hash/page/excerpt, retrieval date and checked DOL public-domain terms. Dependent-allowance ranges, alternative earnings caps, and the uncapped allowance are distinguished. Three omitted territories remain explicit research gaps; no zero-benefit assumption. The diagnostic passed all-56 coverage partition, bounds and amounts against retained excerpts. Its first attempt rejected amounts followed by the PDF's superscript footnote 6; the diagnostic was corrected to recognize the footnote separately, preserving published values. No feature test changed. Census property API returned HTML titled `Missing Key`, not county data; no such data was incorporated.

The next state-tax source request failed. Command:

```sh
curl --fail --show-error --location --max-time 30 https://www.azdor.gov/business/transaction-privilege-tax --output /tmp/M1-laws-state-sales-second-source.html
```

Exit code: 22. Exact error:

```text
curl: (22) The requested URL returned error: 403
```

This is a source HTTP denial, not a recurrence of the old GitHub proxy connection failure. Stopped further research, implementation and validation at this failure as instructed; only preservation and this PR report followed. No live module, generated-world proof, local gate or paired-year result is claimed. M1-01 remains **not ready for its finisher**.

Model/effort/time/send-backs: CODEX-LAWS / Codex, GPT-6 family per session instructions; exact deployment identifier, runtime reasoning setting and usage unavailable. Package-requested effort high because later engines depend on this law read; no runtime setting verification. Helpers none. First captured UTC timestamp `2026-10-11T04:55:58Z`; stop/report timestamp `2026-10-11T04:58:27Z` (2 minutes 29 seconds between them, excluding earlier startup and reads; total elapsed unavailable). Finisher/owner review send-backs this continuation: 0. Infrastructure events: missing storage home resolved with supported workspace state-directory selection; missing npm cache resolved with workspace cache; missing Census API key unresolved; state-source HTTP 403 caused this required stop. Earlier PR startup blockers and send-back reports remain preserved.

Next: resolve access to the denied primary source (or a usable official endpoint), finish the remaining eight-kind research gaps, then import lifted rules and implement the approved module. No scope, owned-path or feature-test change requested.
