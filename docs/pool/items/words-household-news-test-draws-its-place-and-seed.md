---
id: words-household-news-test-draws-its-place-and-seed
title: "The household news test draws a random place each run and is red by draw"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: sonnet
effort: medium
root: none
source: found on branch claude/project-thread-aqtryq (gate of the call-letters change, Nov 14)
checked: m3 2026-11-14
---

**What.** `src/director/household-news.test.ts` (a relative raises a printed story by its headline and outlet) fails with "no relative heard a printed story in 200 days: expected null to be truthy" in some places and passes in others, so it is red by draw, which the pinned-tests skill forbids. Seen: News and the talk at home in a town where nobody in the household heard a printed story within 200 days.

**Cause.** Found in code: src/director/household-news.test.ts takes its seed from `GOLDEN_PATH_SEED` or from `randomBytes(20)` and then `drawPlace(seed, "household-news")` (lines 20 and 21), so each run plays a different place. Measured: it failed at Chubbuck, Idaho (seed 1a7236be5b3282d8d0ac45a2d6f867123fc68d0f) and at Roseville, Michigan (seed f3ae07292614495534a496d5f7d39d949d66ab1f), and failed the same without the call-letters change.

**Fix.** Pin the test to named places with fixed seeds, chosen by playing 200 days in several drawn places and keeping those where a relative hears a printed story, naming the place and seed in the failure message; a place where nobody hears one in 200 days gets its own case that says so by record, not a loop.

**Time box.** 2 hours.

**Rules.** No dice; tests pinned to named places and fixed seeds, about a minute each.

**Done when.** The test passes at its pinned places on the train head, each run under about a minute, and a second session sees a relative bring up a printed story with its headline and outlet in the running game at a place and seed the builder did not choose.

**Waits on.** Nothing.

**Files.** src/director/household-news.test.ts
