---
id: gov-press-outlet-advertising
title: "A local business buys an ad from an outlet out of its own cash when its books and goals say to"
area: gov
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from gov-press-outlet-revenue (the advertising and named-reader half), Oct 19
claimed-at:
---

**What.** An outlet's revenue is now re-sized monthly to its audience, but it is still one standing payment from the town's outside customers. Add the part that makes it earn from named payers: a local business buys advertising from an outlet out of its own books when its sales, cash and goals call for it, and a reader household's own reading spending goes to the outlet instead of the outside account. Each payment is a transfer from a named payer's account to the outlet, and the standing outside payment shrinks by exactly what the named payers now pay, in the same change.

**Rules.** No dice: a business advertises from its cash, its sales and its owner's traits, never a fixed percentage. An effect is a read, not a record: the outlet's revenue reads the audience and the advertisers at payment time. One model, two tiers: counted households and businesses pay by the same rule as full ones times their count. Replace, never layer: the part of the standing payment that named payers now cover is deleted. Estimate, never UNKNOWN: an ad price with no source starts from the real average marked ESTIMATED with spread.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose (name both in the PR body), an outlet's revenue includes a named local business's ad payment and a named household's subscription, shown by transfer id, the standing outside payment is smaller by their sum, every dollar still balances, and the stopgap SG-PEOPLE-press-outlet-revenue closes. Tests in src/core2/press-money.test.ts. The owner plays it: he sees a local paper run an ad from a shop he knows.

**Files.** src/core2/modules/press.ts, src/core2/press-money.ts, src/core2/modules/business.ts, src/core2/data/press/parameters.json, src/core2/data/stopgaps.json

**Notes.** Second half of gov-press-outlet-revenue. The first half (revenue follows the audience monthly) is in the pull request that carries this file. Local advertising needs businesses that choose to advertise, which the business engine does not model yet; read the business engine's books and cost review first.
