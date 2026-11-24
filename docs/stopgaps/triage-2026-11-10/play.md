# Stand-in triage: the play register (Nov 10, 2026)

Register: `src/core2/data/stopgaps/play.json`. 15 open rows read against today's code, then each put to the owner's Nov 10 test: where does the player see or feel it on the golden path or in something he has ruled? No row is replaced or partly replaced; all 15 are still faked.

**New totals.** Kept 3 (the player sees them). Dropped 12 (too in depth, owner, Nov 10; closed in the register as resolved, the estimate stays). Borderline 3 of those 12, listed below. New items: 0 (the two I had filed were deleted). Crime-system rows: none.

| Stand-in                                   | Still true? | Where the player sees it                                                          | Verdict             | Pool item                                            | Size   | In plain words                                                                                          |
| ------------------------------------------ | ----------- | --------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| SG-PLAY-act-control-names                  | Still faked | The labels on choice buttons in every play screen                                 | Kept                | play-stopgap-controls-text (open)                    | Small  | A few action buttons take their names from a small list in the screen instead of the shared word banks. |
| SG-PLAY-government-judicial-no-judges      | Still faked | Politics, Government tab; the owner ruled Oct 29 that a Judicial tab shows judges | Kept                | world-judges-seated (open)                           | Medium | The Government screen has no Judicial tab because no judge exists in the world yet.                     |
| SG-PLAY-campaign-acts-buttons              | Still faked | The campaign card in Travel, on the golden path (campaign)                        | Kept                | play-campaign-acts-as-scenes (open)                  | Medium | Polling, mailers and putting in your own money are buttons on a card, not scenes you play.              |
| SG-PLAY-desktop-update-dialog-text         | Still faked | One sentence in a Mac update box                                                  | Dropped, borderline | none                                                 | Small  | The Mac update box explains what installing does in one sentence the word engine did not write.         |
| SG-PLAY-town-count-estimate                | Still faked | A population in the creator's town list for 34 odd places                         | Dropped             | none                                                 | Small  | 34 odd places such as military posts open at a typical town size, and the list says so.                 |
| SG-PLAY-day-start-minute                   | Still faked | The clock after pressing Day                                                      | Dropped, borderline | none                                                 | Medium | Everyone you play wakes up at 7 AM, whatever their job.                                                 |
| SG-PLAY-room-condition-rule                | Still faked | How tidy a home looks, already guessed from rent or value                         | Dropped             | none                                                 | Large  | Whether a home looks tidy or run-down is guessed from rent or value, not from the house's repair.       |
| SG-PLAY-plate-overflow-spots               | Still faked | Where extra people stand in a big crowd; staging waits for busts (owner, Nov 10)  | Dropped             | none (people-chamber-plates stays open, not mine)    | Medium | In a big crowd, extra people stand in older hand-placed spots.                                          |
| SG-PLAY-region-states                      | Still faked | A regional look for the town picture, which stays                                 | Dropped             | none                                                 | Small  | Which states get a regional look is a short list of regions, not each place's own style.                |
| SG-PLAY-people-pack-six                    | Still faked | Full-body people in rooms; people are busts for early access (owner, Nov 7)       | Dropped             | none                                                 | Large  | Only six painted adults exist, and children are not drawn.                                              |
| SG-PLAY-people-pack-v4-pose-gaps           | Still faked | Oval Office poses; staging waits for busts                                        | Dropped             | none (people-pack-v4-pose-gaps stays open, not mine) | Medium | Some people cannot stand or sit on the Oval Office couch because those poses are not painted.           |
| SG-PLAY-people-everyday-falls-back-to-work | Still faked | A person at home in a work blazer; staging waits for busts                        | Dropped             | none                                                 | Medium | Some people sit at home in a work blazer because no everyday seated picture exists.                     |
| SG-PLAY-home-plated-room-first             | Still faked | Every home's living room looks the same; staging waits for busts                  | Dropped             | none (people-home-plates stays open, not mine)       | Medium | Every household's living room shows the one living room that has people-spots painted.                  |
| SG-PLAY-office-hours-assumed               | Still faked | The filing counter is open or closed; the estimate stays                          | Dropped             | none                                                 | Medium | An election office whose clerk is not a modeled person is open weekdays 8 to 5, holidays included.      |
| SG-PLAY-trip-time-average                  | Still faked | Every trip moves the clock 17 minutes (sourced, with a range)                     | Dropped, borderline | none                                                 | Large  | Every trip in town takes 17 minutes and every visit an hour, wherever you go.                           |

