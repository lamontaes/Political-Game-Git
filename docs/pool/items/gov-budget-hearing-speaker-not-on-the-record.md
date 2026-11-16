---
id: gov-budget-hearing-speaker-not-on-the-record
title: "A speaker at a council's budget hearing is a person the world does not hold"
area: gov
lead: laws
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 16 (found building laws-local-budget-amendments-need-a-recorded-cause)"
checked:
---

**What.** A person named as a speaker at a council's budget hearing is not on the world's people record, so the hearing cites someone nobody can open. Seen: the hearing's speaker list on the council's budget bill.

**Cause.** Measured: at Monterey, Virginia (5152680), seed 52fab741aae35e55d280b66cd9a3ce83a67e9c1f0f36e7f827bd3d6e2f2e6664, by `npx vitest run src/core2/office-day-budget-season.test.ts`, the first case fails at its speaker check (person_3dc0c581cc42791a is not in api.state.people); the same case failed at Wilmington, Delaware (1077580), seed 450c75a9cbc945df46a4524f0a27b8157caa521bfaacba6793dc051869576256 (speaker person_58badcd2ecf557c1). Where the hearing takes its speaker ids from, and why a counted or removed person is on it, is not yet found.

**Fix.** Find where the budget hearing builds speakerIds (budgetHearingOf in src/core2/modules/legislature.ts) and make it take only people the world holds, filling a counted resident in through the two-level rule when the hearing names one.

**Time box.** 3 hours for one Opus session.

**Rules.** Standing rule one-model-two-tiers: a counted resident named at a hearing is filled in as a full person from the world, never invented. Standing rule wire-to-the-world: the fix is proven in a generated world at the two places above.

**Done when.** At Monterey VA and Wilmington DE (the seeds above) every speaker at the hearing is a person in the world, and a second session replays the first case of src/core2/office-day-budget-season.test.ts at a drawn place on main.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/office-day-budget-season.test.ts

**Notes.** Filed Nov 16 on the branch of PR 9652.
