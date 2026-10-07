# Session 95 resume marker

## AU-01 in progress

- Branch: `session95/au-01-ready`
- Starting head: `e591ffc637d1f6db84d2ff920e8662ce123202ed`
- Done: federal-rule-pack identity branches now ask the federal pack registry and read its jurisdiction; Article V policy amendments and presidential-term-limit amendments now register the same state-action handler, which requires actual state chambers and sourced ratification admission.
- Still required: finish folding the state and federal `proposeAndVote` paths into the canonical amendment proposer and verify whether the remaining constructed Congress IDs can be replaced by pack-owned values without changing persisted IDs.
- Board limitation: this environment has no Git remote and `gh auth status` reports no authenticated GitHub host, so `Session 95 takes AU-01` and READY could not be posted on issue #2424.
- Baseline limitation: `npm run typecheck` reaches existing missing `personalLifeDepiction` properties in `src/simulation/press/press-premise.test.ts` at lines 35 and 125.
- Focused run: 139 tests passed; 5 state-program tests fail at the preexisting executable-action-window fixture, 2 long generated-world tests exceeded their 30-second limits, and the federal presentation assertion observed 12 state actions rather than 50 after the shared actual-chamber handler refused unsupported admissions.

## Exact next command

`rg -n "function proposeAndVote|export function proposeAndVote|proposeAmendment\\(" src/simulation/living-world/constitutional-reform.ts src/simulation/living-world/federal-reform.ts src/simulation/governing/article-v.ts`
