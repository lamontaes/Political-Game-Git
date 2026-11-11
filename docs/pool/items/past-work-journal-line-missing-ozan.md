---
id: past-work-journal-line-missing-ozan
title: "The working life's Journal check fails in Ozan, Arkansas: a past job has no Journal line"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: 
blocked-on:
lead: lives
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** src/core2/past-work.test.ts fails on clean main (origin/main, Nov 11, 2026) in Ozan, Arkansas (place key 0552940, seed 5c770c3a8e72833a42d0fb4f4b59d487eb02143e1a3c16f5fe21ba480b71ad1f), in the check 'is told in the Journal from its own records': 'past-work:person_3c0e5ff982fdf83d:1: expected 0 to be greater than 0'. The other five checks pass. Replay: GOLDEN_PATH_SEED=<seed> GOLDEN_PATH_PLACE_KEY=0552940 npx vitest run src/core2/past-work.test.ts. Seen: the Journal, where every past job reads as a line.

**Cause.** Needs cause. Looked at: only the failing assertion and the record id it names. Not traced: why that spell's record has no Journal line (its employer, its kind or the words bank).

**Fix.** None until the cause is found.

**Time box.** 2 hours

**Rules.** Ask why: name the spell's record and what the Journal reader does with it in that played world. Never weaken a test: the check keeps failing when a past job has no line.

**Done when.** A second session replays Ozan, Arkansas with the seed above and sees past-work.test.ts pass, and runs it in two fresh drawn places named with their seeds.

**Waits on.** Nothing.

**Files.** src/core2/past-work.ts