## Borderline, for the owner

- **Day starts at 7 AM for everyone:** a night-shift character wakes at 7, which might read wrong the first time you press Day.
- **Every trip takes 17 minutes:** you ruled Nov 8 that travel spends its distance; this is the sourced average until places have distances.
- **Mac update sentence:** you ordered the update dialog on Oct 14; its one sentence is not graded by the word engine.

## Evidence

- act-control-names: src/bench/data/controls.json:3 holds the table; read at src/bench/play.mjs:2542 and 4129 (`controls.actions`). Marker still in controls.json.
- desktop-update-dialog-text: desktop/main.mjs:209-211, `installNote`, a literal string. Item core-stopgap-main-player-text-gap names it.
- town-count-estimate: src/bench/creator.ts:179 (marker), :195 (`parameter("targetPopulation")` with `estimated: true`).
- day-start-minute: src/bench/player.ts:217-218 returns `parameter("playerDayStartMinute")` (420, TUNABLE); src/director/ledger.ts:1618 reads the same. Day-lands-in-the-morning is done (commit c573027b70) but a per-person wake time is not.
- room-condition-rule: src/bench/scene.ts:270-290 `roomCondition` reads thirds of rent or value, tenure and size; no dwelling condition in src/core2/housing-shelter.ts. Item people-room-condition (done) built this rule as the stopgap.
- plate-overflow-spots: scripts/people/room-spots.ts:239 keeps old spots past the plate's own.
- region-states: src/bench/scene.ts:292 reads `regionalVariants` in src/bench/data/scene-places.json:~499, tagged ESTIMATED from Census divisions.
- people-pack-six: src/bench/whole-figures.ts:203 (`figureForSpot` returns null for a child).
- people-pack-v4-pose-gaps: src/bench/whole-figures.ts:204; item people-pack-v4-pose-gaps lists the missing poses.
- people-everyday-falls-back-to-work: src/bench/whole-figures.ts:105 and src/bench/scene.ts:831; same item covers it (its Fix paints the everyday kit).
- government-judicial-no-judges: src/bench/play.mjs:4800, `offered` lists only legislative and executive.
- home-plated-room-first: src/bench/scene.ts:413, `staged = options.filter(PLATED.has)`; item people-home-plated-room-first is done but its stopgap stays until people-home-plates (open) lands.
- campaign-acts-buttons: src/bench/play.mjs:1860, poll, mail and the money button remain; volunteer, endorsement and ad listed beside them still go through `act(kind)` buttons too.
- office-hours-assumed: src/bench/filing.ts:319 `assumedSpans`, used at :362 when `workSpansOf` returns nothing; data in src/bench/data/office-hours.json with source and spread. Item play-offices-keep-their-hours (done).
- trip-time-average: src/bench/handler.ts:948-964 spends `tripMinutes` (17, ESTIMATED, NHTS 2022) and `visitHours` (1, TUNABLE) for every visit; no distance in place records. Owner Nov 8 ruled travel spends its distance (OWNER-DECISIONS.md line 56).

Row line numbers in the register are a few lines off the markers in creator.ts, player.ts, scene.ts and filing.ts. I left them, since no row changed.

## Questions for the owner

None.

## Reuse check (owner, Nov 10: one money system)

No new items remain from this register, so nothing here adds a payment, tax or ledger path.
