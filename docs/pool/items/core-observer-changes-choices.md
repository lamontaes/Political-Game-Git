---
id: core-observer-changes-choices
title: "Turning the debug observer on changes what people choose"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Found by the lying thread, Nov 15 2026, tracing people-free-company-goes-to-one-tie (the Account lead asked for it as its own item)
---

**What.** Setting `core.observer` should only keep each decision's full scores so a session can read why someone chose what they did. It changes the choices instead. At 4846968 (Texas) seed 8647-mason, two-level population, with the state senate filled in and the player at seat 016: with the observer off, person 8ccd5ae0 gave all 11 of their company acts from Feb 1 to Mar 31, 2025 to 63001515. With `core.observer = true` set before Jan 31, the same person visited 027fc7c7 every other day through February. And the decisions still kept no scores (`latestChange.decision.scores` was empty). So a trace moves the world it traces, and a dev-mode reading of why someone acted is a reading of a different world. Guards: the dev-mode "why" a player reads for a choice describes the world the player is in.

**Cause.** Needs cause. Looked at: src/core2/decision-detail.ts `keptDecision` and src/core2/state.ts (the `fullTrace` read near `savedDecision`) only choose what is kept. Something else reads `core.observer` while choosing. Find every read of `observer` on the path from the chooser to the act.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Bookkeeping is a debug switch: turning tracing on keeps more of the record and never changes a choice, so a run with the observer on and one with it off give the same records. No dice: the fix is a read, not a roll.

**Done when.** At the named place 4846968, a pinned test with seed 8647-mason (about a minute, seen red on today's code) runs Feb 1 to 28, 2025 twice, once with the observer on, and finds the same company acts for every person, with the scores kept in the observed run. A second session sees in dev mode on main that turning tracing on leaves a person's next choices unchanged.

**Waits on.** Nothing.

**Files.** src/core2/decision-detail.ts, src/core2/state.ts
