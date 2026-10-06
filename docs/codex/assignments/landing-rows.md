# The landing rows: how a place measure's monthly change reaches named people

Source of the rule: owner rulings of Oct 5 (6:35 and 6:55 p.m.): every one of the 56 place measures lands on a person's record, even at zero effect; nobody is notified; records decide who (top share by the measure's change); all 36 missing person records are built for 1.0. Session 20 brief: `cto-notes/briefs-2026-10-05.md`, Session 20 entry.

## Row shape

Each measure is one DATA ROW, never per-measure code: `kind | record type | writer or source id | ranked inputs`. Zero change writes a zero record with the cause.

Four kinds:

- FLAG: rank residents by the recorded risk inputs named in the row; the top share (equal to the change in points) flips the state.
- AMOUNT: scale every recorded amount of that record type.
- EXPOSURE: every address gets the value, accumulated.
- EVENT: rank by recorded exposure; the top share gets the event through the existing writer.

## What the notes contain

The approved walkthrough's per-row tables (measure key, kind, record, writer, inputs) are NOT in the local notes or the Drive "Effects audit" and "Effects boxes" docs. The notes hold only the rule, the counts (56 measures, 20 existing records to rewire, 36 missing person/household records) and the two replacements (crime sampling at `crime/causes.ts:129` and `producer.ts`; births at `town-family-plans.ts:448`). Rows found: 0 of 56. Crime and births are the two known existing rewires; their kind and inputs are not in the notes.

Session 20 derives every row from `law-batches.md` LW-11 to LW-32 and `data/research/outcome-web/links.json` (47 measures with links) and `place-outcome-bases-2024.json`.

## 20 existing rewires

| law or measure key                  | kind                                                                    | record type      | writer or source id                                             | ranked inputs    | status                             |
| ----------------------------------- | ----------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------- | ---------------- | ---------------------------------- |
| crime offenses (four town offenses) | not in the notes: Session 20 derives it from law-batches.md LW-11…LW-32 | not in the notes | `crime/producer.ts` (replace sampling at `crime/causes.ts:129`) | not in the notes | known rewire, row not in the notes |
| birth rate                          | not in the notes: Session 20 derives it from law-batches.md LW-11…LW-32 | not in the notes | `town-family-plans.ts:448`                                      | not in the notes | known rewire, row not in the notes |
| 18 more existing records            | not in the notes: Session 20 derives it from law-batches.md LW-11…LW-32 | not in the notes | not in the notes                                                | not in the notes | not in the notes                   |

## 36 missing person/household rows

Brief names the groups: health flags, housing flags, exposures, amounts, school records (in families).

| law or measure key | kind                                                                    | record type      | writer or source id | ranked inputs    | status           |
| ------------------ | ----------------------------------------------------------------------- | ---------------- | ------------------- | ---------------- | ---------------- |
| 36 rows            | not in the notes: Session 20 derives it from law-batches.md LW-11…LW-32 | not in the notes | not in the notes    | not in the notes | not in the notes |
