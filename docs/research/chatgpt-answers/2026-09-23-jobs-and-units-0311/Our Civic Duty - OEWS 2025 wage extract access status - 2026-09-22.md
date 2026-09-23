# May 2025 OEWS nationwide occupation extract was blocked

The official BLS release has the requested occupation employment and wage estimates for 50 states, D.C., Puerto Rico, Guam, and the U.S. Virgin Islands. It does not include American Samoa or the Northern Mariana Islands. I could not retrieve the official downloadable workbook in this environment, so no CSV was produced and no row or jurisdiction counts are claimed.

## What the official files establish

The May 2025 OEWS tables page links the all-data XLSX/TXT products and state tables. The May 15, 2026 technical note explicitly lists cross-industry estimates for the nation, states, D.C., Guam, Puerto Rico, and the U.S. Virgin Islands, plus about 530 metro and nonmetro areas. That is 54 of the requested 56 state/territory jurisdictions: 50 states, D.C., and 3 territories. American Samoa and CNMI are not in the stated coverage. [OEWS May 2025 tables](https://www.bls.gov/oes/tables.htm); [May 2025 release and technical note](https://www.bls.gov/news.release/archives/ocwage_05152026.pdf).

This is an employer survey of wage-and-salary workers in nonfarm establishments, not a census of all workers. The May 2025 estimates combine six semiannual panels from November 2022 through May 2025. BLS defines employment as estimated wage-and-salary employment by occupation. Wage estimates are straight-time gross pay with stated included and excluded components. They describe market estimates; they do not establish a particular employer's offer, the hours a job provides, or an actual game character's compensation. Annual wage estimates should not be converted into promised earnings or offers. [Technical note](https://www.bls.gov/news.release/archives/ocwage_05152026.pdf).

The official tables page links the state archive as `https://www.bls.gov/oes/special-requests/oesm25st.zip` and all-data archive as `https://www.bls.gov/oes/special-requests/oesm25all.zip`. The size of those archives was not verified because their bytes could not be retrieved here. The separately listed [BLS time-series directory](https://download.bls.gov/pub/time.series/oe/) is a different product and was not used as a substitute for the May 2025 state archive.

## Retrieval result and data disposition

On September 22, 2026, I attempted to retrieve the linked state archive directly. The BLS host returned HTTP 403 from the local environment. The browsing tool also refused the ZIP because it does not support the ZIP content type. This prevents byte-level inspection and extraction here; it is not evidence that BLS lacks the dataset.

| Deliverable check | Result |
|---|---|
| Requested CSV | Not created; zero data rows delivered |
| Official source SHA-256 | **UNKNOWN**; ZIP bytes were not retrievable |
| Extracted row count | Not measured |
| Extracted geography count | Not measured |
| Officially stated coverage | 54 requested jurisdictions: 50 states + D.C. + Guam + Puerto Rico + U.S. Virgin Islands |
| Explicit OEWS coverage gaps | American Samoa and Northern Mariana Islands |

I did not create placeholder rows, turn suppressed values into zero, or infer territory estimates. No `AREA`, `OCC`, wage, employment, or publication-code fields have been copied into a partial file.

## Reproducible extraction plan

When the official ZIP is accessible, retrieve `oesm25st.zip` from the BLS tables page and record the downloaded archive's SHA-256 before parsing. Preserve source area and occupation identifiers and names, all supplied employment and wage estimate fields, and every publication/suppression code verbatim. Use the state and territory rows as BLS publishes them; do not substitute metro estimates or assign any area estimate to a game town. Reconcile area identifiers against the official area reference file, count each distinct area code and jurisdiction, and report missing areas separately from records with suppressed estimates. Keep `ANNUAL` and `HOURLY` units and their footnotes explicit. Do not calculate a local, town, employer, or player wage from the annual estimate.

## Report check

The CSV extraction was not run because the official archive could not be retrieved. All coverage statements above come from the linked BLS pages and May 2025 technical note. This report intentionally carries no extracted row count or source archive hash.
