---
id: tests-property-tax-laws-draws-its-place
title: "The property tax cap test draws a random place, and the cap-allowed case is not pinned"
area: laws
lead: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
source: found by the tax-wiring thread, Nov 14 (PR #9147)
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** `src/core2/property-tax-laws.test.ts` draws its place from a fresh random seed (`randomBytes(32)`, four attempts), so a run can pass or fail by draw, and it names no place where a state allows a local growth cap and the cap bites. The wiring test `law-wiring-taxes.test.ts` is now pinned to Gas, Kansas, a state that bars local caps; Burlington, Massachusetts (seed aa11) also passes there but takes about 5 minutes. Seen: the property tax bill card in a town where a cap is in force, which should show the tax the cap saved.

**Cause.** Found in code: src/core2/property-tax-laws.test.ts line 28 builds `drawSeed = randomBytes(32).toString("hex")` and tries `drawPlace` up to four times; no state is named whose starting law grants local caps.

**Fix.** Pin the test to one named place whose state grants local growth caps and one whose state bars them, each with a fixed seed and an explicit timeout near a minute; keep the controlled cap and repeal assertions.

**Time box.** 3 hours for one Sonnet session; push what passes and stop.

**Rules.** No dice; one rule for all 56 places, so the places live in the test file as data, never in logic. Do not loosen an assertion.

**Done when.** A second session replays it: at a drawn place in a state that allows local caps, dev mode puts the cap in force at the city, plays a year and reads the cap's tax saving on the owner household's bill card by `lawApplied` record id; the pinned test passes in about a minute at both named places.

**Waits on.** Nothing.

**Files.** src/core2/property-tax-laws.test.ts

**Notes.** Filed on the tax-wiring thread's branch.
