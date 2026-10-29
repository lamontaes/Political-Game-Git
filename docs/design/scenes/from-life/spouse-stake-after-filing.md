# Episode: the spouse who has a stake in the run (home, the day of filing)

Slug `spouse-stake-after-filing`. Season: home and family. Pool item `words-household-filing-scene-has-a-purpose`. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank.

## Build sheet (for the director engineer)

1. **Trigger:** `candidate-filed:<filing id>`, written by the elections engine (`announce`). Real record: `candidate-filed:filing:contest:seat:gus2025:164887:council:0:2025-11-04:person_01a319696aec9436`, Selden, Kansas, seed `scene-a2-1` (`buildBenchWorld`, council seat, filed in the opening weeks).
2. **Place kind:** home.
3. **Cast rule:** the asker is a household adult whose stake the records give: household savings (`liquidMinor` over `livingCostDailyMinor`) short of the days to the filing's `electionDate`, or a child under 13 in the household while the filer holds a job. Strongest stake first; none, no scene. Built as `household-stake` (merged in #6237, literals moved to TUNABLE rows in #6273).
4. **Outcome record:** the reply's `scene.reply` event. A yes to helping writes the relative into the campaign's `volunteerIds`, read by `reachablePeople` and `whoComes` on the canvass; a put-off is negative hours on the tie, read by `closenessBetween`. The "bound the cost" reply writes nothing another engine reads (stopgap `SG-WORDS-family-limit-unread`; engine item `campaigns-household-limit-read`, lead effects).
5. **Lines:** to the words lead (done in #6237 and reviewed there).

## Sources read (for calibration)

1. A published memoir's account of a 2004 U.S. Senate run, as summarized in two study guides: the spouse was reluctant to give the go-ahead, weighed what the office could do for people against what it cost the family, and set one condition (if the run is lost, the political career ends and the household moves to other work). Summaries: SuperSummary "Becoming", Part 2, chapters 15-17 (https://supersummary.com/becoming/part-2-chapters-15-17) and SparkNotes "Becoming", chapters 15 and 16 (https://www.sparknotes.com/lit/becoming/section8/). Read second-hand; the memoir itself was not available to this session, so the packet takes only the shape (a reluctant spouse, a cost named, one condition), nothing quoted.
2. A Toledo, Ohio council candidate writing about the decision to run with three small children: several deliberate talks with his wife about what the commitment would be and how hard it would be on the family; the time away from young children is named as the main cost (Toledo Parent, "The Cost & The Opportunity: My decision to run for office with three small children", https://toledoparent.com/?p=31092).
3. A Winston-Salem, N.C. council member on the run: his wife's support was essential; open talk about time came first; council pay (about $32,000) and the personal cost of filing and campaigning were part of the family's reckoning (Winston-Salem Chronicle, https://wschronicle.com/?p=65828).
4. A survey of 711 local candidates (cited in the same search): parents, people with full-time jobs and people who grew up in poverty most often had difficulty meeting work and family obligations while campaigning. Used only to check that the two stakes below (money, time with children) are the common ones.

## Fact packet (what happens, in substance)

- **Who:** the candidate's spouse (or the adult in the household closest to them). Tie to the subject: partner. In the sources the person is often not against the run; they are the one who pays for it.
- **Trigger on the record:** the filing is made (public); the spouse hears it the same day. In the Senate episode the talk came before the decision; in the local episodes it comes around the decision and filing. Our trigger is the filing, because that is the record the game writes.
- **What the spouse wants:** to know what the run will cost the household, and to have the candidate say what they will do about it. The want is specific: money (savings against the length of the race) or time (children, a second job's hours).
- **What each says (substance):**
  - Spouse opens with the concrete cost, not "are you sure?": how long the savings last against how long the race runs; or who covers the children's evenings when the candidate is out.
  - Candidate answers one of four ways: asks the spouse to be part of the campaign; sets a limit and promises to keep to it; says it is decided and they will manage; puts it off.
  - Spouse's answer follows from who they are: a patient one agrees to help on the condition named; an anxious one asks again for the limit; a guarded one says "decide and tell me."
- **The choice the candidate faces:** bring the household into the campaign, bound the cost, push through, or avoid the talk.
- **What changes after:** the spouse either becomes part of the campaign (volunteer), holds a stated limit the candidate agreed to, or the talk is left open and the household carries it. Later talks cite it (a bring-it-up line about "what you told me the night you filed").

## What the engine has (drawn places, bench worlds)

- Record that fires: `candidate-filed:<filing>` (`elections.announce`), met at home the same day (`ownRecordScenes`), situation type `family-filing`, cast `relative` from `household` (closest first).
- What fires wrong today: the cast is whoever is closest, whether or not they have any stake; the opener ("Are you sure about running for X?") says no reason; the exchange's endings (`on-board`, `not-yet`, ...) name a `keeps` record that nothing writes, and the only record written is `scene.reply` plus the hours together, which only the party-ask handler reads.
- Records that exist for the stake: each person's `liquidMinor` and `livingCostDailyMinor` (household runway, in days), the filing's `electionDate`, children's birth dates in the household, the filer's job and `work.commitmentsByPerson`.
- Record that exists for the outcome: the campaign's `volunteerIds` (read by `whoComes` and `reachablePeople` on the canvass), written by the campaigns engine.

## Gaps, and what was done

| Gap                                                                      | Kind                     | Done in                                                                                                                                                                                            |
| ------------------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cast ignores stake: any household member plays                           | producer (cast rule)     | `household-stake` fill in `scheduling.ts`, read from `src/director/family-stake.ts`; parameters in `scene-talk-rules.json` (`familyStakes`)                                                        |
| Opener has no reason                                                     | lines                    | `family-filing` lines in `data/english/parts/scene-talk.json` that need `stake-money` or `stake-time`, four bearings each; the Oct 15 "Are you sure about running?" family removed                 |
| Outcome writes nothing another engine reads                              | producer (outcome write) | `replyInScene` (`purpose-scene.ts`): a yes to "help with the campaign" counts the relative among the campaign's volunteers (`enlistVolunteer`); a put-off is a quarrel on the tie (negative hours) |
| A bound on the cost (limit on savings, evenings kept) is read by nothing | engine item              | pool `campaigns-household-limit-read` (lead effects); stopgap `SG-WORDS-family-limit-unread`                                                                                                       |
| Later talks cite what was said the night of the filing                   | lines/engine             | not built; the `scene.reply` record carries the stake and the move, which a bring-it-up line can read                                                                                              |
| Real cost of a run is not on the filing                                  | none needed              | the elections engine takes no fee, so the money stake is the household's savings against the race's length                                                                                         |

## Other lives the same producer covers (the general case)

The producer is "the person who pays for the run has a stake on record, says it, and the answer is recorded." It also fires for:

- A first-time school board candidate with a toddler at home, working full time (source 2's shape): `stake-time` from the child's age and the filer's work hours.
- A council member's hourly-wage spouse (source 3's shape): `stake-money` from a short runway against a long race.
