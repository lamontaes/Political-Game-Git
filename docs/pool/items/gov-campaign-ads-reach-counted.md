---
id: gov-campaign-ads-reach-counted
title: "Campaign ads reach an outlet's counted followers by group, times count"
area: gov
kind: wiring
priority: 2
size: S
status: in-pr
claimed-by: claude/ads-reach-counted
pr: #5136
after:
blocked-on:
source: "audit Oct 19, Part A on #4615 (two tiers 0)"
claimed-at: 2026-10-19T20:10:05.448Z
---

**What.** #4615 buys ad time from the town's outlet with real money and the stand-in is gone, but the ad reaches full people only: `src/core2/modules/campaigns.ts` walks the outlet's full-person followers and never the counted groups. The counted population is most of the town, so a campaign's reach is a fraction of real and the ad's effect on the tally is nearly nothing. An ad reaches a counted group by the same rule as a full person, times the group's count and the outlet's reach in that group, and the tally moves by the same read.

**Rules.** One model, two tiers: an ad reaches a counted group by the same rule as a full person, times its count and the outlet's reach in that group, in one function for both tiers. An effect is a read: the vote tally moves because voting reads the ad's reach record, not because the ad writes a number into the tally.

**Done when.** A played campaign in a drawn place (`buildBenchWorld`) shows an ad's reach including counted groups by record id, the vote tally moved by it with its why (which groups, which outlet, what count), and `src/core2/campaign-ads.test.ts` and the campaigns tests pass with a counted-group case in a drawn place. The owner plays it: buying an ad in a town of ten thousand moves more than a dozen people.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-ads.test.ts, src/core2/counted-groups.ts

**Notes.** Supersedes the audit's working id elections-ads-reach-counted-followers. The payroll-tax change that ran one function over both tiers is the pattern to copy.

Oct 19 (claude/ads-reach-counted): built. `countedFollowers(api, outletId)` in press.ts gives the counted adults in town who follow an outlet by the same rule as the full people (Pew share by age band) times each household's weight, with the outlet's slice of its kind from the full people's split. `adAudience` in campaigns.ts now spreads the contacts a buy pays for over full and counted followers in one proportion; the counted share lands in `countedReached` (which voting.ts already reads for recognition) and each buy is kept as an `adReaches` record (id, outlet, full, counted). Left: a played campaign with a larger budget to show the tally move over a full election cycle, and the cause-group ad (`buyAdTime`) still reaches full people only.
