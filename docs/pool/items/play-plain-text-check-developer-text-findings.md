---
id: play-plain-text-check-developer-text-findings
title: "The plain-text check, run to its end, reports developer text in News, Politics metrics and the talk box"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: 
blocked-on:
lead: play-first
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
claimed-at:
branch: claude/pool-play-plain-text-check-developer-text-findings
---

**What.** With the filing counter no longer stopping it, src/bench/plain-text.browser.mjs runs to its end in Erin, Tennessee (seed 0a9662a1-9a9e-4061-a9a1-b3015a791d9a) and fails on its own assertion: developer text on the player's screens. Some of what it flags is a real defect and some looks like the check's own false positives, so each flagged string has to be judged and either fixed on the screen or the check's pattern corrected for what it should not flag. Seen: the News line for the state campaign contribution limit. Seen: the News line for the state campaign contribution limit.

**Cause.** Measured: the command node src/bench/plain-text.browser.mjs against the running bench, in Erin, Tennessee (seed 0a9662a1-9a9e-4061-a9a1-b3015a791d9a), with dev mode on during the run, lists: News 'State campaign contribution limit: stateHouse took effect on January 1, 2025.' (and stateSenate), a field name; Politics Metrics 'up 0.3 since last year' (and four more) as a bare fraction; Talk box 'Mark gap' (six times; the check turns dev mode on, where Mark gap is allowed); News 'WUOI-TV' and 'WOVN-TV' as a status code (they are broadcast call signs); and 'Act 2025-12', 'Act 2025-10', 'Act 2025-13' as an ISO date (they are act numbers). The first is a field name on a News line; the Metrics lines may be a rounded figure; the rest look like the check's own patterns.

**Fix.** For each flagged string, read it against the owner's player-screen-text rules: fix the News line that prints a field name (stateHouse, stateSenate) through the English engine's worded labels; decide whether 'up 0.3 since last year' is a rounded figure; and correct the check's patterns so dev-mode Mark gap, call signs and act numbers are not flagged, without loosening what they exist to catch. Run the check in two drawn places, place and seed named, and read a pass.

**Time box.** 3 hours

**Rules.** No hand-written player text: the News line comes from the English banks. Never weaken the check: a pattern is narrowed only to what a player never sees as developer text, and each narrowing is explained in the PR body.

**Done when.** A second session runs src/bench/plain-text.browser.mjs against the running bench in two drawn places (place and seed named) and reads PASS with no developer text found; the News line for the state campaign contribution limit names no field name, by record id.

**Waits on.** Nothing

**Files.** src/bench/plain-text.browser.mjs, src/english, data/english

**Notes.** Released by next (2026-11-11): no push to claude/pool-play-plain-text-check-developer-text-findings since 2026-11-11 03:58 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-play-plain-text-check-developer-text-findings.
