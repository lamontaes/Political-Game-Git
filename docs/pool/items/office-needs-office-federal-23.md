---
id: office-needs-office-federal-23
title: "Needs from other sessions listed in OFFICE-FEDERAL.md (line 23): 10 lines"
area: office
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/OFFICE-FEDERAL.md "Needs from other sessions" (line 23)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

- OFFICE-LOCAL:
  - `prepareAct` for any registered kit's act ids. The federal day keeps what the player prepares in its own table until then (`SG-OFFICE-FED-prepared`).
  - The engine's own vote (`ownVote`) reads only the bill's first chamber. A senator the player controls who leaves a vote on a House bill is cast by the legislature with no act on the record.
  - In one Maine run, the local kit's town hall was taken by a member's character five days in eight. Is there meant to be a cadence?
- OPUS-GOV:
  - Elections and offices: a sitting member of Congress was filed for town council by candidacy and lost the House seat when they won (Orem, Utah, seed `fed-filing-1`).
  - Federal powers: federal executive orders; pardons (federal jurisdiction in justice); routing residents' problems to members of Congress.
  - Congress: every House member on at least one committee; a floor agenda by date; Congress's floor days read from the House and Senate calendars.
- OPUS-GOV (press): national outlets decline a sitting president as not newsworthy and print none of the president's acts.
- OPUS-PEOPLE: the journal of a person the player continues as shows nothing of taking office, interviews or town halls.

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
