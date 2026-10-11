# M1-laws research intake

Builder: CODEX-LAWS, Codex (GPT-6; exact deployment identifier unavailable).
Work order effort: high, because later engines depend on law in force.
Started: 2026-10-10 11:08:30 p.m. America/New_York (2026-10-11T03:08:30Z).
Finisher send-backs: 0. Usage: unavailable.

## Contract

M1-01: For a random place, tracked laws (minimum wage; income, sales and property taxes; major benefit amounts) match that place's real starting law at every level; a higher level's override wins where it legally does; a law that hasn't taken effect yet doesn't apply.

Research precedes the module. The approved work order and feature test are unchanged.
Starting base: `pool/M0-core-pieces` at `8249aaba6473ea2ca7ac483199d8f55b547bd704`.

## Source intake, checked October 10, 2026 (America/New_York)

- HHS FY2026 Medicaid notice, [89 FR 94742](https://www.govinfo.gov/content/pkg/FR-2024-11-29/html/2024-27910.htm): full notice opened; Table 1 covers all 56 jurisdictions. Effective October 1, 2025 through September 30, 2026. Preserve the disaster-adjusted and regular rates separately; Medicaid matching percentages are not benefits paid to residents.
- HHS FY2027 notice, [90 FR 54696](https://www.govinfo.gov/content/pkg/FR-2025-11-28/html/2025-21332.htm): notice located; values need transcription and validation. Effective October 1, 2026 through September 30, 2027.
- USDA [FY2026 SNAP memorandum](https://www.usda.gov/sites/default/files/guidance-documents/fns.snap-cola-fy26memo.pdf): full official PDF opened. Maximum allotments by household size appear on pages 4 and 5, including three distinct Alaska areas. Effective October 1, 2025 through September 30, 2026.
- DOL [Significant Provisions, July 2026](https://oui.doleta.gov/unemploy/content/sigpros/2020-2029/July2026.pdf): official PDF opened from the [state law index](https://oui.doleta.gov/unemploy/statelaws.asp). Do not silently apply July figures to a January start; earlier dated editions and state changes still need checking.
- Census [ACS five-year developer documentation](https://www.census.gov/data/developers/data-sets/acs-5year.html): latest available release is 2024. ACS covers the states, D.C. and Puerto Rico, not the other four territories. County property-tax research must distinguish survey effective-rate estimates from statutory assessment rules. The API documentation currently requires a key; downloadable Census files are a possible alternative.

## Recorded terms

Federal numerical agency facts: U.S. government work, public domain under 17 USC 105. Checked [GovInfo policies](https://www.govinfo.gov/about/policies), Public Domain & Copyright Notice. Preserve attribution; third-party photographs or contributed material are excluded. No commercial-use prohibition was found for the official HHS and USDA numerical tables.

Census API: checked [Terms of Service](https://www.census.gov/data/developers/about/terms-of-service.html). Statistical analysis is permitted, respondent identification is prohibited, endorsement must not be implied, and API products must display the required notice. No API data has been incorporated yet. Prefer Census downloadable tables if that avoids an API-specific product obligation; check those terms first.

State and local source terms must be checked individually. No blanket federal-public-domain claim applies to them.

## Research still required before implementation

| Kind | Status |
| --- | --- |
| State sales tax, all 56 | Not researched |
| Local sales tax samples and unsampled spreads | Not researched |
| County property effective rates; assessment rules and caps | Source route identified; data not acquired |
| Local income tax | Not researched |
| Local minimum wage | Existing matrix needs primary-source and coverage check |
| Married-filer and territory income-tax systems | Not researched |
| UI bounds, SNAP household tables, Medicaid match | Primary federal sources opened; transcription in progress |
| Default effective dates and emergency clauses | Existing metadata needs statute verification |

No missing fact has been entered as zero or permission. Research intake is not shipped starting law, and the feature remains `passes:false`.

## Startup evidence

The supplied checkout is `97ffc169508e0f4d5ff7a12726a2ef76b28668b7`, with no `src/core2`, no M1 packages and no installed dependencies. `npm run bench -- --help` fails with “Missing script: bench.” The required base is absent from the local object store. `git fetch origin main pool/M0-core-pieces pool/P14-laws` and HTTPS to GitHub both fail to connect to the configured proxy on port 8080. DNS resolves the proxy, but its endpoint is unavailable. GitHub connector reads/writes and connected-browser research work. No engine implementation or runtime proof has been attempted on this stale checkout.

The storage workspace command also fails creating the absent home registry directory. Reuse the supplied checkout when repaired; do not provision another repository.
