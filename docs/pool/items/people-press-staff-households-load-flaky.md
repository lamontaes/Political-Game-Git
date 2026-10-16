---
id: people-press-staff-households-load-flaky
title: "press-staff-households.test.ts fails in a parallel run and passes alone on the same seed (Johnstown, Nebraska)"
area: people
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: found in #4741, Oct 16
---

**What.** `src/core2/press-staff-households.test.ts` failed once in a parallel run in Johnstown, Nebraska (seed `76c74908aeca91173c8768fba1194202f4907e622503dd0039a6aba8afd02940`): a reporter's household id still starts `household:person:press:` where the test expects a real household. Run alone on the same seed it passes. Find what differs under load (a shared cache, a module-level registry, or test order) and fix it at the root.

**Rules.** No dice: an interview is invited or declined for reasons in the records (the speaker, the outlet, the race), never a roll. One rule for all 56 places.

**Done when.** The test passes alone and in a parallel run of the core2 press tests on the same seed in Johnstown, Nebraska, and the PR body names the shared state that differed.

**Files.** src/core2/press-staff-households.test.ts, src/core2/modules/press.ts

**Notes.** Seen while running the press, campaigns and cause tests together for #4741.
