---
id: gov-chamber-committees-reader
title: "Bills are routed and committees seated from each chamber's own committee list, falling back to the national nine"
area: gov
kind: feature
priority: 3
size: S
status: dropped
claimed-by:
pr:
after:
blocked-on: gov-chamber-committees-reader-part-1-chamber-aware-reader, gov-chamber-committees-reader-part-2-congress-committees, gov-chamber-committees-reader-part-3-states-a-to-m, gov-chamber-committees-reader-part-4-states-n-to-z
milestone:
source: split from gov-stopgap-legislature-committees-assumed-data by pool feeder Oct 20
lead: governing
standard: 2
model: sonnet
effort: low
root: rc9-place-facts-one-default
checked: fable 2026-11-10
---

**What.** Bills are routed and committees seated from one national list of nine committees for every chamber. Change the committee reader so `committeeForSection`, `COMMITTEES` and `committeeTopics` take the chamber (its jurisdiction key and kind) and read that chamber's own committee list from a new `chamber-committees.json` (committee id, display name key, the catalog topics, law series and budget lines it hears), falling back to the national nine in `committees.json` for a chamber with no row. Pass the chamber through `committeeFor` in the legislature module and the seating loop in the leadership module, whose cap uses `COMMITTEES.length`. For Congress, build the list from `src/core2/data/office-day/federal-committees.json` using each real committee's jurisdiction questions. The work is split into four parts, each its own item.

**Cause.** Found in code: `src/core2/legislature-committees.ts` `COMMITTEES` (line 20, marker `SG-GOV-committee-names-national` at line 18) is one list for every chamber; federal committee data is at `src/core2/data/office-day/federal-committees.json`; the research file is `data/research/gov/chamber-committee-appointment-2026.json`.

**Fix.** Land the parts in order: part 1 makes the reader take the chamber and fall back to the nine, part 2 builds Congress's list from the federal file, parts 3 and 4 add the sourced state and territory chamber rows. The global `COMMITTEES` constant is deleted in part 1 and the stopgap marker stays until part 4.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** Replace, never layer: one reader takes the chamber and the global `COMMITTEES` constant is deleted, with no parallel router beside it. One rule, all 56 places: the reader names no chamber, and the data decides. An effect is a read, not a record: the routed committee is the one the leadership engine seats and whose members vote, so a different list changes a roll call. No hand-written player text: committee names are data keys that the English engine words. Speed: look the chamber's list up once per session, never scan per bill per day.

**Done when.** A second session plays a one-year world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose, and sees the chamber's bills go to the chamber's own committees, shown by bill, committee and member vote record ids; all four parts are merged and seen, and `SG-GOV-committee-names-national` is resolved in `src/core2/data/stopgaps/gov.json`.

**Waits on.** The four parts: gov-chamber-committees-reader-part-1-chamber-aware-reader, gov-chamber-committees-reader-part-2-congress-committees, gov-chamber-committees-reader-part-3-states-a-to-m, gov-chamber-committees-reader-part-4-states-n-to-z.

**Files.** src/core2/legislature-committees.ts, src/core2/modules/legislature.ts, src/core2/modules/leadership.ts, src/core2/data/legislature/committees.json, src/core2/data/legislature/chamber-committees.json (new), src/core2/legislature-committees.test.ts, src/core2/data/stopgaps/gov.json

**Notes.** Oct 20 (pool feeder): part 1 of 3 of gov-stopgap-legislature-committees-assumed-data. Speed: look the chamber's list up once per session, never scan per bill per day.

Folded in Oct 25 from gov-chamber-committees-data-a-m. Its done when: chamber-committees.json has a row for every chamber in these places with a source and retrieval date; a test in src/core2/legislature-committees.test.ts checks every catalog topic is heard by some committee in each chamber, and a one-year run of the played world (buildBenchWorld) in a drawn place from this half with a seed the builder did not choose sends its bills to the chamber's own committees, shown by bill and committee record ids.

Folded in Oct 25 from gov-chamber-committees-data-n-z. Its done when: chamber-committees.json has a row for every chamber in these places with a source and retrieval date; a one-year run of the played world (buildBenchWorld) in a drawn place from this half with a seed the builder did not choose sends its bills to the chamber's own committees, shown by bill and committee record ids in src/core2/legislature-committees.test.ts, and SG-GOV-committee-names-national is resolved in src/core2/data/stopgaps.json. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). Per-chamber standing committee lists would have renamed the committees on a bill; the national nine already route and seat every chamber, and no player sees the difference.
