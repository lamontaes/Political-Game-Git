---
id: industry-6-employers-pay-their-share-of-health-premiums
title: "Employers pay their share of workers' health premiums, on their books"
area: core
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: industry-5-groundwater-law-charges-mines-and-utilities
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "owner, Nov 15 21:09Z (industries, coal and farms, a town at one plant that closes, people leaving; most of it probably built); Account lead's rulings 21:15Z; survey by T54 at /mnt/project-files/account-lead/t54-industry-gaps.md"
---

**What.** An employer plan costs its employer nothing. Owner, Nov 15 21:09Z: laws should affect workers' "pay and insurance". Today only the worker's share is paid, to the outside account, so a law on health costs never lands on a business, and the town's insurance agency receives no premium (survey: /mnt/project-files/account-lead/t54-industry-gaps.md, gap 7). Seen: a business's books in dev mode show wages and no health plan cost.

**Cause.** Found in code: src/core2/modules/coverage.ts (header comment, lines 1 to 40): "The employer's share of the premium is part of the employer's compensation and is not modeled." OWNER-DECISIONS (Train 29ef4685) has no ruling on health insurance; line 916 lists the employer's business taxes as money flows read from the law in force.

**Fix.** Each month the employer of a policyholder pays the employer's share of the premium (KFF 2024, the same source as the worker's share) from its own cash, by the same coverage pass; its books' operating costs read it, so losses and layoffs follow. Premiums go to an insurer in town where one sells plans, else the outside account.

**Time box.** 4 hours, Opus, medium.

**Rules.** One model, two tiers: a counted policyholder's employer pays the same share times its count. Wire to the world: the dollar is followed from the employer to the insurer. Every number lives in a parameter table with its source.

**Done when.** At three named places with seeds, one employer's monthly premium share is followed by record id to its books and the insurer; year 1 and time per record at three places with and without, twice a side, alternated. A second session sees in dev mode at a drawn place it names with its seed the employer's health plan cost on its books.

**Waits on.** industry-5 in the order.

**Files.** src/core2/modules/coverage.ts, src/core2/modules/business.ts.
