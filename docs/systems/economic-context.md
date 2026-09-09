# Economic context

ECON-CONTEXT2 supplies dated real-world context from the already locked BEA
Regional, BLS LAUS, and HUD Housing products. It is a source read model, not an
economy engine and not simulated future state.

## Exact geography bindings

The Lexington binding is versioned as `economic-context.lexington-ky.v1` and
uses provider-native identifiers only:

| Product    | Provider identity           | Relationship               |
| ---------- | --------------------------- | -------------------------- |
| BEA CAINC1 | county FIPS `21067`         | same jurisdiction          |
| BEA MARPP  | MSA code `30460`            | containing metro           |
| BEA SARPP  | state FIPS `21000`          | containing state           |
| BLS LAUS   | area code `ST2100000000000` | containing state           |
| HUD        | HUD FIPS `2106799999`       | same jurisdiction/HUD area |

Names are labels carried by matched records. They are never join keys. The
locked seasonally adjusted LAUS slice contains Kentucky statewide series but no
record for the Lexington local-area code; an exact local request therefore
returns `unavailable` and cannot fall back through the word “Lexington.”

## Product scope and vintage

- BEA compiles the declared 2019, prior-year, and latest-year comparison window
  from the existing CAINC1, SARPP, and MARPP artifacts. Units remain the
  publisher's units, including dollars, thousands of dollars, persons, and
  indexes.
- LAUS retains the existing seasonally adjusted 2024-and-later QA slice. Each
  observation retains its series, measure, area code, period, unit, footnotes,
  and preliminary/final state. A missing published value remains `UNKNOWN`.
- HUD retains the locked FY2025 Fair Market Rent and income-limit products.
  Rent units are USD per month; income thresholds are USD per year. Because the
  compiled workbook record does not encode a release classification, the read
  model retains `release: null` rather than inventing “final.”

Corpus `asOf`, observation period/as-of, product vintage, adjustment, and
revision are separate fields. None is silently promoted to a source release
date. Source replay covers the expanded BEA corpus and manifest byte-for-byte;
`npm run export:economic-context` deterministically rebuilds the compact browser
projection from those tracked corpora.

## Consumers and refusals

`buildEconomicContextReadModel` returns observations, availability, historical
comparisons, compatible analyst inputs, and NEWS publication candidates. Reads
clone source values/evidence and do not write a World. The metric bridge reuses
the existing World metric catalog rather than defining another economy. A
containing-state or containing-metro statistic has no Lexington World scope and
is explicitly unavailable for a canonical observation; a same-jurisdiction
statistic is also unavailable while the current locks do not evidence a
publication date.

NEWS candidates have status `not-published`. A separate authorized publication
action would still be required. The adapter also encodes these interpretation
boundaries:

- an observation is not a forecast or a policy effect;
- a regional unemployment rate is not a personal probability;
- Fair Market Rent is not an offered or signed lease;
- annual area income is not cash in a player's wallet;
- real observations do not become simulated future values after a save diverges.

`playerEconomicContextLines` is the browser-safe normal-player seam. It formats
three dated Lexington context lines from the generated projection and returns
an empty list for any place without an exact binding. UI-core owns the final
append in `PlayerGame.tsx`; the exact handoff is recorded in the active/completed
delivery plan.
