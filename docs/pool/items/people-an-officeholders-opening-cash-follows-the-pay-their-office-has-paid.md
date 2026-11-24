---
id: people-an-officeholders-opening-cash-follows-the-pay-their-office-has-paid
title: "A sitting member of Congress opens with about four days of household cash, so they cannot pay a filing fee"
area: people
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Account lead measurement, Nov 15, 2026 (House item)
---

**What.** The people who hold a paid office when a world opens begin with the cash of an ordinary household. At Mountain Home, North Carolina the House member held $3,479 on 2025-01-22 and about $1,291 on the filing day, against the $1,740 filing fee, with a $174,000 salary. A Mississippi member held $1.43 million and a Wyoming member $410,000 in the same measurement, so the same opening spans hundreds of times. Seen: a member who cannot file for their own seat, and an officeholder's Personal card that shows a few days of cash.

**Cause.** Measured: Mountain Home, North Carolina (seed from `drawPlace("fields-measure2", "b")`), Train head 693479ab: `liquidMinor` 347,906 on 2025-01-22 for `official:term:seat:US-NC:us-house:11:2025-01-20`, living cost 31,226 a day, cash 129,100 on the filing day. Found in code: `fillInPerson` in `src/core2/candidate-identity.ts` makes an official a full person with the opening capital estimate used for any household; nothing reads what their office has paid them.

**Fix.** An officeholder's opening cash follows the pay their office has paid them: the years they have served at their salary, less what a household in their place spends, through the opening-capital rule the households' opening uses. The renters thread (`Let simulated renters buy homes`) is fixing opening cash and opening pay for households now, so this item must use that rule and add no second one: first read their branch, then use the same function with the officeholder's pay history as its income. Seen: on the member's Personal card and on the House filing day.

**Time box.** 4 hours for one Opus session, after the renters thread's opening-cash change folds.

**Rules.** No dice: the figure follows the person's pay and spending. Estimate, never UNKNOWN: a value the player can see starts from the real average with a per-world spread, marked as an estimate with its source.

**Done when.** A second session plays Mountain Home, North Carolina (a drawn place with a House member) to the 2025 filing day on main and sees the member holding more than the filing fee, and 12 drawn places show sitting members' cash tracks their pay history rather than a household's.

**Waits on.** The renters thread's opening-cash change (`Let simulated renters buy homes`).

**Files.** src/core2/candidate-identity.ts, src/core2/opening-capital.ts
