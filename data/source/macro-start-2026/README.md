# Observed national macro opening reference

This packet retains primary 2026 observations used to estimate a fictional
save's starting conditions. It does not assert that these observations were
known on the save's January 5 opening date. Reference period, publisher release
date, retrieval time and the save's effective date remain separate.

## Sources and units

| Field | Observation | Period | Release | Retained source |
| --- | --- | --- | --- | --- |
| Real GDP growth | 2.2% annualized | Q2 2026, third estimate | September 30 | BEA release, opening paragraph |
| Unemployment | 4.2% of civilian labor force, seasonally adjusted | September 2026 | October 2 | BLS Employment Situation summary |
| CPI-U all-items change | 3.4% over twelve months, not seasonally adjusted | August 2026 | September 11 | BLS CPI release, opening paragraph |
| Total housing stock | 149,454,000 units | Q2 2026 | July 28 | Census HVS Table 3 |
| Occupied housing units | 133,811,000 units | Q2 2026 | July 28 | Census HVS Table 3 |
| Financial conditions | NFCI −0.548, standardized index | Week ending September 25 | September 30 | Chicago Fed series through official FRED CSV |
| Target policy rate | 3.75–4.00% | Effective September 17 | September 17 | Federal Reserve target-rate table |

The artifact lock records actual URLs, retrieval timestamps, byte sizes and
SHA-256 hashes. Raw publisher bytes are unchanged. Reacquisition creates a new
reference vintage; it must not silently replace a saved starting condition.

Chicago Fed citation: Federal Reserve Bank of Chicago, *Chicago Fed National
Financial Conditions Index [NFCI]*, retrieved from FRED, Federal Reserve Bank
of St. Louis, <https://fred.stlouisfed.org/series/NFCI>, October 2, 2026. FRED
marks the series “Copyrighted: Citation Required.” Citation and provenance stay
in source records and developer documentation, not player screens.

## Existing game mappings and their limits

Published GDP growth and CPI percentage changes become the existing
continuous-rate state through `100 * detLog(1 + percent / 100)`, rounded by
`roundMacro`. Unemployment remains a labor-force percentage.

Housing uses total physical stock divided by occupied housing units, with
occupied units representing recorded households. This is a stock-occupancy
proxy. It does not measure latent household formation, affordability, units
available for sale or rent, or unmet demand. Total stock includes seasonal and
off-market units. The existing housing classification bands still interpret
the ratio; this mapping and that interpretation are explicit CTO review choices.

NFCI is a standardized financial-conditions index, not an APR or a loan-denial
probability. It supplies the credit input to the existing startup logistic
mapping and its existing coefficient. No new coefficient, survey-category
weight, per-world spread or outcome draw is introduced. The index is an
aggregate proxy; its relationship to the game's credit state remains a declared
model interpretation for CTO review.

The observed-start variant leaves absent regime, volatility and drawn latents
null. It preserves the reference observations and digest, housing counts and
policy-rate range. The existing starter and monthly handler consume it. Existing
monthly dynamics and their provisional response parameters are outside this
starting-source repair and remain unchanged.

## Reproduction

Run `node scripts/world/compile-macro-opening-reference.mjs --check` through the
repository storage guard. The compiler validates every locked artifact, extracts
the observations, checks their periods/releases and rejects duplicate or
non-finite fields. It compares the generated runtime packet byte-for-byte.
