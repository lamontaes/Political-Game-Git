---
id: roadmap-m1-10-views-played-world
title: "M1-10 is proven only in a views-only world with a fixture event; prove it in a played year"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Roadmap M1-10's command (src/core2/views.test.ts) builds a world with only the views module and injects fixture.plant-closing through applyCoreEvent, so the merger sent back its flag on #5875: the spec's 'a big event shifts the people it touches and no one else' is not shown through the ordinary event producer. A played-year check in the runner's drawn place should find a real big event (a closure, a layoff or a law reaching people), name the people it touched and show their stances moving while untouched people's stay, and check the opening views against the state and metro answer keys.

**Rules.** Wire to the world: the check plays buildBenchWorld with every module for a year in a place drawn from all 56; hand-inserted fixtures prove edge cases only. Ask why: each moved stance names the event that moved it by record id.

**Done when.** A command for M1-10 plays a year in the runner's drawn place, names a big event, the people it touched and their stance changes by record id, shows untouched people's stances unmoved by it, and checks opening views against the answer keys; run on main with place and seed in the PR body.

**Files.** src/bench/m1-10-check.ts, docs/roadmap/features.json

**Notes.** From the merger's send-back on #5875, Oct 24.
