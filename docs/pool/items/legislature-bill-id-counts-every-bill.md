---
id: legislature-bill-id-counts-every-bill
title: "A bill's id ends with the count of every bill in the world, so one bill anywhere renumbers every later local bill's id"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "law-links thread, Nov 16, 2026, tracing why a do-nothing bill moves a world"
model: sonnet
effort: low
root: none
---

**What.** A bill's id ends with the size of the whole bills table. A state bill drafted in one world and not its twin shifts the id of every later council and county bill. Nothing seen decided differently by it, but any record keyed by a bill id no longer matches across the two worlds. Seen: dev mode's comparisons and any trace that matches bills between a world and its twin.

**Cause.** Found in code: src/core2/modules/legislature.ts `draftBill` builds the id as body, date, sponsor and `table(api, "bills").size`. Measured: at Choteau, Montana (place 3014650), seed ilt-3014650, the county board's 2025-02-03 bills end in 11 and 12 in a world with one dev-mode state bill and 10 and 11 without it.

**Fix.** In `draftBill`, end the id with the count of that body's own bills that day (or that sponsor's), so a bill elsewhere does not move it; check every reader that parses the id.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the id rule is the same for every body and holds in every place.

**Done when.** A second session, in a drawn place (named, with its seed), passes one state bill in dev mode and sees the town's next council bill keep the same id it has in the world without that bill.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts

**Notes.** Law-links thread, Nov 16, 2026.
