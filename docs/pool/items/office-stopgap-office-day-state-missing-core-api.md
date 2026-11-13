---
id: office-stopgap-office-day-state-missing-core-api
title: "Stopgaps in office-day-state (missing-core-api): 1 open"
area: office
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/pool-office-stopgap-office-day-state-missing-core-api
pr: #8561
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/office-day-state.ts, kind missing-core-api"
claimed-at: 2026-11-11T04:21:33.049Z
after:
standard: 2
model: sonnet
effort: low
root: none
lead: governing
size: S
checked: fable 2026-11-10
---

**What.** Dev mode's custom start as a sitting state officeholder writes the player's term into the offices engine's table directly, because the engine has no call to seat a chosen person (SG-STATE-dev-seat-player). It ends the seat's serving term and keeps the previous holder's party, and ordinary play never reaches it. Replace the direct table write with a seating function the offices engine exports. The row is kept, marked resolved, and never deleted.

**Cause.** Found in code: src/core2/office-day-state.ts lines 1598 to 1649 call api.stopgap("SG-STATE-dev-seat-player") and write the offices table directly; the row is at src/core2/data/stopgaps/state.json line 51.

**Fix.** Export a seat-a-chosen-person function from the offices engine, call it from dev mode's custom start in place of the direct table write, remove the code marker, and keep the stopgap row marked resolved naming the function and its reader.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the direct table write is deleted in the same change. Placeholders: never close a row by deleting it; mark it resolved and name the reader. Wire to the world: another engine reads the seated term in a one-year run. Numbers stay in the parameter table.

**Done when.** A second session starts dev mode's custom start as a sitting state officeholder in a drawn state (state and seed named), sees the player seated with the previous holder's party kept, and a one-year played-world run shows the engine reading the seated term (the new term's record id appears in the offices table and the state day). The row SG-STATE-dev-seat-player is marked resolved in src/core2/data/stopgaps/state.json, not deleted, and a test in src/core2/office-day-state.test.ts covers the replaced term with positive assertions.

**Waits on.** Nothing.

**Files.** src/core2/office-day-state.ts, src/core2/data/stopgaps/state.json, src/core2/office-day-state.test.ts

**Notes.** First row: Dev mode's custom start as a sitting state officeholder ends the seat's serving term and writes the player's term into the offices engine's table directly, keeping the previous holder's party; it is not reached in ordina
Sent back 2026-10-20 from PR #5247 (branch claude/pool-state-seat-person-2): Morning check failed because stopgap row SG-STATE-dev-seat-player was deleted from stopgaps.json instead of marked resolved; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5247 (branch claude/pool-state-seat-person-2): src/core2/data/stopgaps.json deletes SG-STATE-dev-seat-player, as the body also states. The merger rule forbids deleting registered stopgap rows: retain the row, mark it resolved, name seatPerson and its reader in the resolution, and remove only the obsolete code marker. Rerun changed-file checks after merging main.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5247 (branch claude/pool-state-seat-person-2): The opening-only seating test omits the required one-year downstream-consumer proof and conditionally skips replaced-term assertions; add positive records and the missing Done-when evidence table, and correct the retained-row claim; finish on that branch, merge main into it first.
