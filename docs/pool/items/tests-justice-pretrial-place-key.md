---
id: tests-justice-pretrial-place-key
title: "The bail test names a drawn place but plays the bench's default town"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/sleepy-carson-f8omzd
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T10:01:29.287Z
---

**What.** src/core2/justice-pretrial.test.ts draws a place from all 56 and names it in every message, but builds its world with buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true }) and no placeKey, so the world is the bench's default town, not the drawn one. On seed d17c5c9ae7513c52 the test names Selbyville, Delaware, while the end-cash-bail law row it enacts names place 0420680. A test that reports a place it did not play gives a false record of where the law was proven.

**Rules.** One rule, all 56 places: a test draws its place from all 56 and plays that place, naming the place and seed it played. Generated-world proof: the record ids in a message belong to the world the message names.

**Done when.** src/core2/justice-pretrial.test.ts builds its bench world with the drawn place's key, a run on a fresh seed names the drawn place and the law row it enacts names that place's jurisdiction, and both tests in the file pass on that seed and on d17c5c9ae7513c52.

**Files.** src/core2/justice-pretrial.test.ts

**Notes.** Found Oct 24 by the effects lead while gathering #5892's bail evidence.
