# Session 40 resume marker — LW-03

Base: `e591ffc637d1f6db84d2ff920e8662ce123202ed`  
Working branch: `codex/session57-lw03` (continuing the existing draft PR #2476)

## Work so far

- Reused the federal tax-term rows already on #2476 instead of adding a duplicate row implementation.
- Added a focused assertion in `src/simulation/policy-pack-tax-terms.test.ts` that each federal income, sales, payroll, and corporate row is admitted by the existing registered `tax` handler using its current payer selector and assessment action.
- Consumer interface remains `bindTaxLawTerms(world, { law, questionKey, proposalId, onDate, cutoff })`; the current resolver already calls this seam.
- Session 9's generic binder is draft #2480 at head `15d3a3069be4b845b39d43a15ce1da9bac3b5ddb`. It covers federal/state/county/city income, sales, property, and excise; payroll and corporate are outside the table and remain unavailable.
- No federal starting-law entry or current federal enactment/provision with a custody floor and offense coverage exists. No federal law → effect → named-person proof is claimed.

## Verification

- Focused `policy-pack-tax-terms.test.ts`: 4/4 passed using the minimal Vitest config because the repository Vite config's source-identity plugin hits `spawnSync git EPERM` in this sandbox.
- Targeted ESLint, Prettier, and `git diff --check`: passed.
- Full typecheck is running; resume by polling the existing process or rerun `npm run typecheck`.

## Next

1. Obtain the exact canonical power instrument and saved liability/base contract for federal payroll and corporate terms; leave them unavailable until then.
2. Rebase the draft onto #2480 after it lands and run the federal tax law → effect → named-person proof only from records that exist in a new random-place game.
3. Do not open a second LW-03 PR; update #2476 with any further LW-03 changes.

Resume with:

```sh
cd /workspace/session40-lw03-consumer
git status --short
git diff --check
npm run typecheck
```
