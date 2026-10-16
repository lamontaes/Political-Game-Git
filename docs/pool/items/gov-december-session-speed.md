---
id: gov-december-session-speed
title: "The December legislative session takes 6 seconds"
area: gov
kind: cleanup
priority: 2
size: M
status: claimed
claimed-by: claude/gov-december-session-speed
pr:
blocked-on:
milestone:
source: "split from core-needs-core-91 (Oct 15, 2026)"
claimed-at: 2026-10-16T05:09:11.641Z
---

**What.** The December legislative session takes 6 seconds, 3.5 of them in committee rosters and chamber votes (`leadership.ts` `committeeRoster`, `legislature.ts` `chamberVote`). Build rosters once per session and vote from the rosters, not by scanning every member for each bill.

**Rules.** An effect is a read; one rule, all 56 places; estimate, never UNKNOWN; speed: measure before and after on the same base and machine, one process at a time.

**Done when.** Measured before and after on the same base and machine in a drawn place: the session's seconds fall and every roll call is identical, by record id.

**Files.** src/core2/modules/leadership.ts, src/core2/modules/legislature.ts

**Notes.** Split out of `core-needs-core-91`; verify against main before starting.
