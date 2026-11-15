---
id: campaign-rival-help-test-red-by-draw
title: "The rival-help test draws its places from the clock, so it is red whenever eight draws hold no rival race"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: sonnet
effort: medium
root: none
source: found by M5 while gating PR 9284, Nov 14, 2026
---

**What.** `src/core2/campaign-rival-help.test.ts` seeds its draws from `Date.now()` (`runSeed`, unless `GOLDEN_PATH_SEED` is set) and tries eight drawn places (`DRAWS = 8`) for one that holds a rival race. On a run where none of the eight does, all four tests fail with "no draw held a rival race", whatever the change under test. Guards: the rival-help rule stays proved on every run without depending on the draw.

**Cause.** Found in code: `runSeed` in src/core2/campaign-rival-help.test.ts is `sha256("campaign-rival-help:" + Date.now())`, and `findRace` throws after eight salts. Measured: on PR 9284's head (4453c29c) one run failed all four tests with "no draw held a rival race" and the next run passed, with no change between them.

**Fix.** Pin the test to one named place and seed where a rival race is held, found by running the current draw loop once with `GOLDEN_PATH_SEED` set and keeping the place and seed it lands on, as the pinned-tests skill says; the same assertions, no added retries or draws. Name the place and seed in the test's comment.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what is measured, set the state honestly with a one-line note, and stop.

**Rules.** Never loosen a test to get green; a pinned place stages its race through the game's own path. One rule, all 56 places: the pinned place is any of the 56, named in the test.

**Done when.** A second session runs `npx vitest run src/core2/campaign-rival-help.test.ts` five times on main and sees it pass every time in about a minute, at the drawn place named in the test with its seed, with the four assertions unchanged.

**Waits on.** Nothing.

**Files.** src/core2/campaign-rival-help.test.ts

**Notes.** The test's subject was done under campaign-candidates-never-help-a-rival; this item is only its draw.

Nov 15 (views thread): still red on the train at ff9703d7, run seed be22ffb0f1f8f347280d9c18135c92ce0348c9a65666e5f44735c95d81c985cd: all four tests fail with "no draw held a rival race". The draws were Merryville LA, Unionville NC, Washington DC, Joiner AR, Avoca AR, Statesboro GA, Ansonia CT and Greenwood DE. Most could file nobody for a local seat; two found a resident whose own reasons said no to volunteering. The lead ruled that this test must stop hunting by draw: stage a rival race through the game's own path (two residents file for one contest, then the asks) at one named place and seed.
