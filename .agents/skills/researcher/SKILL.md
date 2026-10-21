---
name: researcher
description: >
  Turn a stopgap or TUNABLE number in Our Civic Duty into a SOURCED or
  ESTIMATED one, and record how it calibrates the simulation, never how it
  decides an outcome. Use for every `kind: research` pool item.
---

# The researcher

## What research is for here

The owner's words (Oct 14 and 16, 2026): research calibrates the simulation
and never adds a step to the player's life; "no numbers are locked in"; "it's
a simulation, so it calibrates from real life." A real rate checks a town's
totals against the world; it never picks one actor's outcome (`no-dice`). A
source never appears on a player's screen (`research-habit`). You source a
number so the proof can say the town behaves like a real one, not so the
engine can look it up and obey it.

## Taking an item

1. Claim a `kind: research` item from the pool before you read anything:
   `npm run pool -- claim <id> --branch <branch>`.
2. Read every stopgap row the item lists in `src/core2/data/stopgaps.json`
   (`whatItFakes`, `why`, `replacement`) and the parameter rows in
   `src/core2/data/parameters.json` (or the area table it names) that carry
   `stopgapId` or the TUNABLE tag.
3. Read the engine that reads the parameter (`grep -rn "P\.<key>\|parameter(\"<key>\")" src/core2`)
   and write down, in one sentence, what the number does in play: what it
   scales, when it is read, which record it changes. If you cannot say it, you
   are not ready to source it.

## Finding the source

- Public and citable, with a year and a unit. Prefer official statistics:
  Census (ACS, CPS, CBP), BLS (JOLTS, OEWS, CES, CPI), CBO, FEC, NCHS, SSA,
  state and local records. Academic surveys (GSS, ATUS, Pew) next. A secondary
  summary only when the primary is gone, and say so.
- Calibrating from any source is allowed (owner, Oct 15: it is like an author
  inspired by a book; no credit, no note). What is not allowed is shipping a
  copyrighted table in the game. A licensed dataset calibrates a value and its
  spread; its rows never land under `data/`.
- A figure that varies by place obeys one rule, all 56 places: a per-place
  table under `data/research/<area>/` keyed by GEOID or postal code, read by
  the engine; never a state named in logic. Places the source lacks (the
  island areas, often) take the median of the sourced places, marked
  ESTIMATED with that reason, never left out.
- Unusable: a figure with no year, no unit, or no public page; a number you
  recall but cannot point at; a source whose terms you cannot read.

## Recording it

- **The parameter row.** `value`; `tag` SOURCED (the figure itself) or
  ESTIMATED (derived, averaged, or a stand-in for the places the source
  lacks); `citation` with the publisher, table, year and URL; `spread` with
  `low`, `high`, `unit` and its own `citation` (the range across places,
  years or cohorts the proof checks against); `estimatedFrom` saying how it
  was derived. The tripwire (`src/core2/tooling/tripwires.ts`) asks an
  ESTIMATED row for `estimatedFrom` and a `stopgapId`; a TUNABLE row for a
  spread or an `unmeasured` reason. Keep `stopgapId` on an ESTIMATED row and
  leave its `estimated-parameter` stopgap open until the figure is SOURCED.
- **The research file.** `data/research/<area>/<source>-<year>.json` in the
  repo's shape (see `data/research/housing/acs-2024-owner-moved-in.json`):
  `id`, `publisher`, `vintage`, `table`, `title`, `universe`, `geography`,
  `sourceUrl`, `retrievedOn`, `limits`, then the rows. A file must have a
  reader or `tests/guards/research-data-has-reader.test.ts` fails: the engine
  imports it, or a script derives the parameter row from it and says so in
  the row's citation. Never add to `scripts/audit/research-data-allowlist.json`
  to get past the guard.
- **The stopgap row.** Set `status: resolved` with a `resolution` naming the
  source, the new tag and what reads it. Never delete a row.
- **Not a threshold.** If the engine uses the number as a cap, a cutoff, a
  fixed step or a chance ("if x > P.key"), do not source it. File a pool item
  (`<area>-<engine>-<key>-as-cause`, kind bug) for the area's builder quoting
  "Sliding scales and causes", and leave the row open with that id in the
  stopgap's `replacement`.

## Applying it to the game

- **A population rate** (a quit rate, a birth rate, turnout, a share of
  households) calibrates a band the proof reports against. Its row's `spread`
  is the band; `checkRange` points at a target in
  `src/core2/tooling/calibration-targets.json`, read by
  `src/core2/tooling/calibration-guard.ts` and the tripwires. The engine never
  reads the rate to decide who quits; the proof counts who did and checks the
  town lands in the band.
- **A price or an amount** (a fee, a wage, a benefit, a rent) is read by the
  engine at the moment it pays, per place, from the per-place table; the
  parameter row holds the national figure and the spread across places.
- **A behavior** ("how likely someone is to…") is not a probability. It
  informs the weights in the person's own reasons (traits, money, closeness,
  the law in force), and the proof checks that the town's total lands in the
  band. A row that would be read as a chance is the threshold case above.

## Proof and PR

- One PR per item, or per engine family when one source feeds several rows.
- Body line 1: `Pool item: <id>`. Then a table, one line per row: before (old
  value and tag) / after (value, tag) / source (publisher, year) / what reads
  it (file and function).
- Gate line: `npm run typecheck`, prettier on changed files, the parameter
  tests (`npx vitest run src/core2/tooling/tripwires.test.ts src/core2/tooling/calibration-guard.test.ts`),
  `npm run zero-dice`, `npx vitest run tests/guards/research-data-has-reader.test.ts`,
  and the test of each engine whose read you touched.
- A proof run: `buildBenchWorld`, a drawn place from all 56, the seed named,
  one year; report each band and where the town landed.
- Never edit engine logic beyond the parameter read. If logic must change,
  add a pool item for the area's builder and name it in the body.

## Cloud rules

- `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` on every npm
  command; never ask the owner to confirm it. Never `npm ci`.
- Claim before building; one item at a time. Never merge your own PR; the
  CTO gates and merges.

## Paste prompt (owner)

> Read AGENTS.md and .agents/skills/researcher/SKILL.md in lamontaes/Political-Game-Git, then docs/pool/INDEX.md. Act as the researcher: claim the highest-priority open `kind: research` item, read its stopgap rows and the engine that reads each parameter, find a public source with a year and a unit, and record it as a SOURCED or ESTIMATED parameter row with citation and spread, a research file under data/research with a reader, and the stopgap row resolved. Research calibrates the simulation; it never decides an outcome, and no source is shown to the player. If an engine uses the number as a cap, a cutoff or a chance, file a bug for the area's builder instead of sourcing it. Open one draft PR per item with the item id on line 1, a before/after/source/what-reads-it table and a gate line. Never merge your own PR, never npm ci, and set OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command.
