---
id: a114-shared-ballot-audit
impact: patch
section: Changed
title: The nominations audit recognizes the shared counter donor
---

This pending audit rule checks the shared voter counter in the received
nomination donor instead of requiring a separate party support read. The pinned
main source still passes 0 of 3 checks; the published O8 donor passes 3 of 3
under this rule. This rule does not install that counter or change election
behavior. Admission waits for the actual counter and primary consumer to land.
