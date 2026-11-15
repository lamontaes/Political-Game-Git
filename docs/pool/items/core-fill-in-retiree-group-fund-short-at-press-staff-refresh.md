---
id: core-fill-in-retiree-group-fund-short-at-press-staff-refresh
title: "A retired household filled in by the press staff refresh finds its group's fund short and throws, stopping a played year"
area: core
kind: bug
priority: 1
size: S
status: merged
claimed-by:
pr: #9428
blocked-on:
lead: laws-effects
source: Account lead thread, CI golden-path-year M0-13 on PR #9364, Nov 15
after:
standard: 2
model: opus
effort: medium
root: design-life-record
checked: fable 2026-11-15
---

**What.** A played year at East Setauket, New York stops with an error when the press week fills in a household from the counted population and the fund that holds that household's group's money has less than the household's share. It was found by the golden path's year run in CI, not by a player. Seen: the player's year stops in a played world with a thrown error.

**Cause.** Measured: East Setauket, New York (key 3622964), seed 0ecaac254b3bf4a290cd7169a7bb9e4e34066b3bdb0cbeed2df7b00e34135bed, the played-world test at the train head 2190669e with a log line where a fill-in fixes its cash and where it pays it. On April 14, 2025 the press week filled in household_b6bc489444597599, the only record of its group (retired, 65 and over, with children). The record had four members and a weight of 0.00146, so it stood for 0.0058 people. `householdCashReader` (src/core2/modules/residents.ts) then shared the group's fund by the record's member count over the group's weighted people: 140,280 cents times 4 over 0.0058 is 95,946,954 cents, asked of a fund that held 140,280. The fund was never short; the share was wrong. The same reader was corrected on Nov 15 by pull request #9428 ("A fill-in takes only the record's own share of its group's fund", commit 16161897ec, folded into the train at 156d19d4fb): a record that stands for less than one household takes only the part its own people hold.

**Fix.** Built by pull request #9428: `householdCashReader` (src/core2/modules/residents.ts) shares the fund by the smaller of the record's member count and the people it stands for, so a fill-in never asks for more than its group holds. The player no longer loses a year to the stopped game at this place.

**Time box.** 3 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: the counted group and the filled-in household read the same money. Wire to the world: proven in the played world at the place and seed above, then at one more drawn place named with its seed. No new stopgap.

**Done when.** A second session runs the played-world test at East Setauket (seed above) and one more drawn place and the year completes with no insufficient-funds error, and the retired group's fund after every fill-in equals what the group held at opening less what its filled-in households took, named by account id.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts, src/core2/modules/press.ts, src/core2/state.ts

**Notes.** Red on the train head without PR #9364 (checked at 2190669e, same place and seed), so not caused by it. Found in CI's golden-path-year run, which is outside the PR gate. Checked by Fable B, Nov 15, 2026: the same test, place and seed on the train at 32a994212b passes 21 of 21 with 2 skipped; 45 households were filled in over the year and none asked for more than its group held. Fixed by #9428; nothing further to build.
