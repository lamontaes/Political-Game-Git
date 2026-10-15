---
id: office-needs-office-state-26
title: "Needs from other sessions listed in OFFICE-STATE.md (line 26): 1 lines"
area: office
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/OFFICE-STATE.md "Needs from other sessions" (line 26)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

- The local and federal office-day engines are now on main. Session C replaces the state scheduler stand-in with the shared registry, stops and act ledger.

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
