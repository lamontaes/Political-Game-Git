---
id: speech-occasion-test-red-no-drawn-place-gives-two-kinds
title: "The speech-occasion test finds no drawn place with speeches at two kinds of occasion at a fixed seed"
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
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
lead: governing
source: Account lead thread "Make elections read your record", Nov 14
claimed-at:
---

**What.** `SPEECH_OCCASION_SEED=59ade6c6f5cea6a5 npx vitest run src/core2/speech-occasion.test.ts` fails with `no drawn place gave speeches at two kinds of occasion`: Oak Grove, Tennessee (4754700) gave 6 speeches, all at a party meeting; Brentwood Colony, South Dakota (4607068) gave 0; Norco, Louisiana (2255525) gave 3, all at a party meeting. It fails the same way on the clean train head b4c11bc5 and on #9248's branch. Seen: in the events a speech is given at, named on the speech record.

**Cause.** Measured: Oak Grove, Tennessee (4754700), `SPEECH_OCCASION_SEED=59ade6c6f5cea6a5 npx vitest run src/core2/speech-occasion.test.ts` on the train at 53e4b29fe8. The first red (too few kinds of occasion) is gone: since #9346 every governor gives a State of the State, so the year now holds 104 speeches at three kinds of occasion (99 State of the State, 4 party meeting, 1 State of the City). The test now fails one step later, at "names state-of-the-state official:term:seat:US-MA:governor:2025-01-20:2026-01-02:state-of-the-state:session:US-MA:2026-01-01". That id is the governor's day entry. Its record is the result row the governor's day engine keeps under the same id (`results` in `core2-office-day-state-v1`, written by `actOn` in src/core2/office-day-state.ts). All 99 ids open a row there. The test's `opens` looks only in the event log and in three tables (meeting remarks, party meetings, campaign promises), so it calls a true id dead. The engine is right and the test's lookup is one table short.

**Fix.** In src/core2/speech-occasion.test.ts, `opens` also looks in the `results` table of `OFFICE_DAY_STATE_MODULE_ID`. Pin the test to Oak Grove at the seed above and to two more named places, as `pinned-tests` says. No engine change. The 96 addresses by other states' governors that this run also showed are the subject of `speed-other-governors-address-reaches-every-follower`, filed in #9476.

**Time box.** 1 hour for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the test draws or pins a named place from the 56 and prints its place and seed. Never loosen a test to get green; it is pinned to a named place and seed as `pinned-tests` says.

**Done when.** A second session runs the command above on main in the drawn places named above and the test passes at that seed, and at two other seeds pinned in the test file, each in its drawn place, with the occasion kinds found named by record id in Notes.

**Waits on.** Nothing.

**Files.** src/core2/speech-occasion.test.ts, src/core2/modules/speech.ts

**Notes.** Found while gating #9248. Nov 15 (Fable B): cause found on the train at 53e4b29fe8; see Cause. The occasion ids that open by record at Oak Grove: 99 of 99 State of the State ids open a `results` row of the governor's day engine, counted by a scratch copy of the test that was not committed.
