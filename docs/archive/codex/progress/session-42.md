# Session 42 resume marker

## Current item

- b13-p4, appeals.
- Exact owned files: `src/simulation/justice/appeals.ts` and `src/simulation/justice/appeals.test.ts`.
- Scope claim: #2424 comment 6015841252. Eviction source-contract question: #2424 comment 6016112310.
- Separate draft PR from b13-p3; keep p3 PR #2474 and its adapter intact.

## Done

- Criminal sentencing appeals use saved judgment/case/referral data, existing sourced custody bounds, `evaluateDecision`, dated appellate seats, saved judge votes, and recorded public appeal events.
- Unsupported/eviction matters fail closed pending the exact saved eviction bounds/case contract; acquittals also fail closed.
- Focused test: `npx vitest run src/simulation/justice/appeals.test.ts --reporter=dot` passed 6/6.
- New-game random-place proof seed `b13-p4-appeals-random-place-proof` generated place key `1663910` (Idaho) and player Haris Warren. Burglary bounds: 12–120 months with Idaho sentencing source citations. A 130-month test judgment reversed; 60 months affirmed; upper-bound test covers edge-of-law handling.
- Full typecheck was run; test-import scan covered 798 files and reported zero unresolved imports. Recheck exit status before PR publication if needed.

## Remaining

- Publish this bounded p4 draft PR and report its exact head/check state on #2424.
- Continue work on independently supported criminal appeals while awaiting the owner’s exact eviction contract; do not invent civil bounds or change eviction writers without that contract.
- Obtain hosted checks and normal-game appeal integration proof; current generated-world proof constructs a canonical test judgment and seats a test appellate judge, it does not claim normal docket appeal wiring.
- The p3 scene-consumer contract/proof remains separately blocked in PR #2474; Session 4 question is #2424 comment 6015641379.

## Next command

Publish only the two p4 owned files and this marker to `codex/session42-b13-p4-appeals` based on current main `e591ffc637d1f6db84d2ff920e8662ce123202ed`, create a draft PR, then post its head/checks and precise outstanding proof/contracts to #2424.
