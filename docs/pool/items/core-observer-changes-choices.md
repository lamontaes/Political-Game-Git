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

**Cause.** Found in code: two routes. (1) src/core2/calendar.ts `hasDailyFocus` (about line 93) starts with `core.observer ||`, so with the observer on every full person chooses every day instead of at their tier's cadence. At 4846968 seed 8647-mason, Feb 1 to Mar 31, 2025, counted from every relationship change notice (not from kept evidence): 2,751 visits with the observer off and 10,346 with it on; 26 of the 31 state senators visit nobody with it off (they are tier `calendar`) and most visit a colleague daily with it on. (2) A smaller route: with every read of `core.observer` turned off except the tie writer's `fullTrace` (src/core2/state.ts, about line 1241), 8ccd5ae0's acts still differ from Feb 2. That switch keeps every tie's full decision and its `latestChange`. The director's two reads of `latestChange` (src/director/relation-facts.ts:139, src/director/arc-variant.ts:595) are not the route: with both off it still diverges. What on that path moves the world is not yet found.

**Fix.** (1) Drop `core.observer` from `hasDailyFocus`: the observer keeps more of the record, never a different cadence. (2) Trace the `fullTrace` route before fixing it: run the bisect with route (1) removed, then read what holds the full decision object (`copyRelationshipEvidence`, the condensing queue in src/core2/decision-detail.ts, which replaces the row object with `core.relationships.set(id, {...row})` only when the observer is off).

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Bookkeeping is a debug switch: turning tracing on keeps more of the record and never changes a choice, so a run with the observer on and one with it off give the same records. No dice: the fix is a read, not a roll.

**Done when.** At the named place 4846968, a pinned test with seed 8647-mason (about a minute, seen red on today's code) runs Feb 1 to 28, 2025 twice, once with the observer on, and finds the same company acts for every person, with the scores kept in the observed run. A second session sees in dev mode on main that turning tracing on leaves a person's next choices unchanged.

**Waits on.** Nothing.

**Files.** src/core2/calendar.ts, src/core2/decision-detail.ts, src/core2/state.ts

Nov 15 (lying thread): the first report above counted from `latestChange`, which a tie keeps only when it touches the player's circle (state.ts `retainRelationshipEvidence`), so "11 of 11 to 63001515" was the circle's share. Counted from every change notice, 8ccd5ae0 with the observer off visits every other day, turn about among 63001515, 63001615, 00541b92, 027fc7c7 and three others (29 visits to 7 people); with it on, 027fc7c7 on 27 of 27. Counted by the lying thread's scripts (project files, lying, company), head ee4c3740.
