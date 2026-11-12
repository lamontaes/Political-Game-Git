---
id: gov-chamber-committees-reader-part-3-states-a-to-m
title: "State chamber committee rows, Alabama through Missouri and the Marianas"
area: gov
kind: research
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: gov-chamber-committees-reader-part-1-chamber-aware-reader
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: split from gov-chamber-committees-reader in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Add the standing committee lists for every chamber of the states and territories from Alabama through Missouri and the Northern Marianas to `chamber-committees.json`, each row with its source and retrieval date. Each committee names the catalog topics, law series and budget lines it hears, so the chamber's bills route to its own committees instead of the national nine. Research is from the chamber's own pages and the research file `data/research/gov/chamber-committee-appointment-2026.json`.

**Cause.** Design: the part split of `gov-chamber-committees-reader` (`docs/pool/items/gov-chamber-committees-reader.md`); the national nine in `src/core2/data/legislature/committees.json` is the placeholder these rows replace (stopgap `SG-GOV-committee-names-national`). The reader that takes them lands in part 1.

**Fix.** Write a sourced row for every chamber in this half, citing each committee list's page and retrieval date; where a list cannot be fetched keep the fallback to the nine for that chamber and say so in the row's note.

**Time box.** 6 hours for one sonnet session.

**Rules.** One rule, all 56 places: place facts live in the data rows and no chamber is named in logic. Research before building: quote the page for each list. Estimate, never UNKNOWN: a chamber whose list is unread keeps the fallback, marked ESTIMATED with the reason.

**Done when.** A second session plays a one-year world in a place drawn from this half (named with its seed) and sees the chamber's bills sent to its own committees, shown by bill and committee record ids; `src/core2/legislature-committees.test.ts` checks every catalog topic is heard by some committee in each chamber of this half, and every row carries a source and retrieval date.

**Waits on.** gov-chamber-committees-reader-part-1-chamber-aware-reader; network access to the state legislature sites.

**Files.** src/core2/data/legislature/chamber-committees.json (new), data/research/gov/chamber-committee-appointment-2026.json, src/core2/legislature-committees.test.ts

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). Research of 54 chambers' committee names, seen nowhere.
