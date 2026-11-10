# Stand-in triage: the play register (Nov 10, 2026)

Register: `src/core2/data/stopgaps/play.json`. 15 open rows read against today's code. No register row changed: none is replaced and none is partly replaced.

**Counts.** Still faked 15. Already replaced 0. Partly replaced 0. Could not tell 0.
**What closes them.** Code 6 (day start, room condition, judges, campaign acts as scenes, office hours, trips), research 1 (the 34 town counts), data 1 (regions), design 0, owner call 0, and 7 are art or words work (5 art held by the owner's bust decision, 2 words lines).
**New pool items.** 2: `play-day-starts-at-own-wake-time`, `research-town-counts-34-places`.

| Stand-in                                   | Still true? | What closes it                               | Pool item                                         | Size   | May stay at early access?                                                              | In plain words                                                                                                      |
| ------------------------------------------ | ----------- | -------------------------------------------- | ------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| SG-PLAY-act-control-names                  | Still faked | Words (bank lines)                           | play-stopgap-controls-text (open)                 | Small  | Yes, the names are plain control labels                                                | A few action buttons take their names from a small list in the screen instead of the shared word banks.             |
| SG-PLAY-desktop-update-dialog-text         | Still faked | Words, or owner accepts it                   | core-stopgap-main-player-text-gap (open)          | Small  | Yes, one sentence on the Mac update dialog                                             | The Mac update box explains what installing does in one sentence the word engine did not write.                     |
| SG-PLAY-town-count-estimate                | Still faked | Research                                     | research-town-counts-34-places (new)              | Small  | Yes, already marked as an estimate in the list                                         | 34 odd places such as military posts have no published headcount, so they open at a typical town size and say so.   |
| SG-PLAY-day-start-minute                   | Still faked | Code                                         | play-day-starts-at-own-wake-time (new)            | Medium | Yes, it is a 7 AM average with a stated range, but a night worker waking at 7 is wrong | Everyone you play wakes up at 7 AM, whatever their job.                                                             |
| SG-PLAY-room-condition-rule                | Still faked | Code (housing keeps a condition per home)    | none, may stay                                    | Large  | Yes, a marked tunable rule from rent, value and size                                   | Whether a home looks tidy or run-down is guessed from the family's rent or home value, not from the house's repair. |
| SG-PLAY-plate-overflow-spots               | Still faked | Art                                          | people-chamber-plates (open)                      | Medium | Yes, full-body staging waits for the owner's bust decision (Nov 10)                    | In a big crowd, the people past those the artist painted stand in older hand-placed spots.                          |
| SG-PLAY-region-states                      | Still faked | Data                                         | none, may stay                                    | Small  | Yes, a sourced estimate from Census divisions                                          | Which states get a regional look for the town is a short list of regions, not each place's own style.               |
| SG-PLAY-people-pack-six                    | Still faked | Art                                          | none, waits on the owner's bust decision (Nov 10) | Large  | Yes                                                                                    | Only six painted adults exist, and children are not drawn at all.                                                   |
| SG-PLAY-people-pack-v4-pose-gaps           | Still faked | Art                                          | people-pack-v4-pose-gaps (open)                   | Medium | Yes, waits on the bust decision                                                        | Some people cannot stand or sit on the couch in the Oval Office because the artist has not painted those poses.     |
| SG-PLAY-people-everyday-falls-back-to-work | Still faked | Art                                          | people-pack-v4-pose-gaps (open)                   | Medium | Yes, waits on the bust decision                                                        | Some people sit at home in a work blazer because no everyday seated picture exists for them.                        |
| SG-PLAY-government-judicial-no-judges      | Still faked | Code                                         | world-judges-seated (open)                        | Medium | Yes, courts come after early access (Oct 10)                                           | The Government screen has no Judicial tab because no judge exists in the world yet.                                 |
| SG-PLAY-home-plated-room-first             | Still faked | Art                                          | people-home-plates (open)                         | Medium | Yes, waits on the bust decision                                                        | Every household's living room shows the one living room that has people-spots painted.                              |
| SG-PLAY-campaign-acts-buttons              | Still faked | Code (scenes)                                | play-campaign-acts-as-scenes (open)               | Medium | No, the owner wants campaigning played as scenes                                       | Polling, mailers and putting in your own money are buttons on a card, not scenes you play.                          |
| SG-PLAY-office-hours-assumed               | Still faked | Data (the clerk becomes a person with hours) | none, may stay                                    | Medium | Yes, marked estimate, weekdays 8 to 5                                                  | An election office whose clerk is not a modeled person is open weekdays 8 to 5, holidays included.                  |
| SG-PLAY-trip-time-average                  | Still faked | Code and design (a map of distances)         | none, may stay                                    | Large  | Yes, sourced from the 2022 National Household Travel Survey with a stated range        | Every trip in town takes 17 minutes and every visit an hour, wherever you go.                                       |

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
