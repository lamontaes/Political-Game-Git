# Session 36 progress

## Current item

B14 corruption Part 4 (public records anyone can read), branch
`codex/lw03-federal-tax-terms`, base `e591ffc637d1f6db84d2ff920e8662ce123202ed`.

## Changed files

- `src/simulation/press/public-record-readers.ts`
- `src/simulation/press/public-record-readers.test.ts`
- `src/simulation/press/matters.ts` (only `produceRivalComplaints` and the new
  public-record rival reader)
- `docs/release/changes/b14-corruption-part-4.md`
- `docs/codex/evidence/b14-corruption/part-4-public-records.md`

The helper reads only a public contract-award, disclosure-filing or payroll
posting attached to an occurrence. A rival decision uses `randomness: "none"`;
only a referral links the artifact and files through the existing complaint
writer. No new occurrence or evidence writer was added.

## Limits and next work

The current main tree has no act-side public contract-award, disclosure-filing
or payroll-posting producers; the oversight-body record has no person ID for a
regulator decision, and press desk stories do not yet consume evidence artifacts
without a public event. The focused test was refused by the storage guard:
22 GiB available versus a 25 GiB reserve. Do not bypass the guard.

Next: run `OCD_STORAGE_STATE_DIR=/tmp/session36-storage OCD_WORKSPACE_OWNER=session36 npm run storage -- run test -- src/simulation/press/public-record-readers.test.ts --reporter=dot --silent=false` when storage admission permits; then run the repository typecheck including test files, record actual output, and add a watched random-place route when the public-record producers and reader actors exist. Keep the PR draft until that proof is available.
