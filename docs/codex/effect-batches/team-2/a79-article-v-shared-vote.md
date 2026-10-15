# Recorded Article V proposals use the shared member vote

Before: Congress's Article V proposal loop evaluated each member through a separate two-choice vote. An unanswered choice became a no vote.

After: The recorded proposal enters the shared chamber vote. Its actual body and seated members are validated. The existing constitutional writer applies the saved threshold. Other constitutional preflight callers remain unfinished.

## Why-chain

Measured source finding: the old congressional loop called the private member ballot after saving its proposal (`article-v.ts` at main `27badbb0f`, line 509). The private ballot asked the decision evaluator directly. Its two-option result became nay unless the selected option was yea. An unanswered result therefore supplied opposition without a recorded opposing choice.

Measured source finding: the candidate's congressional loop calls the shared adapter after the same proposal writer (`article-v.ts:564`). That adapter reads the saved proposal's policy answer and the actual congressional roster. It passes the same existing principle and constitutional-bar considerations into the shared vote.

Measured source finding: the shared vote preserves an unanswered member as present-not-voting (`chamber-votes.ts:618`). The causal chain now ends at that member's considered decision or withholding, rather than the caller substituting nay.

## Research

Measured primary-source reading: Article V requires two-thirds of both Houses to propose amendments and three-fourths of states to ratify them ([National Archives](https://www.archives.gov/founding-docs/constitution-transcript)). This patch changes no legal threshold, quorum, ratification route or deadline. The existing constitutional-bar consideration remains authored game design, not an empirical estimate of legislators' resistance.

## Revisions

Measured source finding: the new input arm validates the proposal at the historical cutoff and matches each supplied member to the actual saved congressional body (`chamber-votes.ts:229`). An ordinary event ID, future proposal, wrong body, duplicate seat or wrong purpose is refused. Its validated context key includes the saved proposal, body and purpose; direct mind-entity admission is unchanged.

Measured source finding: rejection-repeat prediction now reads the last actual rejected proposal through the same adapter (`article-v.ts:618`). It does not invent a future bill to predict a constitutional vote.

## What gets built

1. Add the constitutional-proposal arm to the existing chamber input and context dispatcher.
2. Reuse the existing principle and constitutional-bar considerations.
3. Migrate Congress's recorded proposal loop and its rejection-repeat comparison.
4. Preserve the existing constitutional rollcall writer, player absence and threshold.
5. Prove named non-neutral old/shared decisions, unanswered votes, identity refusal and canonical Save/Continue.

## Simulated, records, world pieces, checks

Measured: the comparison uses 435 actual House members and 100 actual senators. One real House member receives supplied strong principle records for a non-neutral comparison; those records are authored test inputs, not simulated persuasion (`constitutional-chamber-vote.test.ts:67`). The proposal is saved by the canonical constitutional writer before any ballot.

Measured: supplied empty considerations produce present-not-voting, while the supplied player ID is absent without a ballot. The canonical rollcall records 434 present-not-voting, zero nay and a 290-vote requirement with the saved proposal rule unchanged (`constitutional-chamber-vote.test.ts:199`). This is a contract test, not a naturally observed political refusal.

Measured: the actual rejected House rollcall remains a repeated rejection after canonical Continue. Making its first member controlled and absent changes that comparison to false (`constitutional-chamber-vote.test.ts:247`). No duplicate proposal or action is written by the repeat reader.

## Proof run

Measured: five focused cases passed in 34.00 seconds on the composed source (`/tmp/team2-a79-composed.log`). They cover both congressional bodies, the withholding/player/threshold contract, rejected-proposal repeat behavior, and negative identity admission. The same non-neutral inputs produced zero changed directions among 535 old/shared decisions. No assertion was removed or timeout increased.

Measured: the seed A79-recorded-constitutional-chamber selected Adams, Tennessee, from the 56 starting jurisdiction identities (`constitutional-chamber-vote.test.ts:26`). This is one populated starting world and its national Congress, not 56 populated-world proofs or an ordinary year run.

## Worked example

Measured: the saved proposal asked whether to write “Pay for a higher debt limit” into the Constitution. Yara Craig's supplied views produced yea in both the legacy ballot and shared route; all 435 House directions matched (`/tmp/team2-a79-composed.log:5`). This demonstrates preserved decision behavior, not a naturally filed amendment or a changed debt limit.

Measured: Sharon Wheeler voted nay in both routes, and all 100 Senate directions matched (`/tmp/team2-a79-composed.log:6`). The tested identity was constitutional-measure_3f762837edb7f2c6. No money moved in these vote fixtures, and neither ratification nor a fiscal effect was claimed.

## Method and handoff

Audit gap A79, first recorded Article V caller. Runtime source `ed921087e9ef18d9d4d5b66d7399d6ae6c34b92b` is composed with fetched main `f7ffc61a7`. Owned production hunks are the constitutional arm/context/dispatch in chamber-votes and the congressional proposal/repeat adapter in article-v. No shared mind-integrity, registry, catalog or threshold changes. This draft requires CTO core review before admission.

The old memberBallot remains for the unmigrated state constitutional preflight, which also votes before recording its proposal. Federal term-limit preflight needs a separate ordering repair. No fake measure was supplied to either caller. Council readings and Senate nominations already use the shared engine; their unchanged tests, the ordinary yearly Article V review, browser, full suite, all-56 populated worlds and exclusive year-speed comparison were NOT RUN. Full A79 is incomplete.

Native command: `node scripts/storage/cli.mjs run test -- node node_modules/vitest/vitest.mjs run src/simulation/governing/constitutional-chamber-vote.test.ts --maxWorkers=1 --fileParallelism=false --disableConsoleIntercept`, under the existing Team 2 storage guard. The old/shared comparison executes the retained private two-option evaluator and the shared three-option evaluator on identical people, proposal answer and seed. Three strict roots reported zero diagnostics; changed lint, formatting and whitespace passed. The committed release check passed. Zero-dice reported zero new findings and five inherited stale entries, exiting 1. Next: CTO review, then the separately authorized preflight ordering repair against actual recorded proposals.
