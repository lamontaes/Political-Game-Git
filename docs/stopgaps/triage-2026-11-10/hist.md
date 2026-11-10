# Stand-in triage: hist (Nov 10, 2026)

Owner test (Nov 10): kept 0 (with what the player sees), dropped 4 (too in depth), of which borderline 0.

Rows: 4. Still faked 4, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 4, research 0, data 0, design 0, owner call 0. New items: 0.

| Stand-in                               | Still true? | What closes it | Pool item                                    | Size | May stay at early access?                                                                                   | In plain words                                                                                                                                                                   | Where the player sees it              |
| -------------------------------------- | ----------- | -------------- | -------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| SG-HIST-past-work-day-one-town         | still faked | code           | none (dropped: too in depth (owner, Nov 10)) | M    | yes: the years before the start run general with no depth (owner, Oct 28); the spells are marked estimates. | A person's job history before the game starts is run in today's town with today's business sizes and the national jobless rate, not the places and firms of that time.           | dropped: too in depth (owner, Nov 10) |
| SG-HIST-moves-life-stage-only          | still faked | code           | none (dropped: too in depth (owner, Nov 10)) | M    | yes: owner Oct 28 made the years before the start general, with no depth.                                   | When someone moved into the county before the game starts depends only on their age and kids at home, not on a lost job, owning a home or their temperament.                     | dropped: too in depth (owner, Nov 10) |
| SG-HIST-school-elsewhere-unnamed       | still faked | code           | none (dropped: too in depth (owner, Nov 10)) | M    | yes: a school with no name is left out of text, not shown wrong; it is a marked fallback.                   | A school year spent in a place the game does not keep a school for has no school name, so the journal and cards leave it out.                                                    | dropped: too in depth (owner, Nov 10) |
| SG-HIST-counted-couples-from-household | still faked | code           | none (dropped: too in depth (owner, Nov 10)) | M    | yes: a spouse is told only where a shared home and child make it near certain; nobody is invented.          | When you open someone from the wider population, a couple is guessed only from two grown relatives sharing a home with a child, so childless couples and ex-partners are missed. | dropped: too in depth (owner, Nov 10) |

## Evidence

- `SG-HIST-past-work-day-one-town`: src/core2/past-work.ts:175-215 (firmsOf: day-one org headcount and pay; stopgap marker at 180); unemployment read from economy.conditions months at lines 157-161. Item history-past-work is done and did not change this. Cheap: built once at opening from the pass's own history.
- `SG-HIST-moves-life-stage-only`: src/core2/past-moves.ts:85-140 (moveRecords: only votingAge, movesStayPull, movesChildrenHold; marker at 100); no job-lost or home input read. Item history-past-moves is done and left this. Cheap: run once at opening, by year.
- `SG-HIST-school-elsewhere-unnamed`: src/core2/past-school.ts:55-72 (district falls back to the place target; schoolName fires the stopgap when the organization has no name, marker at 70); src/bench/words.ts:29 still comments it. Cheap: names generated once when a place's schools are first opened.
- `SG-HIST-counted-couples-from-household`: src/core2/modules/people.ts:472-520 (partneredForFilledIn, marker at 483, infers from household and child). Item play-person-history-fill-in-writes-the-coarse-past is done and kept this. Cheap: run only on fill-in.

## Questions for the owner

None.
