---
id: counted-savings-banked-by-group
title: "A counted household's bank savings are its share of its group's, the same share as its cash"
area: world
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: T54
pr:
after:
blocked-on:
root: none
lead: money
model: opus
effort: medium
source: "T54's opening-savings trace at Staples CT, Nov 15 23:40Z; Account lead's ruling 23:41Z (the sweep sharing a group's cash by people is a second fault, its own PR first; one reader for the share, used by the sweep, housing's counted buyers and every other reader)"
---

**What.** A counted household's cash is its share of its group's pooled account, spread by its savings weight, but the bank's review banked each household's part of that cash by its people alone. At Staples CT (`drawPlace("probe-a", "exit-a")`, 1,500 people) the households' cash plus bank savings, against the survey median for each, read 1.62 at the median once groups opened at their survey mean, where the savings weights should land the median household on its median. A household's own deposits and its wallet share also disagreed, because deposits from one pooled account were booked as each household's. Seen: in dev mode, a counted household's cash and savings beside its group's money.

**Cause.** Found in code: `reviewBankDeposits` (src/core2/credit-deposits.ts) took each counted household's cash as `group.cash × members × weight / group.people`, by people, while `householdCash` (src/core2/modules/residents.ts) shares the same account by savings claim. It then banked each household's part under the household's own id, so the group's pooled cash went down for everyone while one household's deposits went up.

**Fix.** A counted group's savings are banked as the group's, under its own account (`fundOf`), and one reader, `countedDeposits` (src/core2/counted-money.ts), gives a household its share of them by the same claim as its cash. The sweep keeps a group's wallet at its households' cushions; housing's counted buyers, fill-in, a regrouped household and a counted founder read and draw through that share. The per-household hand-back at fill-in and keep-one is deleted.

**Time box.** 3 hours, Opus, medium.

**Rules.** One model, two tiers: a counted household's cash and savings are one share of its group's money. No dice. No new parameter.

**Done when.** A pinned test at Staples CT (`drawPlace("probe-a", "exit-a")`, 1,500 people) shows on day 1 and a month on that nothing is banked under a counted household's id and every counted household's cash and savings are its share of its group's cash and savings to two cents, red on the base. Year 1 and records at three places, with and without, twice a side, alternated. A second session sees in dev mode, at a drawn place it names with its seed, a counted household's cash and savings as one share of its group's money.

**Waits on.** Nothing.

**Files.** src/core2/credit-deposits.ts, src/core2/counted-money.ts, src/core2/modules/residents.ts, src/core2/housing-counted-buy.ts, src/core2/modules/business.ts, src/core2/counted-group-savings.test.ts (new), src/core2/housing-counted-buy.test.ts.
