---
id: tests-petition-short-world-time
title: "A played Sherrodsville case takes about 40 seconds; find what in the world's days and build is slow"
area: core
kind: cleanup
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: sonnet
effort: medium
root: none
source: Account lead, Nov 16 00:45Z: petition-short.test.ts' longer test takes 450 seconds
---

**What.** `src/director/petition-short.test.ts` "other worlds" plays 16 worlds (6 clerk seeds and 2 helper seeds, with and without half an hour of canvass) at about 28 seconds each; the whole file is about 13 minutes. The worlds are not to be cut; the fix, if any, is in what is slow. Seen: in the timing of `npx vitest run src/director/petition-short.test.ts`, which nobody sees in play.

**Cause.** Measured: Nov 16 at Sherrodsville OH 3972242, seed scan-3, one world (40.2 s): build 8.7 s, 138 days from the start date (2025-01-20) to the filing window 17.9 s (0.13 s a day), 57 days from filing to Aug 3 8.6 s (0.15 s a day), finding a player with a race open 4.9 s (`governmentView` called per household member until one has a filing open). A CPU profile of the build and the first 138 days (one process, 33 s of samples): `buildBenchWorld` 8.5 s inclusive; `runDay` 15.9 s inclusive, of which `runModuleCalendar` 5.3 s; `world-legislating` `openSession`/`openSittingSessions`/`openOutsideSession` about 2.0 to 2.5 s (legislature `members` 1.9 s); `officials` `seatAll`/`seatOfficial`/`holderOf` 1.6 to 1.8 s; `place-lookup` `searchOrder` 1.5 s (called from `searchCorePlaces`, `drawStateHome`); garbage collection 3.3 s. Every world of one seed repeats the same build and the same 138 days: scan-3 is built nine times in the file's tests.

**Fix.** Read the profile's hot spots in order: `searchOrder` in place-lookup (index it instead of ordering on each call), the legislature's session opening (members read once per session), `seatAll`. Then time one world again: the bar is a world at least 20% faster with every record unchanged (`speed-work`: same world, same records, one process). Do not cut worlds, seeds or cases, and do not copy or freeze a world to skip the wait (AGENTS: no frozen copies).

**Time box.** 3 hours.

**Rules.** speed-work: prove with the same seed, same records; one process at a time; no behavior change.

**Done when.** A second session, at a drawn place (the pinned Sherrodsville OH world, seed scan-3), runs `npx vitest run src/director/petition-short.test.ts -t "other worlds"` alone before and after at the same head and the time falls by at least 20% with the played file identical.

**Waits on.** Nothing.

**Files.** src/core2/place-lookup.ts, src/core2/modules/world-legislating.ts, src/core2/modules/officials.ts

**Notes.** Found by the petition-short thread (PR #9536). The 138 days are `advanceToRaceFiling` with bookkeeping off. The per-day cost is the world's own; this item is about what in it is slow.
