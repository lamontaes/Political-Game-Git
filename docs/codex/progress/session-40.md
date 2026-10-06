# Session 40 resume marker

Base: `e591ffc637d1f6db84d2ff920e8662ce123202ed`  
Branch: `session40/lw10`

## Current work

- LW-03: the federal income, sales, payroll, and corporate tax-term rows use the existing `tax` kind and name the current `bindTaxLawTerms(world, { law, questionKey, proposalId, onDate, cutoff })` consumer interface. Draft PR #2476 already contains these same row/test/release hunks at head `30b5fa8`; reuse that work rather than publishing a duplicate row writer. Session 9's generic binder is still draft PR #2480 at full head `15d3a3069be4b845b39d43a15ce1da9bac3b5ddb`. Its matrix excludes payroll/corporate and preserves unsupported authority as unavailable. No federal named-person runtime proof is claimed.
- Exact consumer contract question: what source-backed power instrument and saved liability/base identity bind federal payroll-tax terms, given that existing paycheck liabilities use separate federal withholding law keys; and what saved corporate payer/incidence record makes a federal corporate-tax assessment name a person? Do not infer a rate, authority, base, or shareholder allocation.
- LW-10: the federal mandatory-minimum row is attached to the federal policy question in `src/simulation/policy-pack-us-federal-positions.ts`. Its colocated module test confirms the canonical `legal-outcome` handler admits the action. The generated manifest is updated. There is no current federal starting-law question or enacted provision with a floor and covered offenses, so the state-law sentence proof cannot be reused as federal evidence. Stock-trading remains without a row because person-level covered trades are not recorded.

## Verification

- Focused Vitest via `/tmp/session40-vitest.config.mts`: 5 tests passed across the LW-03 policy-pack suite and LW-10 module suite. The repository Vite config cannot spawn `git` in this sandbox (`spawnSync git EPERM`), so the custom config was used.
- Targeted ESLint and Prettier passed; `npm run check:law-consequence-modules` and `git diff --check` passed.
- `npm run typecheck` reported only the known `press-premise.test.ts:35,125` missing `PlaySettings.personalLifeDepiction` fixture fields.

## Next

1. Recheck `git status --short` and compare the LW-03 files with draft #2476 before publishing; do not open a duplicate LW-03 row PR.
2. Ask CTO for the canonical federal payroll/corporate power and saved-liability contract, keeping those rows unavailable until one is supplied.
3. Continue the independent LW-10 source/proof search; do not claim federal law-to-person proof without an actual federal law provision and saved defendant event.
4. Split LW-03 and LW-10 into separate PR scopes, include this marker, then push each branch. The local GitHub fetch was blocked by the unavailable proxy; a push has not been attempted.

Resume with:

```sh
cd /workspace/Political-Game-Git
git status --short
git diff --check
```
