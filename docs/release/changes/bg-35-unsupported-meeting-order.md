---
id: bg-35-unsupported-meeting-order
impact: none
section: documentation
title: Record BG-35 meeting-order source gap
---

BG-35 remains unsupported pending source-backed meeting order. `local-council-meetings.ts` uses a generic agenda and is not bound to the jurisdiction-specific `municipal-public-work.ts` meeting-series reader. The current scene projection can expose a same-date recorded roll call while the meeting is active; `speakAtOrdinaryMeeting` records the player's public comment only after the player acts. The separate `meeting-practice/declarations.json` has 23 reference candidates across 15 government keys (10 public-comment true, 11 UNKNOWN, 2 false), no ordering field, and explicitly does not establish enacted-current authority. No checked-in source supplies a comment-before-vote order contract across all 56 jurisdictions, so simulation chronology cannot be changed safely. The existing scene test verifies comment recording and post-meeting vote display but does not assert active-phase roll-call ordering. Voter names are derived from person records with `personName`; the actor role text `Resident` is a generic role label.
