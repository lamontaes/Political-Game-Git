---
id: b06-p2-case-opened
impact: patch
section: Fixed
title: Recorded officeholder contacts open linked constituent cases
---

Recorded contacts to a current officeholder create one `office.case-opened`
event linked to the originating contact. Both substantive messages and general
contacts preserve their recorded reason and source fields through the same
writer. Case handling and office-desk display remain separate follow-up work.
