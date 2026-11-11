---
id: laws-enacted-law-reaches-nobody
title: "An enacted town law took effect and no engine read it (Meadow Lakes, Alaska, seed f835dd278d7312a1)"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: opus
effort: high
root: rc2-done-from-records
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** A council bill the player's circle enacted took effect in Meadow Lakes, Alaska (seed f835dd278d7312a1, bill 2025-7, passed 6 to 0), but law reach recorded no one or nothing it reached, so the golden path's step 9 did not count and the town did not visibly change. Find which policy key the law's series maps to and why no handler read it, then make the handler for that key read the law when it takes effect. Laws whose handler is genuinely none stay a stopgap with a row. Found Oct 19 by play-step-9-is-a-read: with step 9 counted only when a reach record exists, this seed reached steps 3 to 8 and 10 but not 9. Seen: the town visibly changing after the player's bill passes (golden path step 9).

**Cause.** Needs cause. Measured: Meadow Lakes, Alaska (0247735), seed f835dd278d7312a1. The Oct 19 replay reported 12 non-state laws taking effect in 365 days; a wider review of series without a law-reach handler (`policyHandlerKeys`) could not tell which one the finder meant. On Oct 27 `GOLDEN_PATH_SEED=f835dd278d7312a1 node --max-old-space-size=6000 --import tsx src/bench/path-check.ts` reached steps 3 and 4 only: it files for Commissioner, knocks 54 doors (40 reached) and stops at 2025-03-09 on an open job-offer stop, so it never reaches the bill (step 9). The path-check driver is the play-first lane's, and the stop must be answered or skipped there before the enacted-law read can be examined.

**Fix.** None until the cause is found.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the law counts as reaching the town only when another engine reads it and records what changed. Wire to the world: the handler moves money, people or a place's records, never only a log line.

**Done when.** A second session, not the builder, plays a year in Meadow Lakes, Alaska with seed f835dd278d7312a1 (a drawn place the item names) and runs the path-check (src/bench/path-check.ts) with GOLDEN_PATH_SEED set to it. It reports step 9 with a reading record id, a test in src/core2/law-reach names the law series and the record it read, and after the player's law passes the owner can see what it changed.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/host.ts, src/core2/law-reach/group-a-records.ts, src/core2/law-reach/group-b-store.ts, src/bench/reached.ts, src/bench/path-check.ts

**Notes.** Found Oct 19 by play-step-9-is-a-read: with step 9 counted only when a reach record exists, this seed reached steps 3 to 8 and 10 but not 9.

Looked at Oct 19 (claude/law-reaches-nobody), not built. The Oct 19 replay of Meadow Lakes reported 12 non-state laws taking effect during 365 days from the game start. Its wider review of series without a law-reach handler (`policyHandlerKeys`) included the Matanuska-Susitna Borough's `housing-land-use.inclusionary-requirement` and `allow-multifamily-in-single-family-zones` (read directly by `src/core2/modules/housing.ts` at construction decisions, so not unread, but only when something is built), the state's `rent-stabilization` (value 0, seven rows) and `broaden-local-authority` (value 0), and the borough's property tax and the federal and state amounts (SNAP maximums, Medicaid match, unemployment insurance, local sales and income tax authority), which other engines read as numbers. I could not tell which one the finder meant. The remaining work is the "named reader or registered reason" detector and the played-world proof above.

Claim released by the Oct 25 audit: no push in 72 hours (branch claude/law-reaches-nobody last pushed Oct 21).

Cannot be checked as written (Claude worker, Oct 27). `GOLDEN_PATH_SEED=f835dd278d7312a1 node --max-old-space-size=6000 --import tsx src/bench/path-check.ts` now reaches steps 3 and 4 only in Meadow Lakes, Alaska (0247735): it files for Commissioner, knocks 54 doors (40 reached) and then "the day stopped at 2025-03-09, before 2025-10-07" on an open job-offer stop (`job-offer:position:organization_71036484feb17f57:2025-03-…`), so the run never reaches the bill (step 9) this item is about. The path-check driver is the play-first lane's (src/bench); the stop needs to be answered or skipped there before the enacted-law read can be examined. Left open.
