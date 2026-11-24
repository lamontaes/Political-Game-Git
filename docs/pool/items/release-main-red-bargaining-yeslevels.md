---
id: release-main-red-bargaining-yeslevels
title: "Main is red: public bargaining imports yesLevels from where #6475 removed it"
lead: laws-effects
area: laws
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/main-red-bargaining-yeslevels
pr: #6511
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T03:15:34.029Z
---

**What.** Since #6475 merged at 02:51 UTC on Oct 28, src/core2/law-reach/group-a-bargaining.ts and src/core2/law-reach-bargaining.test.ts import yesLevels from group-a-records.ts, which no longer exports it. npm run typecheck fails on main (TS2305), and at run time the public bargaining handler throws 'yesLevels is not a function' at its first calendar day, so every played world that runs the law reach crashes. #5415 (public bargaining) merged before #6475, and #6475's branch never had the file.

**Rules.** Red main comes first (owner, Oct 15): fix at the root on its own PR. One source per fact: import the laws engine's own yesLevels, never restore the copy.

**Done when.** npm run typecheck passes on the fix, src/core2/law-reach-bargaining.test.ts passes in a drawn place with its seed named, and the played-world taxes test (law-wiring-taxes.test.ts) that crashed in a buildBenchWorld drawn place passes on a named seed.

**Files.** src/core2/law-reach/group-a-bargaining.ts, src/core2/law-reach-bargaining.test.ts

**Notes.** Fixed on main by 271af7fa54 (03:18 UTC Oct 28), the same two imports moved to modules/laws, pushed while I was building #6511; #6511 is closed as superseded, since merging it beside that commit would import yesLevels twice. Nothing is left to build; the CTO sets it done.

Oct 29 (CTO): done; PR #6511 closed unmerged because main already imports yesLevels from the laws module in the bargaining reader (src/core2/law-reach/group-a-bargaining.ts line 38).
