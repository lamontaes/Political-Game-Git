---
id: team7-day-callers-minute-route
impact: patch
section: Fixed
title: Day-based waiting follows the game clock
---

Day advancement and the demo, formative interval and successor wait now use the shared minute clock. Local target times survive daylight-saving changes. Advancement stops at the actual commitment frontier and keeps its saved result instead of skipping it.

Default day and minute advancement also carry the existing due handlers, including payment already earned from a completed work shift.
