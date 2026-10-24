---
id: elections-stand-again-dead-with-candidacy
title: "An incumbent's decision to stand again never runs while the candidacy module is installed"
area: elections
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/traits-stand-again
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T14:16:41.146Z
---

**What.** fileStandingCandidates returns at src/core2/modules/voting.ts:1132, before the standsAgain call at :1196, whenever the candidacy module is installed, and every played world installs it. So the voting.stand-again decision (age and a small trait lean, calibrated to van de Wardt et al.) never runs in play: in Parkway, Missouri's election window it had 0 calls while the race ran. Either candidacy asks the incumbent the same standsAgain question before filing them, or the voting path's early return gives way to it.

**Rules.** No dice: an incumbent stands again or retires for their age, record and temperament, never a roll. Wire to the world: the decision must run in a played election window, not only in a unit test that calls it directly.

**Done when.** scripts/traits/trait-wiring-audit.ts with TRAIT_AUDIT_ELECTION=1 on one year of buildBenchWorld in a drawn place whose window holds a race, seed named, shows voting.stand-again with calls above zero and an incumbent's record id, and src/core2/modules/campaigns.traits.test.ts still passes.

**Files.** src/core2/modules/voting.ts, src/core2/modules/candidacy.ts

**Notes.** Found Oct 24 by the traits lead's never-run audit (branch claude/traits-decisions-never-run, Parkway, Missouri, seed e6ff0d60d6bc).
