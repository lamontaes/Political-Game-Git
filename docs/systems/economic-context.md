# Economic context

ECON-CONTEXT2 supplies dated real-world context from the already locked BEA
Regional, BLS LAUS, and HUD Housing products. It is a source read model, not an
economy engine and not simulated future state.

## Exact geography bindings

The source adapter's Lexington binding is versioned as
`economic-context.lexington-ky.v1`; the browser registration is
`economic-context.lexington-ky.v2`. Both use provider-native identifiers only:

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
  The full parent file is checksum-pinned as
  `80b0d29bde6e36e55adb737a0c953cd39fdaa9f5736b2f9200e89cd897a0fd06`
  but is classified `cached-not-committed` and is absent from a fresh
  checkout. Consequently, pre-2024 LAUS history is unavailable here. The
  committed 2024+ slice is the only replayable LAUS observation range; this
  delivery does not imply that the historical parent cache was recovered.
- HUD retains the locked FY2025 Fair Market Rent and income-limit products.
  Rent units are USD per month; income thresholds are USD per year. Because the
  compiled workbook record does not encode a release classification, the read
  model retains `release: null` rather than inventing “final.”

Corpus `asOf`, observation period/as-of, product vintage, adjustment, and
revision are separate fields. None is silently promoted to a source release
date. Source replay covers the expanded BEA corpus and manifest byte-for-byte.
It also invokes the existing `export:economic-context` producer in a scratch
directory and compares the compact Lexington projection byte-for-byte with
`src/presentation/generated/economic-context-lexington.json`. A stale value or
endpoint release therefore fails `npm run source:replay`; a corruption control
pins that sensitivity. This is separate from the full browser-corpus replay.

## Consumers and refusals

`buildEconomicContextReadModel` returns observations, availability, historical
comparisons, compatible analyst inputs, and NEWS publication candidates. Reads
clone source values/evidence and do not write a World. The metric bridge reuses
the existing World metric catalog rather than defining another economy. A
containing-state or containing-metro statistic has no Lexington World scope and
is explicitly unavailable for a canonical observation; a same-jurisdiction
statistic is also unavailable while the current locks do not evidence a
publication date.

Every historical comparison carries `earlierRelease` and `laterRelease`
directly from its two observation vintages. The fields are nullable: an
unestablished release classification remains null rather than becoming
`FINAL`. The comparison grouping and subtraction are unchanged. Observation
graphs likewise expose each point's nullable release classification in their
exact-value table, so a preliminary endpoint cannot be presented as an
unqualified historical comparison.

NEWS candidates have status `not-published`. A separate authorized publication
action would still be required. The adapter also encodes these interpretation
boundaries:

- an observation is not a forecast or a policy effect;
- a regional unemployment rate is not a personal probability;
- Fair Market Rent is not an offered or signed lease;
- annual area income is not cash in a player's wallet;
- real observations do not become simulated future values after a save diverges.

`playerEconomicContextLines` remains a compact browser-safe seam over the
generated Lexington projection. It requires the canonical simulation date and
returns an empty list for an unbound place. A row is shown only on or after the
conservative date by which the exact locked artifact proves it was retrieved.
Because exact source release dates are unavailable, the UI exposes
`knownAvailableOn`, its `retrieval-date-fallback` basis, and the full
`sourceRetrievedAt` instant while retaining `sourceReleaseDate: null`; it does
not backdate the row to its reference period or corpus vintage.

## Browser corpus and graphs

`npm run export:economic-context-browser` deterministically emits a browser
manifest plus 292 lazy shards under `public/data/economic-context/v1`. The
manifest indexes the full committed corpus—58,106 records—by exact provider
code, not by name:

| Product | Records | Exact geographies | Browser availability        |
| ------- | ------: | ----------------: | --------------------------- |
| BEA     |  35,496 |             3,597 | committed comparison window |
| LAUS    |  13,082 |                79 | committed 2024+ slice only  |
| HUD     |   9,528 |             4,934 | locked product vintages     |

`createEconomicContextBrowserProvider` accepts an explicit binding and
simulation date, then fetches only the manifest and shards capable of holding
those provider codes. It returns fresh projections and reports an exact-code
miss as unavailable. Tests replay every browser file byte-for-byte, prove that
a Lexington query loads only its six required resources, preserve the absent
LAUS parent checksum, and prove that reads do not mutate cached inputs.

The graph read model and `EconomicContextPanel` render only supplied records.
Observed BEA, LAUS, and HUD history is labeled `historical-observation`;
simulation history, drafts, forecasts, and outturn are separate typed record
classes. Missing values break a line and remain present in the exact-value
table. The locked BEA products contain no GDP series, so GDP is explicitly
unavailable. No slider or visual control derives a GDP response or other policy
effect.

The LEG estimate adapter accepts the owning system's typed conditional
incremental-outlay projection and labels it `forecast`; zero means the
proposal-specific incremental baseline, not a zero budget. It is not presented
as an appropriation, enactment, observed budget, or outturn. FISCAL has not
supplied a typed budget-history/outturn interface, so that graph remains
unavailable rather than being synthesized here. UI-core owns final normal-player
registration; the exact handoff is recorded in
`docs/agent/econ-context2-ui-core-handoff.md`.
