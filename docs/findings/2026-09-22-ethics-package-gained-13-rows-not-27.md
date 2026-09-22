# The ethics package gained 13 rows, not 27

Measured 2026-09-22 ~13:20Z from the package itself, before the number could
reach the 9am report.

## What was relayed

That state legislative ethics procedure is complete at 51 jurisdictions, that
"the 24 rows we already had are byte-for-byte unchanged", that "the file
actually gained 27 rows", and that ChatGPT undersold it in its own note as
"the last 13 states".

## What the package says

Counted from `/mnt/project-files/research/ethics-routing-research.json`:

| Field                              | Value |
| ---------------------------------- | ----- |
| `rows`                             | 51    |
| distinct `jurisdictionKey`         | 51    |
| `unresearchedJurisdictionKeys`     | `[]`  |
| `latestIncrement.newCount`         | 13    |
| `latestIncrement.priorRowsChanged` | 0     |

`latestIncrement.newJurisdictions` names them: GA, ID, IN, MA, MI, MS, MT, ND,
SD, TN, UT, VT, WY.

So the split is **38 prior + 13 new**. The package's own receipt,
`ethics-routing-validation.json`, says the same thing twice — "all 13
previously missing keys supplied" and "prior 38 rows structurally identical".
The 24/27 split appears nowhere in either file.

**ChatGPT's "the last 13 states" was accurate.** It was not an undersell, and
the correction was in the wrong direction.

Note also that the receipt says _structurally identical_, which is a weaker
claim than byte-for-byte unchanged. Bytes were not checked here either; the
weaker claim is the one the evidence supports.

## Two limits that must travel with it

- **`runtimeIntegrated` is `false` on all 51 rows**, and the package's own
  `engineeringScope` reads "Existing press/institutional registry and readers;
  no new full disciplinary engine or numerical behavior rules." This is
  research data. Nothing in the game reads it yet, so "complete" describes the
  research and not the player's experience.
- **`verificationOutstanding` names three jurisdictions**: WY (Joint Rule 22-1
  intake/screening/confidentiality text could not be verified directly), ID
  (House rule and committee procedural detail could not be read from the
  official host), UT (consolidated JR6 text and the 2026 SJR016 disposition not
  retrieved). "Zero unresearched" and "every row sourced" are both true, and
  neither of them closes these three.

## Why this is the same failure shape as the others

A claim travels further than its measurement, and this one was already one
hop from a report written for the project manager. The relayed numbers were
not a reading of the package; they were a summary of a summary, and the
summary disagreed with the receipt sitting beside it in the same directory.
Checking cost one `json.load` and a row count.

## Not taken into #283

#283 is 69+ files, has just come unconflicted after a sixth base merge, and is
being driven to green against a main that moves every few minutes. Adding 51
rows of data that nothing reads yet would widen it and restart the conflict
cycle for no gain to a player. The package wants its own pull request.
