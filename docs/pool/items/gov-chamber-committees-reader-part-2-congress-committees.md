---
id: gov-chamber-committees-reader-part-2-congress-committees
title: "Congress's bills route to its real committees by jurisdiction"
area: gov
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: gov-chamber-committees-reader-part-1-chamber-aware-reader
blocked-on:
lead: governing
model: opus
effort: medium
root: rc1-world-outside-town
source: split from gov-chamber-committees-reader in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Build Congress's committee list from `src/core2/data/office-day/federal-committees.json`, using each real committee's jurisdiction questions, as the House and Senate rows in `chamber-committees.json`. Congress's bills then route to real committees by the catalog question each carries, and the leadership engine seats members on them.

**Cause.** Design: the part split of `gov-chamber-committees-reader` (`docs/pool/items/gov-chamber-committees-reader.md`) and the owner's one-engine rule (Oct 27); the federal committee data is `src/core2/data/office-day/federal-committees.json` and the reader changes in part 1.

**Fix.** Write the House and Senate rows from the federal file, each committee with the catalog topics, law series and budget lines it hears; make sure every catalog topic Congress takes up is heard by some committee.

**Time box.** 5 hours for one opus session.

**Rules.** One rule, all 56 places: Congress is a chamber row like any other, not a code path. An effect is a read, not a record. Research before building: each committee's jurisdiction comes from the federal file's own citations.

**Done when.** A second session plays a one-year world in a place drawn from all 56 (seed named) and sees Congress's bills routed to real committees by jurisdiction question, shown by bill and committee record ids, and `src/core2/legislature-committees.test.ts` checks every catalog topic Congress takes up is heard by some committee.

**Waits on.** gov-chamber-committees-reader-part-1-chamber-aware-reader.

**Files.** src/core2/data/office-day/federal-committees.json, src/core2/data/legislature/chamber-committees.json (new), src/core2/legislature-committees.test.ts

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). Real congressional committee names for a federal office the player does not hold in early access.
