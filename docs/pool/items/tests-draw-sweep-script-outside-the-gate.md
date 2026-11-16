---
id: tests-draw-sweep-script-outside-the-gate
title: "A sweep script that replays pinned tests' old draws on fresh seeds, outside every gate, and files what fails"
area: core
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: cto
model: sonnet
effort: medium
source: views thread, Nov 16 (trial batch of bench pins; the Account lead held it)
---

**What.** About 1,100 test files drew their place from a run-time seed. Pinning them makes the gate steady, but a pinned test no longer meets new places, so the faults a fresh draw used to show (four real ones in a trial batch of 37 bench files) go unseen. The trial batch took 3,450 s of test time for 37 files, two at a time; at that rate all 1,100 drawing files are about 28 hours of one lane, so no gate can run them.
Guards: the faults a player would meet in a place no pinned test plays (an order with no name, an empty spoken answer), found before the player meets them.

**Cause.** Measured: the trial batch of 37 bench files (Nov 16, Train 6d12556a) took 3,450 s and found 4 real faults only because each pin met a new place once (for one, `npx vitest run src/bench/bill-orders.test.ts` at Cassoday, Kansas, world seed dfac6a2adae9340d902f5eab265dc0bf045dbda7e35fc30c73c1af806803b63e); pinned, src/bench files no longer meet new places. The Account lead held this on Nov 16: not tonight, no blanket sweep, and a drawing test is pinned only when it is red on the Train or a PR touches it.

**Fix.** A script, `scripts/tests/draw-sweep.ts`, that takes a list of pinned test files and N fresh seeds. For each, it runs the file with its old run-time draw restored by an env variable the pinned file reads only outside the gate, one or two files at a time with a heap cap. It writes a TSV of file, seed, place, case and first failing line. Each new failure, by file and case rather than by seed, becomes a Needs-cause item filed by hand with its place and seed, and a repeat adds a Notes line to the existing item. It never runs in a gate and is never a red on anyone's PR. A nightly cloud run would take about 50 files a night, in rotation.

**Time box.** 4 hours, Sonnet at medium effort.

**Rules.** pinned-tests and drawn-place-tests; nothing that runs in a gate draws at run time.

**Done when.** One run over ten pinned files on two fresh seeds writes its TSV, files or annotates items for what failed, and changes no gate result. A second session reruns it at a drawn place and gets the same rows.

**Waits on.** The lead's go-ahead.

**Files.** scripts/tests/draw-sweep.ts (new)

**Notes.**
