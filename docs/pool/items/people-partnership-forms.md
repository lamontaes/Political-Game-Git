---
id: people-partnership-forms
title: "Two single adults who are close, fit in age and can afford it become one household, as a decision from their traits and money"
area: people
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/partnership-forms
pr: #4963
blocked-on:
after: core-household-membership-change,core-family-link-change
source: added with npm run pool -- add
claimed-at: 2026-10-17T18:45:53.268Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Found Oct 17 (claude, before building).** Two more core pieces are needed first, so this item is gated on a new core item, `core-family-link-change`: (1) nothing writes a partner link in play (`familyLinks` is written only at the opening and for newborns, state.ts), so a core call must add and end a `partner` link and keep both people's `familyIds` and past facts; (2) the renewal engine builds its `couples` table once at open (renewal.ts, about line 270), so a couple formed in play would never have a child. Read the partner links when the births engine reviews a couple, or have the call update `couples`. Household change itself is built (core-household-membership-change, `api.changeHouseholdV1`).
