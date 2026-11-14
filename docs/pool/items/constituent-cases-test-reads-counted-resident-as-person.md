---
id: constituent-cases-test-reads-counted-resident-as-person
title: "The constituent-cases test crashes when an open case belongs to a counted resident, who is not a full person"
area: elections
kind: bug
priority: 2
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
source: Account lead thread "Make elections read your record", Nov 14 (red on the clean train 8bc765b3 and on #9191)
claimed-at:
---

**What.** `src/core2/constituent-cases.test.ts` ("residents bring problems from their records, and how they're handled changes their view") fails with `TypeError: Cannot read properties of undefined (reading 'birthDate')` at some drawn places. `GOLDEN_PATH_SEED=a1 npx vitest run src/core2/constituent-cases.test.ts` fails on the clean train head 8bc765b3 and on #9191's branch alike; seeds `b2` and `c3` pass on both. Seen: in the constituent cases a town's residents bring to officials, and how they are read at the ballot.

**Cause.** Found in code: the test lists every open case (`allCases(api).filter((c) => c.status === "open")`) and reads `core.people.get(c.personId)!` for each (line 78), but `bringCases` in src/core2/modules/constituent-cases.ts (the counted-out-of-work loop after the named people) keeps cases for counted residents by their record id, who are not in `core.people`, so `problemOf` gets `undefined`.

**Fix.** In the test, check a counted resident's case through the same facts the engine used (`residentFacts` in src/core2/modules/residents.ts) and a named resident's through `problemOf`, or restrict the loop to named residents and add a separate pinned check for counted ones. Name the place and seed pinned in the test file.

**Time box.** 1 hour for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Never loosen the assertion; the counted case still has to read as its problem. Pin the place and seed (`pinned-tests`).

**Done when.** A second session runs the test at seeds `a1`, `b2` and `c3` on main and all three pass, with the pinned place named.

**Waits on.** Nothing.

**Files.** src/core2/constituent-cases.test.ts
