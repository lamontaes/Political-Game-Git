---
id: people-press-bureau-shortfall-top-up-removed
title: "An outlet whose town pays less than its people cost cuts staff or closes by its own books, with no outside audience paying the rest (the owner's Oct 25 ruling built)"
area: people
kind: stopgap
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
standard: 2
lead: governing
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: stand-in triage, Nov 10, 2026 (SG-PEOPLE-press-bureau-shortfall)
claimed-at:
---

**What.** Each press week the town's outside customers pay an outlet whatever its local people cost beyond what the town's readers and advertisers paid last month. The acting CTO ruled on Oct 25 (OWNER-DECISIONS.md, "Press outlet shortfall") that an outlet short of money cuts staff, pages or closes by its own books, and that this top-up is removed. It was never removed. Seen: in the paper, which cuts staff or closes when the town cannot pay for it.

**Cause.** Found in code: src/core2/press-money.ts line 370 (function payWiderAudience, marker SG-PEOPLE-press-bureau-shortfall) still transfers the shortfall, and src/core2/modules/press.ts line 3534 (pressWeek) still calls it every press week.

**Fix.** Delete payWiderAudience and its call in pressWeek, the shortfallMinor field it bumps, and the stopgap marker; resolve the row in src/core2/data/stopgaps/people.json. Keep the outlet's revenue as town subscriptions and ads plus its standing audience revenue already on its books (audienceRevenueMinor). An outlet whose income falls under its people's pay then lets staff go or closes through the press engine's existing rule (the monthly outlet review), never a roll. It stays cheap: the review is monthly and the removed transfer was weekly, so the change only removes work.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice; sliding scales (an outlet cuts a part of its staff as the gap widens, not at a threshold); replace never layer; speed bar. Do not let the cut re-open the closed-in-the-first-weeks defects (world-press-outlets-close-first-weeks, world-press-outlet-revenue-wage-gap): check the same places.

**Done when.** A second session, in a played year of buildBenchWorld in a drawn place (seed named), finds no press.wider-audience transfer on the cash journal, an outlet whose town payers fell short by record id either cut staff or closed with the reason on its record, and at least one outlet in a place with a local paper still printing at year end; SG-PEOPLE-press-bureau-shortfall is resolved in people.json.

**Waits on.** Nothing.

**Files.** src/core2/press-money.ts, src/core2/modules/press.ts, src/core2/data/stopgaps/people.json

**Notes.**
