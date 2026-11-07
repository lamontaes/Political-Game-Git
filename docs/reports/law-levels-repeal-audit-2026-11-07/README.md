# Starting-law reversal audit

The generated-game audit now finds an authorized reversal draft for every current row it checks, including industry-specific wage and regional benefit tiers. Ten fresh draws pass. American Samoa also passes with all seventeen industry wage rows included. These are real drafts through the bodies in each game; they are not a claim that every bill wins its votes or that every downstream effect has been proved.

[Records](records.json) give the complete American Samoa route list and the ten fresh draw summaries. Leloaloa, American Samoa (`territory:AS:leloaloa`), replay `c4c8bc63e3d8fcd2`, has 91 current rows and 91 authorized drafts. Its world seed and each law, body, policy and bill ID are in that file.

The test reads the opening law table, keeps date-effective rows, and selects the latest row per jurisdiction, level, series and tier. It excludes levels the shared resolver sets aside. It includes all current tiers loaded for the state's jurisdictions, so it also covers regional rows beyond the default general-tier answer. There is no list of exempt laws. Statistical calibration facts are stored separately by their producers and do not masquerade as statutes.

| Place                      | Replay             | Current rows / authorized drafts |
| -------------------------- | ------------------ | -------------------------------- |
| Black Canyon City, Arizona | `21a38bd22f234b24` | 81 / 81                          |
| Ashton, Idaho              | `6eec63f00dcf3e53` | 81 / 81                          |
| Westcliffe, Colorado       | `de642eb9d80c9a6b` | 81 / 81                          |
| Berthoud, Colorado         | `1dac634bc12fea58` | 81 / 81                          |
| Proctor, Vermont           | `83a8b50bec782916` | 82 / 82                          |
| Table Rock, Wyoming        | `6dff458c00b5b764` | 80 / 80                          |
| Bodfish, California        | `a8e525b16c6df47c` | 81 / 81                          |
| Medford, Minnesota         | `a7a6b32cc7597969` | 82 / 82                          |
| Loomis, Nebraska           | `94cee3c2f8f28bd8` | 82 / 82                          |
| Equality, Alabama          | `588df3f6d0f3855d` | 80 / 80                          |

The audit exposed three producer/catalog gaps, repaired on main:

- Local sales-tax averages were statistical facts stored as state law. #7331 separates them without changing their sourced values.
- State unemployment insurance had no program control. #7332 adds repeal and restoration of existing programs while retaining their terms. The old declaration that every state must run it was unsupported: [26 U.S.C. §3304(a)(19)](https://www.law.cornell.edu/uscode/text/26/3304) expressly reserves legislative amendment or repeal. This audit removes that false exemption from the older wiring catalog.
- Combined property-tax survey estimates were stored as county statutes, including Connecticut planning regions with no county legislative body. #7333 separates the calibration from laws and preserves the reader's fallback amount.

The raw local-minimum-wage-authority row has an existing concrete route through `us-policy-positions:labor-workforce.local-minimum-wage-authority`. The audit drafts that policy through the actual state body; the existing wage handler writes the authority series. No state wage bar is changed.

Break-it check: removing the unemployment-program catalog entry makes Redstone Arsenal, Alabama, replay `2ee24a776e9e4f03`, fail with 80 current rows and 79 drafts. Restoring the entry passes the fresh draws above. A new game in Oak Park, Michigan, replay `55f6979dd463e915`, opened and played four weeks.

## Limits and remaining work

This is exhaustive drafting coverage for the loaded current rows, not a complete legal-procedure or effect audit. For yes/no questions it reverses the answer; for amounts it proposes zero or a positive replacement. A missing program in AS, GU or MP still needs explicit establishment terms to produce benefits; a draft alone does not establish them. Individual property-tax levies remain an aggregate calibration. Existing starting-date carry estimates remain estimates. The federal-reach source audit and final combined speed proof are still open. The separate played state and Congress enactment/repeal proofs, with native bill-paper screenshots, are on main in #7323 and #7326.

Reproduce one draw (the command prints every route):

```sh
OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 GOLDEN_PATH_SEED=c4c8bc63e3d8fcd2 npm exec -- vitest run src/core2/starting-law-repeal-routes.test.ts --reporter=verbose
```
