---
id: people-stopgap-drives-counted-giving
title: "Stopgaps in drives (counted-giving): 1 open"
area: people
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/drives.ts, kind counted-giving"
claimed-at:
---

**What.** Replace SG-CORE-counted-giving-stand-in in `raiseFromCounted` (src/core2/modules/drives.ts). Today a cause group's monthly counted gift is the mean of its full members' gifts times a head count (`row.adults * members/adults * countedGivingShare`), because a counted giver was thought to have no cash or concern of their own. Counted households now hold income and accounts (`fundOf`, `fundBalance` and the packed `living` column in src/core2/counted-money.ts and counted-groups.ts). Replace the stand-in with the full person's own gift rule, `giftOf` (cash above the buffer of `moneyBufferDays` of living cost, times `donationShareOfSpare`, times concern strength), applied to each counted group's own cash and living cost, times the group's count of adults who hold the group's concern by topic. The concern is the strength the drive-forming rule gives the group's members from their packed traits, not a mean of full members. Pay it from the group's fund through `payDonation`, so each dollar lands on the journal.

**Rules.** One model, two tiers: the counted group's gift is the full person's gift rule applied to the group's own income and cash records, times the count, never the mean of full members' gifts. No dice: no seeded roll or fixed share decides who gives; the group's cash, living cost and concern decide, and `countedGivingShare` stays only as a check on totals (an ESTIMATED real rate). Sliding scales and causes: nothing flips at a line; a group with nothing to spare gives nothing. An effect is a read: the cause group's balance, read by `spendGroupFunds` and the campaigns ad purchase, must move. Replace, never layer: delete the stand-in's mean-gift code, the `api.stopgap` marker and the stopgap row in the same change. Wire to the world: money leaves counted households' funds, so every dollar balances.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, a cause group's account is raised by counted households (journal entries sourced `counted:<placeId>`), each paid from named group funds that fall by the same amount, and a poorer group gives less than a richer one holding the same concern; the group's ad spend then reads that balance, with SG-CORE-counted-giving-stand-in removed from stopgaps.json; proven in src/core2/drives-economy.test.ts naming place, seed and group id.

**Files.** src/core2/modules/drives.ts, src/core2/data/stopgaps.json, src/core2/counted-money.ts, src/core2/data/parameters.json, src/core2/drives-economy.test.ts

**Notes.** CTO, Oct 14: groups raise from the counted population as well as from full people, by the same rule times the count. Acting CTO ruling (Oct 20): under "One model, two tiers" the counted gift is the full person's gift rule on the counted group's own income and cash, times the count, not the mean of full members' gifts. First row's old text: counted adults who give to a cause group give the mean of what the group's full members' own gift rule gives, once a month.
Oct 20 (pool feeder): spec written; counted households already hold funds and living cost, but no per-topic concern for a counted group exists yet, so the builder derives it from the packed traits through the same drive-forming rule (counted-person views are being retired in other items, core-counted-views-delete).
