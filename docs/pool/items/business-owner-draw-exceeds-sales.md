---
id: business-owner-draw-exceeds-sales
title: "An owner's draws over three years exceeded everything the business sold"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Cochituate, Massachusetts (key 2514570, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc) organization_2e7b1494489acb56 paid its owner 198,017,107 cents over three years on 179,939,980 cents of sales received; roadmap M1-08's check fails on it. Suspected cause, not confirmed: business.ts (around 1275) takes profit from the net cash change, which counts loans and owner equity coming in, so retained profit and the draw can include borrowed money.

**Rules.** Wire to the world: an owner's draw is paid from profit the business's own sales earned, read from its journal entries, never from a loan or the owner's own money coming back.

**Done when.** The cause is named by line in the PR body; m1-08-check.ts in Cochituate, Massachusetts (seed above) passes its owner-draw clauses; a test borrowing money into a business with no sales shows no draw follows.

**Files.** src/core2/modules/business.ts

**Notes.** TODO
