# Retired research index

These source files are preserved for historical review and are not runtime inputs.

| Preserved source                                                           | Retirement reason                                                                                                                                          | Current runtime source                                                                                    |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [State minimum-wage raise terms](labor/state-minimum-wage-raise-term.json) | Assumed raise increments and annual steps are no longer read. A passed law must carry its own adopted numeric terms.                                       | Filed law terms and the canonical dated starting-law rows in `data/research/laws/starting-law-2026.json`. |
| [Local minimum-wage premium](labor/local-minimum-wage-premium.json)        | The assumed city premium is no longer read. A city's adopted wage floor must come from its saved law, rather than a percentage applied to the state floor. | Filed local law terms through the same final-law-term query.                                              |

Retirement preserves the original JSON bytes; it does not admit new legal values or remove the historical evidence.
