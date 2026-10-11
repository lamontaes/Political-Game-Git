# M1-macro research intake

Status: blocked before implementation. CODEX-MACRO checked the publishing agencies and their terms on October 10, 2026 (America/New_York). This is a source inventory, not a downloaded history or a calibrated parameter set.

## Required owner decision: mortgage survey rights

The work order requires Freddie Mac's archived weekly 30-year mortgage survey and a measured policy-rate pass-through. The [general terms](https://www.freddiemac.com/terms), updated September 11, 2026, restrict automated collection and commercial exploitation of data and derived products without written permission. The [content policy](https://www.freddiemac.com/terms/linking) gives a narrower exception for publishing automatically updated PMMS data on a website. It does not clearly authorize historical ingestion, redistribution in game data, or calibration of a commercial game's derived rates.

No PMMS observations have been collected or committed by this session. Before that work, the CTO must confirm permission covering the intended collection and game use, or approve a different publishing source and the corresponding work-order/research-request change. A mirror does not resolve the original publisher's restrictions. A fixed pass-through or guessed coefficient would not answer the approved request.

This pause follows M1-common's source-permission rule. The scope, owned paths, and M1-02 test remain unchanged.

## Publishing sources and terms checked

| Required figures | Publisher and entry point | Terms and intake status |
| --- | --- | --- |
| Monthly unemployment | [BLS civilian unemployment](https://www.bls.gov/charts/employment-situation/civilian-unemployment-rate.htm); CPS series LNS14000000, seasonally adjusted percent | [BLS copyright policy](https://www.bls.gov/opub/copyright-information.htm): agency publications are public domain, with exceptions for previously copyrighted images. Numerical history not yet retained. |
| Monthly consumer prices | [BLS CPI](https://www.bls.gov/charts/consumer-price-index/consumer-price-index-by-category.htm); retain index levels, adjustment and units | Same BLS policy. Numerical history and adjustment choice not yet retained. |
| Monthly payroll jobs | [BLS total nonfarm employment](https://www.bls.gov/charts/employment-situation/employment-levels-by-industry.htm); CES0000000001, seasonally adjusted thousands | Same BLS policy. Numerical history not yet retained. |
| Quarterly real output | [BEA GDP](https://www.bea.gov/data/gdp/gross-domestic-product); NIPA table 1.1.6 for chained-dollar levels and table 1.1.1 for published growth | [BEA FAQ 147](https://www.bea.gov/help/faq/147): public domain unless otherwise stated; reproduction needs no specific permission. Numerical history not yet retained. |
| Policy and bank prime rates | [Federal Reserve H.15](https://www.federalreserve.gov/releases/h15/); distinguish effective federal funds from the FOMC target/range | Government-published statistics, permitted under M1-common's U.S. government-data rule. [Board policies](https://www.federalreserve.gov/website-linking-policies.htm) and [disclaimer](https://www.federalreserve.gov/disclaimer.htm) checked; third-party material has separate rights. Numerical history not yet retained. |
| Household consumer credit | [Federal Reserve G.19](https://www.federalreserve.gov/releases/g19/) | Same Board policies; consumer credit is not total household debt. Numerical history not yet retained. |
| Household and business debt | [Federal Reserve Z.1](https://www.federalreserve.gov/releases/z1/); choose household/nonprofit and nonfinancial-business debt securities and loans, preserving sector definitions | Same Board policies. Quarterly history must remain quarterly; no fabricated monthly observations. Numerical history and series selection not yet retained. |
| Weekly 30-year mortgage rate | [Freddie Mac PMMS archive](https://www.freddiemac.com/pmms/pmms_archives) | Restricted/unclear for intended commercial derived use; requires the decision above. No observations retained. |

No FRED or other mirrored observations are a source for this work. Full history must include enough pre-1990 levels to calculate changes beginning in 1990, then all released observations through the intake date. Retain release dates, units, adjustments, raw-file hashes, retrieval dates and terms alongside each acquired file. Latest observation means latest released, not an invented current-month value. Percentile bands and maximum one-month moves have not been calculated.

## Central-bank reasons checked

The [Federal Reserve's policy explanation](https://www.federalreserve.gov/monetarypolicy/monetary-policy-what-are-its-goals-how-does-it-work.htm) distinguishes short-term rates from longer-term rates, which also reflect expectations about future policy and economic conditions. It does not support treating a one-point policy move as an identical mortgage-rate move.

The [September 2026 FOMC minutes](https://www.federalreserve.gov/monetarypolicy/fomcminutes20260916.htm) describe concerns about persistent inflation and expectations, employment conditions, growth and uncertainty. These are calibration categories for fictional members' recorded reasons, not real identities to ship. No member weights have been calibrated and no decision rule has been written.

## Mortgage pass-through request

Request: `docs/research/requests/mortgage-rate-passthrough-from-policy-rate.json`.

Unresolved. The requested period-specific twelve-month coefficients and standard errors require authorized aligned target-rate and PMMS histories. A contemporaneous association also needs to be distinguished from a causal monetary-policy effect. Do not label an unmeasured coefficient SOURCED or mark the request answered.

## Session and validation status

- Builder: CODEX-MACRO, Codex (GPT-6 family; exact deployment identifier unavailable), package effort high because macro conditions feed prices, wages and loans. No helpers; no effort escalation.
- Base: `pool/M0-core-pieces` at `8249aaba6473ea2ca7ac483199d8f55b547bd704`.
- Contract and research intake only. M1-02 is not ready for its finisher and must stay unaccepted.
- Startup cloud checkout: clean branch `work` at `97ffc16950`; its package files are older than live main. Required current instructions were read through the GitHub connector.
- Git fetch failed connecting to the configured proxy on port 8080. No alternate network path was used.
- Startup `npm run bench` failed: missing script. No installed node_modules were present. No game/world/year run or paired speed measurement completed.
- Workspace registration initially failed at `/home/agent/.ocd-dev` during environment startup.
- GitHub Project claim has not been made; no connected Project mutation tool is available.
- Send-backs: 0. No finisher review yet. Usage is not exposed.
