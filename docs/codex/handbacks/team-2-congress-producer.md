# Congress has proposals but no majority-backed bill to introduce

The observed intakes stopped before compilation or filing because no proposal had both required majorities. Twenty questions were admitted in each House. The House produced 207 proposals and the Senate 47, but neither could select a bill. The producer assignment remains unresolved. Changing formation or backing criteria needs CTO direction; no majority rule has been relaxed.

## 1. Why-chain

Why no introduction? `fileCongressBill` returned at `if (!selected) return next`. Why no selection? The existing selector requires more than half of the caucus and chamber to back one proposal. Why no qualifying proposal? Recorded scores gave every observed candidate too few chamber backers, and House candidates too few caucus backers. Why could another question not unblock it? Every admitted question direction was inspected at that same actual call; none had both majorities. Why are the scores distributed that way? The source forms officeholder principles with authored draws independent of party, place and life. Terminal: recorded principles with a seeded stand-in formation model. No researched filing rate is supplied by that model.

Constituents, leaders, donors, organizations, news, political culture and reintroductions remain incomplete in that formation and agenda chain. The observed stop is a decision-model issue, not evidence that a selected bill lost its introduction. The trace does not justify changing any of those missing inputs to invented values.

## 2. Research

This is an observed source/record consistency diagnosis. It adds no empirical coefficient, rate or legal grant. The existing majority function sorts proposals by pressure and sponsor ID, then tests caucus and chamber backing. The filing callback counts a member only when their saved principle score favors the proposal. The later chamber vote reader also reads sponsorship and party cues, so using it for agenda backing would be a substantive change to the backing decision, even if numerical majority thresholds stayed the same. That alternative is not implemented here.

## 3. Revisions

The summary correction remains separate and complete: twelve false filed summaries became twelve explicit no-bill summaries over the watched year, while introductions/referrals stayed zero. The new diagnosis observes actual producer locals during normal Day presses using read-only V8 breakpoints. It does not copy or patch simulation code, change any source value, author a bill, or inject a different clock/handler. Pure readers queried saved backing at the paused actual call. Debugging changes execution cost, so this is not a speed measurement.

## 4. Numbered actual boundaries

1. Entry: full recorded membership and no prior measure for the intake were observed.
2. Admission and proposals: twenty questions and nonzero proposals reached the actual selector.
3. Selection: null in all four observed calls, at the exact no-selection return.
4. Mapped compilation and filing: neither boundary was reached. There is no observed selected proposal to repair downstream in these calls.

| Actual intake            | Members | Caucus          | Required caucus / chamber | Admitted questions | Proposals | Maximum proposal caucus / chamber backers | Maximum any-direction caucus / chamber backers | Selected |
| ------------------------ | ------: | --------------- | ------------------------- | -----------------: | --------: | ----------------------------------------- | ---------------------------------------------- | -------- |
| February 1, 2026, house  |     435 | democratic, 222 | 112 / 218                 |                 20 |       207 | 88 / 169                                  | 94 / 170                                       | none     |
| February 1, 2026, senate |     100 | republican, 50  | 26 / 51                   |                 20 |        47 | 26 / 48                                   | 26 / 48                                        | none     |
| March 1, 2026, house     |     435 | democratic, 222 | 112 / 218                 |                 20 |       207 | 88 / 169                                  | 94 / 170                                       | none     |
| March 1, 2026, senate    |     100 | republican, 50  | 26 / 51                   |                 20 |        47 | 26 / 48                                   | 26 / 48                                        | none     |

The maxima in a cell can belong to different proposals or directions; they are upper bounds, not a claimed coalition. The all-direction check even includes directions that further law/revenue filters could exclude. Zero directions met both majorities in every snapshot. Thus the best-proposal filter did not hide a supported alternative in these calls.

## 5. Simulated, records, world pieces, checks

SIMULATED: sixty normal observer Day presses with the existing producer and majority predicates. RECORDS: actual canonical principle IDs, question IDs and live proposals, preserved in the attached compact JSON. The trace is a debugger observation, not a newly authored game event. WORLD PIECES: both seated chambers, twenty admitted questions, actual caucuses and principle records existed. CHECKS: all four entry/selection boundaries captured, no capture errors, exact source stayed clean, target date reached, Save/Continue date/history counts matched. No actual selected bill, compilation or referral is inferred. No person feels a new law effect from this diagnostic collector.

## 6. Proof run

Seed `team2-numbering-month-20260930`; Wadsworth, Nevada, place `3281000`; January 5 through March 6, 2026; sixty Day presses. Runtime source and published collector `31feff0312f66b89c2c4729c07c01958088fde5e`. Status completed-trace-window; elapsed 99.519 seconds including Save/Continue. Four entry and four selection snapshots; zero mapped-compilation/filed snapshots; zero capture errors. Seven scoped TypeScript roots have zero diagnostics; collector lint/format pass. Previous reporting fixture checks remain 3/3 and the unchanged allocator checks 69/69. Browser/full suite/independent reviewer NOT RUN. Positive Congress designation/year completion remains unmet; draft #1200 stays held.

The attached `team-2-congress-intake-trace.json` retains all 508 observed proposal rows, their source principle IDs, admitted IDs, every direction's actual backing counts, generated producer hash and resolved V8 locations. Raw trace bytes and hash are included; only large backing-ID lists are replaced by exact counts in this portable copy. Raw observations remain in the ignored output. No trace value was reconstructed from a closing world.

## 7. Worked example

The first ordered house proposal on February 1 was `us-federal-positions:education.forgive-student-loans`, answer yes, from `person_0200d9a4dc77f1ff`. Its saved score was 8, with 76 caucus backers and 154 chamber backers. The required counts were 112 and 218. Source principle IDs: `principle_ffe231497c802df3`, `principle_0382cf81108fe762`. It failed the existing backing gate; no bill ID or introduction is invented.

The first ordered senate proposal on February 1 was `us-federal-positions:defense.grow-defense-spending`, answer yes, from `person_0b238d3353625247`. Its saved score was 8, with 19 caucus backers and 33 chamber backers. The required counts were 26 and 51. Source principle IDs: `principle_654bc8d7c226cbf2`, `principle_da8af00e34a3e54b`. It failed the existing backing gate; no bill ID or introduction is invented.

## Exact blocking decision for CTO

The observed no-selection return correctly enforces the currently specified backing rule. A positive filing in this world requires changing the upstream formation/topic/backing model or waiting for genuine recorded circumstances to create a qualifying majority. Replacing the authored formation, adding researched constituent/culture inputs, or changing agenda backing to the existing broader vote reader are distinct design choices. They cross Team 1's active formation/strength seam or alter decision semantics. None is a bounded missing-writer repair demonstrated by these four calls. Team 2 retains producer ownership and requests coordinator/CTO routing of that exact design decision; source evidence is now concrete and reviewable. The host-first proof can proceed while that direction is pending.
