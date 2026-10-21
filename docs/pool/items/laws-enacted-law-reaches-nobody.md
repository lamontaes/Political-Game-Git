---
id: laws-enacted-law-reaches-nobody
title: "An enacted town law took effect and no engine read it (Meadow Lakes, Alaska, seed f835dd278d7312a1)"
area: laws
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/law-reaches-nobody
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T20:43:48.638Z
---

**What.** A council bill the player's circle enacted took effect in Meadow Lakes, Alaska (seed f835dd278d7312a1, bill 2025-7, passed 6 to 0), but law reach recorded no one or nothing it reached, so the golden path's step 9 no longer counts and the town did not visibly change. Find which policy key the law's series maps to and why no handler read it, then make the handler for that key read the law when it takes effect. Laws whose handler is genuinely none stay a stopgap with a row.

**Rules.** An effect is a read, not a record: the law counts as reaching the town only when another engine reads it and records what changed. Wire to the world: the handler moves money, people or a place's records, never only a log line.

**Done when.** In a played year in Meadow Lakes, Alaska with seed f835dd278d7312a1, `npm run` path-check (src/bench/path-check.ts) with GOLDEN_PATH_SEED set to it reports step 9 with a reading record id, and a test in src/core2/law-reach names the law series and the record it read; the owner plays it: after his law passes, he can see what it changed.

**Files.** src/core2/law-reach/host.ts, src/core2/law-reach/group-a-records.ts, src/core2/law-reach/group-b-store.ts, src/bench/reached.ts

**Notes.** Found Oct 19 by play-step-9-is-a-read: with step 9 counted only when a reach record exists, this seed reached steps 3 to 8 and 10 but not 9.
