---
id: campaign-donor-month-spends-its-spare-money-once
title: "A donor's gifts in a month are held to that month's spare money across every campaign"
area: elections
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: "the gift-crowding cause-finder, Nov 14, 2026, on the Account lead's order"
model: sonnet
effort: medium
root: none
checked: sonnet 2026-11-14
---

**What.** Each campaign sees a donor's whole month of spare money, so one person gives to many candidates in the same month with nothing taken off for what they already gave. At Williamstown, Kentucky (seed survey-b), 122 of 309 donor-months gave more than that month's discretionary money, an average of $1,271 given against $1,730 spare, and 172 donors made 1,333 gifts (7.7 each; one gave to 28 filings). Seen: the Campaign tab's money rows and the paper's gift stories show far fewer and smaller gifts from the same town.

**Cause.** Found in code: `giftBudget` in src/core2/modules/campaigns.ts builds `discretionaryMinor` from income less withholding and living costs each time it is read, and `donationAnswer` (same file) computes the gift from it without subtracting what the donor gave this month to other campaigns; only savings shrink, as the money leaves `liquidMinor`.

**Fix.** Read the donor's gifts this month from the `gifts` table (by donor, `lastDate` in the month) and subtract them from `discretionaryMinor` in `donationAnswer`, so a month's spare money is spent once. Keep it a sliding amount, never a threshold.

**Time box.** 4 hours for one Sonnet session.

**Rules.** No dice. Every number in a parameter table. It changes the unattended world: give year 1 and time per record at three drawn places, with and without, in the PR body, and pin the test to named places and seeds.

**Done when.** A second session, not the builder, runs a drawn place for a year (named, with its seed) and finds no donor-month whose gifts exceed that month's spare money by the same reads, with the gift count per donor lower than on main.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts
