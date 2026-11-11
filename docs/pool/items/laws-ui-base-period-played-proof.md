---
id: laws-ui-base-period-played-proof
title: "Unemployment claim reads the base period: a played twin pair after an hours cut, below the state's weekly maximum"
area: laws
kind: wiring
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-laws-ui-base-period-played-proof
pr: #8415
blocked-on:
lead: laws-effects
source: added with npm run pool -- add
after:
model: sonnet
effort: low
root: rc2-done-from-records
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:41:14.012Z
branch: claude/pool-laws-ui-base-period-played-proof
---

**What.** Unemployment claims read the person's pay by quarter (first four of the last five completed quarters, #7949). No played year has yet shown a claim after a real hours cut (Jobs' #7781 rehourJob) drawing the same benefit as steady hours. The first played pair found no claim because the layoff was refused for the day, and the state's weekly maximum capped both reads. Seen: the unemployment benefit on a laid-off person's card after an hours cut.

**Cause.** Found in code: `basePeriodWages` in src/core2/jobs-benefits.ts (line 299) reads pay by quarter (first four of the last five completed quarters, PR #7949), and stopgap SG-LAWS-ui-base-period-last-pay (src/core2/data/stopgaps/laws.json, line 108) is open because no played year has yet shown a claim after a real hours cut.

**Fix.** Run a played pair (hours cut then layoff, retrying when layOffWorker returns worked-today) below the weekly maximum and compare claim records; narrow the stopgap.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the claim must be shown in a played world by record id. Generated-world proof, a drawn place and seed, no hand-set pay history.

**Done when.** A second session, not the builder, replays the pair on main: in a drawn bench world (place and seed named) a worker below the state's weekly maximum has hours cut in the last completed quarter before a layoff; the business's own layoff files a claim (retried the next day when `layOffWorker` returns worked-today); the claim equals the steady-hours twin's, named by claim record id; and SG-LAWS-ui-base-period-last-pay is narrowed to workers with no pay record. The run takes about 13 minutes, so it is a run in the PR body, not a test in the suite.

**Waits on.** Nothing.

**Files.** src/core2/jobs-benefits.ts,src/core2/unemployment-base-period.test.ts

**Notes.** Nov 9 (Laws and effects, #7949): the first played pair (Cutter AZ, seed 8a2cb07c) found no claim because layOffWorker returned worked-today, so the test must retry the layoff the next day. The twin needs a worker whose benefit is below the state's weekly maximum, since Arizona's 32,000 minor units caps both the base-period read and the last-pay read. A run takes about 13 minutes, so it is a run in the PR body, not a test in the suite.

Claimed by next for sonnet-cc77 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:41 UTC) on branch claude/pool-laws-ui-base-period-played-proof.
