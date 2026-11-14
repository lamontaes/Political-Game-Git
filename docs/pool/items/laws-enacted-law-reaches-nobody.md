---
id: laws-enacted-law-reaches-nobody
title: "An enacted town law took effect and no engine read it (Meadow Lakes, Alaska, seed f835dd278d7312a1)"
area: laws
kind: bug
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: haiku
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** A council bill the player's circle enacted took effect in Meadow Lakes, Alaska (seed f835dd278d7312a1, bill 2025-7, passed 6 to 0), but law reach recorded no one or nothing it reached, so the golden path's step 9 did not count and the town did not visibly change. Find which policy key the law's series maps to and why no handler read it, then make the handler for that key read the law when it takes effect. Laws whose handler is genuinely none stay a stopgap with a row. Found Oct 19 by play-step-9-is-a-read: with step 9 counted only when a reach record exists, this seed reached steps 3 to 8 and 10 but not 9. Seen: the town visibly changing after the player's bill passes (golden path step 9).

**Cause.** Measured: `GOLDEN_PATH_SEED=f835dd278d7312a1 node --max-old-space-size=8192 --import tsx src/bench/path-check.ts` on main 903b659706 (Meadow Lakes, Alaska, 0247735) no longer reaches a bill, so the law this item is about cannot be replayed. The run reached steps 3 and 4 only. It filed for borough mayor in 2025 and lost (31.0 percent against person_3c83b6a965da69f0), filed for commissioner in 2026 and lost (7.3 percent), filed for state representative in 2028 and lost, and ended on 2028-11-08 with no resident officeholder on a body. The Oct 19 replay's bill (2025-7, passed 6 to 0) belongs to a world main no longer builds, and the item never named the law's series. Whether any enacted law reaches nobody is graded for every law by main's law-wiring matrix (`docs/reports/law-wiring-matrix.json`, the reach link per law), which is where such a law is found and filed today.

**Fix.** Nothing to build. Proposed: the CTO drops the item (`npm run pool -- status laws-enacted-law-reaches-nobody dropped --by=cto`). The bill cannot be replayed on main, and a law that reaches nobody is found per law by the law-wiring matrix's reach link, not by this seed.

**Time box.** 0.5 hours for one Haiku session, only if the CTO keeps the item.

**Rules.** An effect is a read, not a record: the law counts as reaching the town only when another engine reads it and records what changed. Wire to the world: the handler moves money, people or a place's records, never only a log line.

**Done when.** The CTO drops the item. If it is kept, a second session runs the path check in a drawn place where the player wins a seat and passes a bill (named with its seed) and sees step 9 reported with the reading record id of the law that took effect.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/host.ts, src/core2/law-reach/group-a-records.ts, src/core2/law-reach/group-b-store.ts, src/bench/reached.ts, src/bench/path-check.ts

**Notes.** Found Oct 19 by play-step-9-is-a-read: with step 9 counted only when a reach record exists, this seed reached steps 3 to 8 and 10 but not 9.

Looked at Oct 19 (claude/law-reaches-nobody), not built. The Oct 19 replay of Meadow Lakes reported 12 non-state laws taking effect during 365 days from the game start. Its wider review of series without a law-reach handler (`policyHandlerKeys`) included the Matanuska-Susitna Borough's `housing-land-use.inclusionary-requirement` and `allow-multifamily-in-single-family-zones` (read directly by `src/core2/modules/housing.ts` at construction decisions, so not unread, but only when something is built), the state's `rent-stabilization` (value 0, seven rows) and `broaden-local-authority` (value 0), and the borough's property tax and the federal and state amounts (SNAP maximums, Medicaid match, unemployment insurance, local sales and income tax authority), which other engines read as numbers. I could not tell which one the finder meant. The remaining work is the "named reader or registered reason" detector and the played-world proof above.

Claim released by the Oct 25 audit: no push in 72 hours (branch claude/law-reaches-nobody last pushed Oct 21).

Cannot be checked as written (Claude worker, Oct 27). `GOLDEN_PATH_SEED=f835dd278d7312a1 node --max-old-space-size=6000 --import tsx src/bench/path-check.ts` now reaches steps 3 and 4 only in Meadow Lakes, Alaska (0247735): it files for Commissioner, knocks 54 doors (40 reached) and then "the day stopped at 2025-03-09, before 2025-10-07" on an open job-offer stop (`job-offer:position:organization_71036484feb17f57:2025-03-…`), so the run never reaches the bill (step 9) this item is about. The path-check driver is the play-first lane's (src/bench); the stop needs to be answered or skipped there before the enacted-law read can be examined. Left open.

Nov 11 (cause finder for Fable B): ran the path check at the item's seed on main 903b659706. The player lost all three races it entered (2025, 2026, 2028), so no bill is ever passed and the item's law cannot be replayed. I propose the CTO drops the item; the law-wiring matrix grades every law's reach.

Dropped Nov 13, 2026 (Account lead T43, CTO's ruling on #8928 comment 6865473498, checked against the code on the train, draft PR #9052, eb349e5d76): its own Fix says nothing is left to build. Code check: the bill (2025-7, Meadow Lakes) cannot be replayed on main, and whether an enacted law reaches nobody is graded per law by the `reach` link of every row in `docs/reports/law-wiring-matrix.json` (187 laws, no row stopgapped). I did not re-run the path check (heavy); the closure rests on the item's own Nov 11 run and on that matrix.
