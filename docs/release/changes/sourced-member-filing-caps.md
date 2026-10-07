---
id: sourced-member-filing-caps
impact: patch
section: Fixed
title: Member filing reads sourced chamber limits
---

The existing member filer checks saved bills against declared chamber limits before introducing a bill. A missing research row leaves filing uncapped. Sourced limits require bound periods, conditions and exemptions; an unread exemption leaves its whole limit unapplied instead of blocking a potentially exempt bill. The existing filer records “limit not applied: exemption unread” for that intake.

The reader applies admitted subject and sponsor tokens and selects the sourced period condition from each bill’s recorded date. Quoted exceptions and unselected conditions stay labeled; no session window is invented.
