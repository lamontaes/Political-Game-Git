# Stand-in triage: screens (Nov 10, 2026)

Rows: 5. Still faked 5, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 3, research 0, data 1, design 1, owner call 0. New items: 0.

| Stand-in                              | Still true? | What closes it | Pool item                                  | Size | May stay at early access?                                                                                                                   | In plain words                                                                                                          |
| ------------------------------------- | ----------- | -------------- | ------------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| SG-SCREENS-candidate-rally            | still faked | code           | campaigns-candidate-rally-events (new)     | L    | no: the owner asked for it by name (sitting Oct 28, point 19)                                                                               | You cannot go to a candidate's rally to hear their views, because the game keeps no such event.                         |
| SG-SCREENS-filing-platform-from-views | still faked | code           | elections-filing-platform-from-views (new) | S    | no: the Campaigns row shows no stances for a filed player                                                                                   | When you file for office the game records no stances for you, because nothing yet reads your own views into the filing. |
| SG-SCREENS-counter-six-replies        | still faked | design         | none                                       | S    | yes: the counter shows four races soonest; the rest are reached from Travel and Campaigns; the clerk-asks design waits on the words session | The filing counter lists at most four races, the soonest, and the others are reached from Travel or Campaigns.          |
| SG-SCREENS-office-hover-prose         | still faked | data           | none                                       | M    | yes: the card shows seat, election day and holder from records; a duties bank is a words-session job                                        | The race card says where, when and who holds the seat but not, in words, what the office does.                          |
| SG-SCREENS-metrics-no-prior-year      | still faked | code           | screens-metrics-year-ago-readings (new)    | M    | yes: the screen shows the current value with no last-year column; it is a marked gap                                                        | The Metrics tab shows this year's town numbers without last year's beside them.                                         |

## Evidence

- `SG-SCREENS-candidate-rally`: src/bench/play.mjs:4296; campaigns.ts has no rally row; public-action.ts rally is a town demonstration; cheap: one event row per held rally
- `SG-SCREENS-filing-platform-from-views`: src/bench/play.mjs:1499; src/core2/modules/elections.ts:1236 platform copied from input; cheap: read once at filing
- `SG-SCREENS-counter-six-replies`: src/bench/play.mjs:1528
- `SG-SCREENS-office-hover-prose`: src/bench/play.mjs:1517; the counter now tells races apart in a line, not a hover card (:1530-1533)
- `SG-SCREENS-metrics-no-prior-year`: src/bench/metrics.ts:110 and :206 (before: null); cheap: one monthly row per figure, folded

## Questions for the owner

None.
