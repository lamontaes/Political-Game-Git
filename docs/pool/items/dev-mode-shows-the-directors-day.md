---
id: dev-mode-shows-the-directors-day
title: "Dev mode shows which moments the director weighed today, which it staged, which it held and why (owner, Nov 16)"
area: play
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
model: sonnet
effort: medium
root: rc6-scenes-repeat
lead: director
source: owner, Nov 16 00:59Z, "if it's not already being traced by the dev mode, it should be being traced by that"
---

**What.** The director weighs each moment as it arrives and writes a schedule entry: a scene now, a scene waiting, or a journal line, with the types it bound and, since the record rule, the reason a scene was held (`nothing-changed`, `nothing-to-ask`, `season-cap` until it is deleted). Dev mode's Trace opens a record by id and its reasons, but nothing in dev mode lists a person's day of moments with what the director did to each. To learn why a scene did not come, a session reads the ledger in code or runs `scripts/dialogue-batch/cap-year.ts`. Seen: in the cap work at Frankfort, Kentucky (2128900), seed a1b2c3d4e5f6…e9, the warning and speech scenes held by the old thirty-day window could only be found by a script over `ledger.people`.

**Cause.** Found in code: the schedule entry (`ScheduleEntry` in `src/director/scheduling.ts`, `scheduleMoment`) already carries `outcome`, `bindings`, `heldBack` with a reason per held type, `rank` and `pace`; `src/bench/dev-api.ts` has `GET trace/node` (a record by id) and no route that reads a person's schedule; `src/bench/ui/dev-trace-box.mjs` opens only records.

**Fix.** Add one read-only dev route, `GET dev/director/day?person=&date=`, that returns that person's schedule entries for the day through the one ledger the director writes (no second copy), and one dev screen that lists them with the cause record id (opening in the existing trace box), the type bound, the outcome, the held reasons worded through the English engine's labels, and the closed reason when a scene became a journal line (including the "no complete wordings path" reason when that exists). Reuse `traceBox`; add no new tracing system.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the screen reads the director's own schedule entries and writes nothing and spends no game time. Replace, never layer: it reads the ledger's entries, never a copy kept for the screen. Ask why: every row carries the cause record id and the reason the director gave, by record.

**Done when.** A second session in the running game at a drawn place, with dev mode on, picks the player or a watched official, opens the director's day for a date with a held scene, and sees each moment with its cause record, its outcome and the reason it was held, and opens the cause in the trace box. A test at a named place and seed shows the route's rows equal the ledger's entries for that day, by record id.

**Waits on.** Nothing. The reasons it shows grow as `director-cap-on-scene-repeats` and the candidate-pick item land.

**Files.** src/bench/dev-api.ts, src/bench/ui/dev-trace-box.mjs, src/bench/ui/dev-director-day.mjs (new), src/director/scheduling.ts

**Notes.** Filed by hand from the briefing-room thread, Nov 16, after the owner's rule that whatever is traced by script or code should be shown by dev mode. The director three-piece plan (/mnt/project-files/scene-buildout/director-three-pieces-plan.md) adds this view to piece 2's done-when.
