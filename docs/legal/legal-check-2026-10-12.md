# Legal check (M7-05), research review, Oct 12, 2026

A research review for the owner, not legal advice. An attorney reviews all of this before release. It lists what the repository records today and where the record is missing. Nothing here was changed in the data or art.

## What this means for early access

- **Data:** most sources are US government works and are clean. Four groups need a decision before release (below).
- **Art:** the larger risk. 88 of 134 recorded art entries are AI-generated with the rights status "unknown", and the 5,193 people-engine images have no per-file record.
- **Credits:** the repository has no top-level license file, no credits screen and no asset-rights register.

## Data sources

| Source | Feeds | Status in the repo | Action |
| --- | --- | --- | --- |
| Census, BLS, BEA, NCES, CMS, HUD, FEMA, NOAA, federal courts | `data/source/*` | Public domain, US government work (lock records it) | Credit Census where the lock sets `attributionRequired` |
| Regional data locks (business patterns, economic census, household mix, housing and commute, CBSA, pay period, consumer expenditure) and `acs-county-citizenship` | `data/source/*` | No rights field; the citizenship set has no lock | Add rights fields (probably public domain) |
| O*NET 31.0 | `data/source/career-occupations` | CC BY 4.0, attribution required | Show the credit "O*NET 31.0 Database, USDOL/ETA. Adapted under CC BY 4.0." in a shipped credits screen |
| State statutes, constitutions, municipal codes | several `data/source/*` | Enacted text is not copyrightable; some rows say "UNKNOWN" | Replace UNKNOWN with a rights status per row; use primary government text, not publisher annotations |
| Council of State Governments, Book of the States 2023 | `data/source/book-of-the-states` | Noncommercial; README bars shipping; `scripts/world/check-data-shipping.mjs` rejects it in builds | Confirm raw files are not packaged; pay now comes from `official-office-pay` |
| SHEEO higher education finance FY25 | `data/source/higher-education-finance` | License not recorded; private nonprofit | Check SHEEO's terms before release |
| CRS Report 97-1011 (member pay), EveryCRSReport mirror | `data/source/crs-member-pay` | No rights field; third-party mirror | Re-source from congress.gov |
| Clerk of the House and NGA data | `data/source/electoral-calibration-2024` | No rights field; NGA pages not clearly free | Record rights; Clerk is a government work |
| Owner's research workspace (92L judicial selection, 92N fiscal authority) | `data/source/judicial-office-selection`, `state-local-fiscal-authority/research-input` | Owner-authorized use only; no redistribution terms; origin is a research write-up | Verify the claims against primary sources before release |
| NCSL, Ballotpedia, Wikipedia, Justia, KFF, Pew, Tax Foundation and similar | citations in `data/research/*` | Citations only | Facts are fine; confirm no prose is copied and the research files are not in the build |
| Fonts: Cinzel, Fira Sans, Andada Pro | `public/fonts/kit12` | SIL OFL 1.1, texts shipped | Keep the license files in the build |

## Art and images

| Group | Where | Origin | Gap |
| --- | --- | --- | --- |
| Provenance register | `art/manifest/provenance.json` | 88 AI-generated (rights "unknown"), 46 procedural dev fixtures (owned) | Model and version "not-recorded" for 80; generator terms (Gemini, Firefly, Scenario, Cursor) not recorded anywhere |
| People engine | `art/people-engine/v1` (5,193 images) | AI-generated, per docs | No per-file provenance; no record that no real person's likeness was used |
| Place backdrops (430) | `art/backdrops` | AI-generated; includes state capitols | Approvals are placeholders, not rights clearance |
| Campus backdrops (52) | `art/campuses` | AI redraws of Wikimedia Commons photos | 23 are CC BY-SA, which may carry ShareAlike to derivatives; no credits screen; real institution names |
| Phone-camera files | `art/references/candidates/recent-drive-sweep/source-images/IMG_*` | Unknown | Declare origin |
| Texas Capitol plans | `art/references/plans/texas_senate` | Library of Congress HABS | Likely public domain; record it |
| Civic symbols | `art/manifest/civic_symbols.json` | None acquired | Good: no real seals in the repo; keep a rights log when acquired |
| Branding, UI kit, og image | `public/branding`, `public/ui`, `public/og.png` | In-house, undeclared | Record author and rights |
| Murmur controller | `desktop/private-controller/vendor/murmur` | Apache-2.0, LICENSE and NOTICE present | None |

No real logos, trademarks or audio files were found.

## Before release (in order)

1. Settle the AI-generated art terms and resolve the 88 "unknown" entries in `provenance.json`; add a per-pack record for the people engine.
2. Decide how to handle the 23 CC BY-SA campus references, and build a credits screen (O*NET, Census where required, campus photo artists).
3. Verify the owner-research files (92L, 92N) against primary sources.
4. Check SHEEO's terms; re-source the CRS member pay.
5. Fill in the missing rights fields on the data locks.
6. Confirm the build excludes Book of the States and the research folders.
7. Add a top-level license and an asset-rights register.
8. Attorney review.

## Real politicians

PENDING: the check for real officeholders' names in shipped data is still running; this section is filled in below.
