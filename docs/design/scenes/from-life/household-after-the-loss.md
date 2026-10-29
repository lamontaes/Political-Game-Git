# Episode: the night after the loss, with the person who worked it (home, the count is in)

Slug `household-after-the-loss`. Season: home and family. Pool item `words-family-loss-scene-the-part-they-played`. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank. Stacked on episode 1 (`spouse-stake-after-filing`, #6237), whose "ask them in" reply is what makes a relative a volunteer.

## Build sheet (for the director engineer)

1. **Trigger:** `election-result:<contest id>`, written by the voting engine. Real record: `election-result:contest:seat:gus2025:160739:assessor:0:2025-10-07`, Port Graham, Alaska, seed `loss-a1:0` (`buildBenchWorld`; two filers lost by 3 and 4 votes).
2. **Place kind:** home.
3. **Cast rule:** the asker is a household adult who put something in: on the campaign row for `filing:<contest>:<person>` the relative is in `volunteerIds`, or the candidate's own gift is on the `gifts` table (`<filing>|<person>`). None, no scene.
4. **Outcome record:** the reply "I will run again" writes the relative's answer as `backing` (behind or doubts) on its `scene.reply` event. The candidacy engine keeps one row per relative (`backing` table) and `candidacyReasons` adds `householdBacking` as a signed pull for the next contest the person weighs. Reference build with a test: branch `claude/scene-family-loss-worked-it`.
5. **Lines:** to the words lead, drafted in the item's Notes (`words-family-loss-scene-the-part-they-played`).

## Sources read (for calibration)

1. A Missouri city council race (Second Ward, Jefferson City, April 2013): a challenger lost to the incumbent by 55 votes and said he planned to run again (KBIA, "Schulte, Hussey emerge as victors in Jefferson City council races", https://www.kbia.org/politics/2013-04-03/schulte-hussey-emerge-as-victors-in-jefferson-city-council-races). A close count is the thing that gets said first.
2. A Riverside County, California city council seat (Raincross Gazette, 2023): a candidate who lost the 2019 race by 222 votes announced a rematch for 2024 (https://www.raincrossgazette.com/2024-election-sean-mill-announces-re-run-for-ward-5-city-council-seat.md). The loss is a record the next election starts from.
3. A Bainbridge Island, Washington council race (Bainbridge Review, 2013): a first-time candidate conceded the day after and said they would stay involved with city hall (https://www.bainbridgereview.com/?p=23383). A concession can be an answer about the next run, not only about this one.
4. Context only, from episode 1's sources: local candidates name family help and family money as the usual cost of a run (Toledo Parent; Winston-Salem Chronicle).

## Fact packet (what happens, in substance)

- **Who:** the household member who worked the race, or the one whose savings went into it. Tie to the subject: partner or parent.
- **Trigger on the record:** the count (`election-result:<contest>`), which names the winner and each candidate's votes.
- **What each wants:** the relative wants to say what they put in and to hear what the candidate means to do with it: run again with them, or stop. The candidate wants to take in the loss without being asked to decide that night.
- **What each says (substance):** the relative opens on the margin and on their own part (time given, or money of the household's spent), in a manner their nature sets (steady, hurt, guarded, anxious). The candidate answers in one of four ways: thanks them for the part they played, takes the blame for the count, puts the whole matter off until morning, or says they will run again.
- **The choice:** to run again, with the household or against its doubt, or to wait.
- **What changes after:** the relative's answer to "I will run again" is kept. A relative who is behind it pulls the candidate toward running when the next contest comes; one who doubts it pulls away. In the sources, the loss is the starting record of the next campaign.

## What the engine has (drawn places, bench worlds)

- Record that fires: `election-result:<contest>` (voting engine), the household talk `family-loss`, cast from `household` (closest first) for every lost race.
- What fired wrong: every relative got the scene whether or not they had anything to do with the race; the lines were generic ("Come to bed. It'll still be true in the morning.", "Your phone's off. Your sister called twice." with a sister the record did not name); nothing the scene wrote was read by any engine.
- Records that exist for the stake: the campaign's volunteer list (`volunteerIds`, written by `askToVolunteer` and by episode 1's reply), the candidate's own gifts (`gifts` table), and the result's vote totals.
- Record that exists for the outcome: the candidacy engine's reasons (`candidacyReasons`), which already carry a pull from a party's ask.

## Gaps, and what was done

| Gap                                            | Kind                                     | Done in                                                                                                                                     |
| ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Cast ignores the part played                   | producer (cast rule)                     | `household-stake` now reads the result record: `lossStakeOf` in `src/director/family-stake.ts`                                              |
| Opener has no reason and cites no count        | lines                                    | `family-loss` lines that need `stake-worked` or `stake-gave`, with the margin said as people round it                                       |
| Reply to "I will run again" is read by nothing | producer (outcome write) and engine read | `backing` on the `scene.reply` record; `noteHouseholdBacking` and `householdBacking` in `candidacy.ts` (parameter `candidacyHouseholdPull`) |
| Next contest weighs the household's word       | engine read                              | `candidacyReasons` adds `householdBacking` for each answer kept                                                                             |
| No relative put anything in                    | none                                     | no scene; the race's own scene and the journal carry the loss                                                                               |

## Other lives this covers

- A first-time county commission candidate who lost by 200 votes and whose sister ran the phone bank: the `worked` stake and the count's margin.
- A school board candidate who spent savings on mailers and lost: the `gave` stake and the answer to running again.
