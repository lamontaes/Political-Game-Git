# Sponsored votes read party cues, but the saved receipts lack full score traces

The voting engine reads a bill's sponsor, the member's party and the member's principles. State floor voting does not supply a constituency input; one council route supplies a shared place input. Existing comparison receipts contain unsponsored development probes, and the inspected national receipts omit ballot components. They cannot establish the three largest principle contributions or party and district terms for a real sponsored vote. Teams need to preserve those inputs and components before claiming that diagnosis.

## Measured source routes

Measured source at fd4925e6a6dae3446d2fefe40df2cfc2d2ef931e: the actual module is src/simulation/governing/chamber-votes.ts, rather than src/simulation/chamber-votes.ts. There are nine non-test direct call sites in six files, excluding the function definition. The four amendment sites include predictions as well as a recorded amendment vote.

| Caller | Inputs relevant to party and constituency |
| --- | --- |
| src/simulation/governing/legislative-clock.ts:457 | Seated state/Congress floor route supplies members, question, player ballot, optional contested flag and nonpartisan flag. No constituencyId is supplied. Older unseated scenarios use authored counts at line 450. |
| src/simulation/governing/council-lawmaking.ts:283 | Supplies constituencyId equal to jurisdictionId at line 304, executivePersonId and nonpartisan flag. |
| src/simulation/municipal-ordinance-procedure.ts:336 | Ordinary council reading supplies members and player ballot; no constituencyId, executivePersonId or nonpartisan override is supplied here. |
| src/simulation/governing/governor-bill-decision.ts:122 | Override prediction supplies seated members and governor knowledge context, but no constituencyId. |
| src/simulation/governing/amendment-authors.ts:312 | Four calls, at lines 312, 341, 354 and 538, cover bill lean, cached predictions and the amendment vote. They supply nonpartisan; the inspected inputs omit constituencyId. |
| src/presentation/legislation-session.ts:108 | Scenario member-decision reader supplies members and player ballot, without constituencyId. |

Measured sponsor lookup: the engine requires the measure at src/simulation/governing/chamber-votes.ts:200. Party lookup uses a seated member's partyKey when available, otherwise publicPartyOf, at line 217. Congress lookup includes both chambers at line 204. The sponsor's party comes from measure.sponsorPersonId at line 226; cosponsors come from measureCosponsors at line 225. An amendment uses its offeredBy author at line 236. Override, cross-party amendment and appropriation can make a question contested at line 261.

## Measured scoring and the constituency gap

Measured scoring: src/simulation/governing/chamber-votes.ts:668 supplies own-bill or cosponsor support as strong/high. Same-party sponsor support is moderate/medium; contested other-party opposition is slight/medium at line 705. Nonpartisan suppresses party cues at line 695. Other-party membership on an ordinary uncontested bill supplies no party term at line 704.

Measured evaluator units: importance times confidence produces dimensionless decision points at src/simulation/decisions.ts:373. The mappings at lines 45 and 51 give own-bill/cosponsor support 12 points, same-party support 4 points and contested other-party opposition 2 points. These are authored engine weights, not measured legislative behavior; the source identifies that limitation at src/simulation/governing/chamber-votes.ts:59.

Measured principle units: each signed raw contribution is saved strength times four times catalog weight at src/simulation/governing/officeholder-principles.ts:119. Bill answers reverse the sign for a no answer at line 164. A zero sum produces no principle consideration at line 167. Nonzero magnitude is converted to slight/moderate/strong/decisive at thresholds 3, 6 and 9, defined at line 24. High confidence yields 3, 6, 12 or 18 decision points; raw principle scores are not added directly to party points.

Measured constituency behavior: src/simulation/governing/chamber-votes.ts:280 computes one shared constituency consideration for the entire body when constituencyId is supplied. It does not select each member's own district here. The state floor route's omitted input therefore prevents this consideration from being computed there. That is a source-path omission, not a measured zero district score in a saved ballot.

Measured constituency calculation: src/simulation/governing/constituent-views.ts:39 reads settled voter views for the supplied place and bill answers. The gate at line 64 requires unequal salience-weighted sides and a distinguishable headcount split; the normal-approximation threshold is 1.96 at line 34. A two-to-one weighted lead is moderate/medium, otherwise slight/medium at line 74: 4 or 2 decision points. Empty, tied or insufficient views return null. These gates and weights do not establish how real officials weigh constituents.

Measured additional terms: commitments/private beliefs enter through memberVoteConsiderations at src/simulation/governing/chamber-votes.ts:343. Executive and budget deadline cues enter at line 366. Committee recommendation and trusted colleagues enter only for members without their own view at line 437. Their absence from an exported receipt does not establish zero contribution.

## Preserved evidence and missing sponsored proof

Measured saved comparison: docs/codex/handbacks/team-2-georgia-all-catalog-weight-comparison.json:7953 explicitly describes paired replay rather than recorded floor votes, and line 7954 says the probes have no sponsor. Its CSV header at docs/codex/handbacks/team-2-georgia-all-catalog-weight-comparison.csv:1 exports ten columns, including raw scores and principle record IDs. It does not export sponsor, party, constituency or all evaluator considerations.

Measured named example: Cameron Salas in Abbeville, Georgia, appears at docs/codex/handbacks/team-2-georgia-all-catalog-weight-comparison.json:3414. His term-limit probe at CSV line 1803 changes from present to yea as raw principle sum changes from 0 to +0.35. The comparison contains 12,240 paired probes and 76 present-to-yea changes. This remains an unsponsored example; it cannot establish Cameron's party cue, district term or sponsored floor ballot.

Measured receipt snapshot: 12 sealed national JSON receipts were inspected, each reporting 24 completed months and the same production head. Their paths and byte hashes are preserved in docs/codex/audit-systems-sponsored-vote.json:1. Recursive inspection found zero keys containing sponsor, principle, constituency, party, ballot, disposition or decisionTrace. That count describes the export schema, not zero such records in their simulated worlds. Kobuk, Alaska's receipt is docs/codex/law-audit/audit-systems-20260930-run/US-AK.json:1.

Measured retention limit: src/simulation/governing/chamber-votes.ts:470 sets evaluator retention to ephemeral. Its return at line 476 saves member identity, disposition and one selected reason, rather than all scores and raw inputs. A selected principle reason does not disclose the individual principle ranking or competing party contribution.

## Required builder handoff

Proposed receipt extension: capture one existing real sponsored bill's immutable measure, operative answers, sponsor/cosponsor IDs, member party source, supplied constituency ID and all selected source records. Preserve each signed raw principle contribution, rank the three largest by absolute magnitude, and separately export the quantized principle consideration and every other decision term. Save before/after scores only where both actual input versions exist. Record final disposition and whether this is prediction or recorded voting.

The current evidence does not support a real sponsored example's top three principles, complete party/district terms or before/after disposition. No new world, vote, test or audit was run, and no production file or Git reference was changed. Existing receipts remain preserved. Mechanical check and independent prose review are separate checks.
