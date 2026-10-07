# Four member-vote callers share their existing reason weights

Before: Four callers copied the decision engine's weight table when choosing which reasons to display.

After: Those callers use the existing signed consideration score's magnitude. Vote choices, negative reason magnitudes and equal-weight input order remain unchanged. This removes duplicate reason arithmetic while retaining the existing decision engines and recorded subjects.

## Why-chain

Measured source: a displayed reason comes from considerations on the selected option, ranked by magnitude (`chamber-votes.ts:835`). Magnitude comes from the existing importance and confidence scale. The old copies used that same scale. Its signed score needs an absolute value here because an opposing consideration previously kept its full reason magnitude. Equal magnitudes retain input order. Bedrock: existing reasons from the actor's records, interpreted through the unchanged authored ordinal scale.

## Research

Measured source: considerationScore already exposes the signed importance-times-confidence calculation (`decisions.ts:392`). This patch reuses that existing contract. The weights remain authored simulation choices, not empirical estimates. No real-world rate, new number or decision formula is added.

## Revisions

Measured source: four reason sorters replace their private multiplication with the absolute shared score (`joint-assembly.ts:213`). Their existing option filters remain intact. The joint assembly still considers only supporting reasons. The ordinary member account still takes two explanations. The constitutional and term-limit callers keep their existing reason identifiers.

Remaining A79 work: the ordinary member and joint assembly still use their existing chooser and context contracts. This slice consolidates their reason arithmetic; it does not migrate those subjects into a different member-vote entrypoint. General-policy preflight ordering remains a separate held decision.

## What gets built

1. Reuse the existing score in the chamber reason sorter.
2. Reuse it in the term-limit ballot reason sorter.
3. Reuse it in the ordinary member's decisive account.
4. Reuse it in the joint assembly's strongest reason.
5. Remove the four copied weight tables without changing the shared table.

## Simulated, records, world pieces, checks

Measured fixture: the existing governor seed selects Ansonia, Connecticut, from 49 admitted state profiles inside the full 56-jurisdiction pool (`governor-constitutional-vote.test.ts:48`). The opening supplies actual state legislators. Three actual members receive a controlled saved bill; two receive authored support and opposition beliefs through the canonical writer. These views are supplied test inputs, not naturally formed opinions.

Measured fixture: all 187 actual state legislators participate in the joint assembly comparison (`governor-constitutional-vote.test.ts:348`). Its existing caucus nominees remain candidates without newly invented person records. The ordinary bill's durable decision traces and the assembly's ballots are retained as comparison evidence.

## Proof run

Measured: the bounded candidate passes all 32 cases across four focused files (`/tmp/team2-a79-reason-weight-bounded-candidate.log`). Coverage includes all 24 importance, confidence and direction combinations, all 576 ordered pairs, negative magnitude and equal-weight input order. Existing constitutional recording, refusal, absence and canonical Continue checks remain selected.

Measured: the identical main fixtures also pass all 32 cases (`a79-reason-weight-proof.json`). All ten emitted receipts match exactly, including ordinary member dispositions, accounts, complete durable traces and every joint assembly ballot. The main and candidate runs use the same saved people, bills and supplied beliefs.

## Worked example

Measured: Jordan Murray votes yea on the controlled ordinary bill because his authored saved belief supports its explicit answer (`/tmp/team2-a79-reason-weight-bounded-candidate.log`). The second actual member votes nay from the authored opposing belief. The third answers present. Jordan's joint assembly reason remains his own caucus. These are controlled fixtures, not an ordinary year or naturally filed law.

## Method and handoff

Audit gap A79. Executed main base is 8a02acfa4548185e4f0b5f12a678bf6c822a9128. The four production changes are only released imports, reason sorts and private table removal. decisions.ts is byte-identical to main. Chooser, context and trace code are protected.

Five final strict roots have zero diagnostics. Changed lint, format and whitespace checks pass. The release gate reports an inherited CI declaration error; the owned declaration parses and exact main bytes reproduce that CI failure. Zero-dice reports zero new findings and five inherited stale entries. Spelling reports 24 inherited findings and none in this batch. The baseline receipt comparison is complete. Earlier fixture setup failures are preserved. A 151-member durable-trace case timed out at the unchanged 30-second limit; it is NORESULT. The final fixture exercises three actual members with distinct recorded views. Full suite, year speed, all-56 populated worlds and natural filing were NOT RUN. No merge or complete A79 claim.
