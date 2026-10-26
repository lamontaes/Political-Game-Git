---
id: traits-audit-opening-appointments
title: "The trait audit counts the appointments made when a world opens, so appointments.weigh shows its calls"
area: people
kind: wiring
priority: 3
size: S
status: done
claimed-by: claude/traits-audit-opening-appointments
pr: #6031
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T12:25:13.884Z
---

**What.** appointments.weigh (the appointer's loyalty against merit, src/core2/appointments.ts) runs when the executive module fills the town's department heads and the state's cabinet at the opening (src/core2/modules/executive.ts), before scripts/traits/trait-wiring-audit.ts switches its probe on, and afterward only on a vacancy or a new governor's swearing-in, which a one-year window rarely holds. So the audit reports it silent although every world runs it. Count the opening's calls separately (probe on through the build, kept apart from the played year), so the matrix shows its calls and a decision record id.

**Rules.** No dice; the count is a debug read and changes nothing in play. Never loosen a check: the played year's counts stay as they are.

**Done when.** scripts/traits/trait-wiring-audit.ts on one buildBenchWorld of a drawn place, seed named, reports appointments.weigh's opening calls with an appointment's record id, and data/content/trait-decision-gaps.json drops its row or names the window that still lacks a call.

**Files.** scripts/traits/trait-wiring-audit.ts, data/content/trait-decision-gaps.json

**Notes.** Filed Oct 25 by the traits lead from the never-run send-back (PR 5886).
