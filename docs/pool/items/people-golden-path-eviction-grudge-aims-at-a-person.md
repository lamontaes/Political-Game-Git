---
id: people-golden-path-eviction-grudge-aims-at-a-person
title: "A grudge after an eviction by a landlord company aims at a person, not the company"
area: people
lead: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Golden-path M1-11 red on the Train at Hagåtña, Guam, seen on #9517 and on the clean Train b22cd350, Nov 15"
checked:
---

**What.** The golden path's M1-11 check (src/bench/m1-11-check.ts, part 4) fails at Hagåtña, Guam: a grudge formed from an eviction aims at a person while the eviction's record names the landlord, an organization. The check reads the drives engine's own rule for who an event names, so the drive and the rule disagree. Seen: the person who was evicted holds the grudge against someone other than the landlord who evicted them, so the anger a player hears about lands on the wrong party.

**Cause.** Needs cause. Measured: `node --import tsx tests/golden-path/runner.mjs` on the clean Train b22cd35098a85476d01e5be194994ec95a9e8f01 and on #9517 (place and seed from `drawPlace(commit, "M1-11")` in tests/golden-path/place.ts; seed fe5e99cc00adab224ffd81bf9c9cb46644f8c29f0f75555ef4eb5e9e451c0051) printed "grudge:grudge:person_8ae04906bdbc84e5 of person_58adb96d72735d54 aims at person_8ae04906bdbc84e5, the event names organization_7300129f134f265e". The drives engine's `responsibleId` names the organization; the drive that formed holds a person as its target. Which writer sets that target (the drives engine reading a different fact than `responsibleId`, or a grudge written from a later record about the same eviction) is not found yet; the trace is to follow that drive to its writer at that place and seed and compare the target it set with `responsibleId`. The earlier drives items on misaimed grudges are done.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule: the party an event names comes from `responsibleId`, never a copy. No dice. Ask why: the proof names the drive, the event and the writer by record id.

**Done when.** A second session sees, in the running game at Hagåtña, Guam on that seed, the evicted person's grudge aimed at their landlord in dev mode's drives trace. The golden-path M1-11 check passes at Hagåtña, Guam, on the seed above in a played world (buildBenchWorld through the runner), and a test pinned to that place and seed shows the grudge from the eviction aimed at organization_7300129f134f265e by record id.

**Waits on.** Nothing.

**Files.** src/bench/m1-11-check.ts, src/core2/modules/drives.ts, tests/golden-path/place.ts
