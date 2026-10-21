# Stopgap research, October 19, 2026

Five research agents worked the 112 open stopgap rows in `src/core2/data/stopgaps.json` whose kind waits on outside data, an estimate, a calibration or a rule. They worked from a machine that could reach government sites the cloud sessions could not.

Each file holds one result per stopgap row:

- `recommended` (or `recommendedValue`): the value, a distribution, or a table keyed by two-letter place code.
- `low` and `high`: the spread.
- `basis`: what the evidence says and how the value was derived.
- `sources`: each with `retrieved: true` and a short quote when the page was fetched, or `retrieved: false` when it could not be.
- `confidence`: `high`, `medium` or `low`. Low means no direct measure exists and the value is an estimate with a spread.
- `builderNote`: one line saying what to change in the code.

Totals: 112 rows (3 high, 31 medium, 78 low); 196 of 224 sources were fetched.

| File | Rows |
| --- | --- |
| `A-people-behavior-1.json` | 21 people-model settings (stress, needs, goals, traits, reserves, attendance) |
| `B-people-behavior-2.json` | 21 people-model and opening settings (retirement income, pay calendars, cash buffers) |
| `C-government-law.json` | 30 government, election and justice rows, per place where the rule varies |
| `D-economy-world.json` | 22 economy, housing, population and law rows |
| `E-careers-finance.json` | 18 people-model rows (kin, partnership, schools, health scale, drives) |

Known gaps: the Census data API now requires a free key, so county housing, property tax, district placement, marriage and partnership rows stay partly estimated. Ballotpedia, Pew, PubMed and SSA blocked automated reads. Territories are estimated where federal tables leave them out.

Line numbers in `src/core2/data/stopgaps.json` are stale for several rows; find each setting by its key name.
