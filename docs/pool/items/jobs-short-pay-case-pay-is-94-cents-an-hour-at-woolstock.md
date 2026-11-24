---
id: jobs-short-pay-case-pay-is-94-cents-an-hour-at-woolstock
title: "A short-pay case at Woolstock, Iowa reads a pay of 94 cents an hour"
area: world
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: found while playing whole office-hours talks for #9199
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** In the office-hours talk at Woolstock, Iowa (seed case-help-pinned-1:help:37, place key 1987015) the resident with a short-pay case says "$0.94, every check" against a minimum wage the town's law sets far above it. Other places played the same week read $4.58 (Stephens, Arkansas) and $6.63 (Ontario, Oregon). The Words lead's ruling: if the pay record really holds 94 cents an hour, that is a fault in the pay record, not in the words. Seen: the short-pay resident's answer in an office-hours talk.

**Cause.** Needs cause. Where the case's `commitment.hourlyMinor` comes from (`src/core2/modules/constituent-cases.ts`, the wage case) and what job row sets it has not been read; whether 94 cents is the real hourly pay of a part-time or tipped job (and the case should compare against the tipped minimum) or a payroll fault is unknown.

**Fix.** None until the cause is found.

**Time box.** 1 hour to find the cause.

**Rules.** No dice. One rule, all 56 places.

**Done when.** A second session plays office hours as a drawn official at Woolstock, Iowa (seed case-help-pinned-1:help:37) and at two other drawn places, asks the short-pay resident what they are paid an hour, and sees a pay that matches the job the resident holds (its hourly pay on the job row), with the cause written in this item.

**Waits on.** Nothing.

**Files.** src/core2/modules/constituent-cases.ts
