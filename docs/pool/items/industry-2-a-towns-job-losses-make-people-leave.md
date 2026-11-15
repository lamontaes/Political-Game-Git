---
id: industry-2-a-towns-job-losses-make-people-leave
title: "When a town loses its jobs, people move away by the town's own unemployment, not the state's"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: industry-1-largest-employers-sized-from-county-establishments
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "owner, Nov 15 21:09Z (industries, coal and farms, a town at one plant that closes, people leaving; most of it probably built); Account lead's rulings 21:15Z; survey by T54 at /mnt/project-files/account-lead/t54-industry-gaps.md"
---

**What.** A plant closing leaves its workers jobless, but the town does not shrink. People weigh moving by their state's unemployment against other places', never their own town's (survey: /mnt/project-files/account-lead/t54-industry-gaps.md, gap 2). Owner, Nov 15 21:09Z: "that power plant closes, and then that town" (21:09Z). Seen: the town's population and the Jobs screen a year after a large closing, and dev mode's Trace of a household's move.

**Cause.** Found in code: `stateUnemployment` (src/core2/modules/counted-moves.ts:280) builds the jobless table by state, and `pullBetween` (counted-moves.ts:320) reads `jobless.get(from)` for the home side, so the town's groups carry their state's rate.

**Fix.** For the played town's own groups (and the full households weighed the same way), the home side of the pull reads the town's unemployment from its own records (seekers against workers, the jobs engine's counts), the state's elsewhere. One rule with one parameter (`countedMovesUnemploymentPull`); no new mover engine.

**Time box.** 3 hours, Opus, medium.

**Rules.** No dice: a household moves from the pull it accrues, never a roll. One model, two tiers: counted and full households read the same town rate. Sliding scales: the pull slides with the rate, no threshold.

**Done when.** At Gillette WY and Lebanon KY with seeds, a closing of the largest employer (through the game's own close path in dev mode) is followed for twelve months: households leaving by month, with and without the change, named by record id; year 1 and time per record at three places with and without, twice a side, alternated. A second session sees at a drawn place it names with its seed that the town shrinks after a closing.

**Waits on.** industry-1 (so a town can lose most of its jobs).

**Files.** src/core2/modules/counted-moves.ts and its test.
