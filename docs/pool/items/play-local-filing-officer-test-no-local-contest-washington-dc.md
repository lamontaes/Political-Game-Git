---
id: play-local-filing-officer-test-no-local-contest-washington-dc
title: "The 'every local filing counter has someone at it' test finds no local contest in Washington, D.C. at one drawn seed and fails there"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
after:
blocked-on:
model: sonnet
effort: low
root: none
source: found by the #9153 carry thread, Nov 14
lead: wire-elections
---

**What.** `src/bench/local-filing-officer.test.ts` ("every local filing counter has someone at it, a county board of elections too") fails with `no local contest: expected 0 to be greater than 0` at Washington, District of Columbia (1150000) for run seed `bb83b91bbe339e955bb33a98b185a62cf4cc1e925ed060d19c4437b98b15e1d4` (place seed `9dc64f386725e980a43066f6dd85fb3c78ca922877d0dfdaf3b6374ecaa3de12`). The same failure happens on the clean train b7ed6337, so it is not from any change on top. The test draws its seed when `GOLDEN_PATH_SEED` is not set, so it is red only when a draw lands on a place with no local contest open in the window it looks at. Seen: the filing counters of a drawn place whose local races are not open.

**Cause.** Measured: Washington, District of Columbia (1150000), place seed 9dc64f386725e980a43066f6dd85fb3c78ca922877d0dfdaf3b6374ecaa3de12, on the train at 53e4b29fe8, the world as `buildBenchWorld` opens it: 11 contests, and none in a local family. The District's own offices are filed as a state's: Mayor, Attorney General, Chairman of the Council and the State Board of Education seat are `statewideExecutive` (`contest:seat:US-DC:mayor:2026-11-03` and the rest), and the Council's seats are `stateLegislative` (`contest:seat:US-DC:unicameral:At-Large:0:2026-11-03` and four more). The contest builder skipped nothing: filing for them opens January 17, 2026. The test keeps only `municipalOffice` and `countyOffice` (`LOCAL`, src/bench/local-filing-officer.test.ts, line 33), the same two families `isLocalFamily` names (src/core2/modules/elections.ts), so in the District its list is empty.

**Fix.** The District's own offices are its local races, read from the place's record and never from its name.

1. In the test, where the drawn place's state record is a federal district (`jurisdictionKind`, the rule `questionForLevel` already reads in src/core2/modules/world-legislating.ts), the counters checked are those of the District's own contests. Every other place keeps the two local families. The test then finds a clerk at the District's board of elections, or fails there for a real reason.
2. Read, and write down in the pull request, what else reads `isLocalFamily` (three calls: local turnout in voting.ts, the measures in gov-measures.ts and elections.ts) and whether the District's mayor race is counted with a state race's turnout. If it is, that is a second item for the elections lead: it is a design call whether a race for mayor of the District turns out like a city's.

**Time box.** 1 hour to find the cause.

**Rules.** No dice. One rule, all 56 places: the test finds a place with a local race by drawing and waiting, and names what it passed over (skill `drawn-place-tests`), never a loosened assertion.

**Done when.** A second session runs the test at that seed on main and it passes or the test names the places it passed over; names the place and seed.

**Waits on.** Nothing.

**Files.** src/bench/local-filing-officer.test.ts

**Notes.** Reproduce: `GOLDEN_PATH_SEED=bb83b91bbe339e955bb33a98b185a62cf4cc1e925ed060d19c4437b98b15e1d4 npx vitest run --dir . src/bench/local-filing-officer.test.ts`.

The test draws its seed at run time (`GOLDEN_PATH_SEED` or a random one), so once the cause is found it needs pinning to named places and fixed seeds with an explicit timeout (skill `pinned-tests`), Washington, D.C. at the seed above among them. No assertion is loosened. Cause found by Fable B, Nov 15, 2026, with a probe that lists the contests a District world opens with.
