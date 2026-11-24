# Stand-in triage: health (Nov 10, 2026)

Owner test (Nov 10): kept 0 (with what the player sees), dropped 6 (too in depth), of which borderline 0.

Rows: 6. Still faked 6, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 4, research 2, data 0, design 0, owner call 0. New items: 0.

| Stand-in                               | Still true? | What closes it | Pool item                                    | Size | May stay at early access?                                                                                                     | In plain words                                                                                                                                        | Where the player sees it              |
| -------------------------------------- | ----------- | -------------- | -------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| SG-HEALTH-youth-cannabis-record-unread | still faked | research       | none (dropped: too in depth (owner, Nov 10)) | M    | yes: the record is the owner's Oct 29 background simulation; the readers need researched sizes and are not on the golden path | Teens' cannabis use is tracked monthly but nothing else in the game, school or later health, reacts to it.                                            | dropped: too in depth (owner, Nov 10) |
| SG-HEALTH-own-records-counted          | still faked | code           | none (dropped: too in depth (owner, Nov 10)) | M    | yes: counted people keep the place-level twin (medicaid-expansion-to-mortality), the same cause averaged                      | Counted townspeople do not get the extra death risk from their own lost job, long hours or Medicaid coverage; they get the town-wide average instead. | dropped: too in depth (owner, Nov 10) |
| SG-HEALTH-medical-bill-shape           | still faked | research       | none (dropped: too in depth (owner, Nov 10)) | M    | yes: bills are scaled to the survey average, a sourced estimate; the age profile and uninsured gap are marked refinements     | Medical bills are split evenly by need and coverage; age and the uninsured's lower use of care are not counted.                                       | dropped: too in depth (owner, Nov 10) |
| SG-HEALTH-medical-debt-collections     | still faked | code           | none (dropped: too in depth (owner, Nov 10)) | L    | yes: the game has no collection agencies; scope is basic at early access                                                      | An unpaid medical bill goes to collections and stays on the books forever; nobody collects it, pays it down or settles it.                            | dropped: too in depth (owner, Nov 10) |
| SG-HEALTH-medical-owed-fill-in         | still faked | code           | none (dropped: too in depth (owner, Nov 10)) | S    | yes: arrears at fill-in is the same open root; rare                                                                           | When a counted household becomes a full one, the medical bills the other households of its group owed disappear.                                      | dropped: too in depth (owner, Nov 10) |
| SG-HEALTH-results-mode-opening-gap     | still faked | code           | none (dropped: too in depth (owner, Nov 10)) | S    | yes: at most one month of displaced illness start dates when days are skipped                                                 | If the first days of a world are skipped, illnesses booked for those days begin on the first of the next month instead.                               | dropped: too in depth (owner, Nov 10) |

## Evidence

- `SG-HEALTH-youth-cannabis-record-unread`: src/core2/modules/health.ts:779 api.stopgap(band.unreadStopgapId); grep of youthCannabis finds readers only in health.ts, health-web.ts and births-counted.ts (counting), none in school or the 18-year condition. Item health-teen-substance-use-record is done (built the record only).
- `SG-HEALTH-own-records-counted`: src/core2/modules/health.ts:650-681 own factors read only for full people (api.stopgap at :680); counted flows in src/core2/births-counted.ts read no coverage spells, closures or hours. Cheap: read by count at the monthly flow.
- `SG-HEALTH-medical-bill-shape`: src/core2/medical-bills.ts:448-470 billMembers calls api.stopgap('SG-HEALTH-medical-bill-shape'); no age or use-gap parameter read.
- `SG-HEALTH-medical-debt-collections`: src/core2/medical-bills.ts:880-905 collectionsShare/parts, api.stopgap at :900; no pay-down path.
- `SG-HEALTH-medical-owed-fill-in`: src/core2/medical-bills.ts:823-830 owedOf; item world-fill-in-strands-group-living-arrears is status open and names the same root (living arrears).
- `SG-HEALTH-results-mode-opening-gap`: src/core2/modules/health.ts:1205-1218 runHealthDay hears booked days on first run, stopgap at :1214; onResultsMonth at :1265. Closing: one start hook per world.

## Questions for the owner

None.
