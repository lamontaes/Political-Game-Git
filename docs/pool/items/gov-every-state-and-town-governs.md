---
id: gov-every-state-and-town-governs
title: "Every state legislature and every other town's council sits and passes laws, at a coarser level"
area: gov
lead: laws
kind: bug
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on:
source: owner, Oct 29 voice note on the governing brief
---

**What.** The owner ruled Sept 26 that all 50 legislatures are seated from day one (DECISION-REGISTER 276-284), and on Oct 29 he said: "Other states and towns never sit. No, all 50 states need to. Oh my God. Why? How?" Today `world-legislating.ts` opens only the town's own state and Congress (openWorldLegislating, lines 182-192), so 48 legislatures, D.C.'s council, the territories' legislatures and every other town's council never sit and never pass a law. Other places run at a coarser level (AGENTS.md, Oct 10), so they sit on their real calendars and pass laws through the same draftBill and holdVote with members as officials, without full people beneath them.

**Rules.** One rule, all 56 places: every state, D.C. and each territory sits from its own data rows, never a named list in logic. Speed: a town's game year stays under two minutes, so other places' sittings act only on their session days and never scan the world daily. One engine per mechanic: the same legislature engine, no second background writer.

**Done when.** In a buildBenchWorld played year from a drawn place, a test names the place and seed and shows at least 40 state legislatures and three other towns' councils holding sittings and enacting laws, by law record id, through the one engine, and `npm run speed:year` stays within 20 percent of its base.

**Files.** src/core2/modules/world-legislating.ts, src/core2/data/offices/bodies.json, src/core2/data/legislature/

**Notes.** Filed by the CTO, Oct 29, from the owner's voice note on the governing brief (OWNER-DECISIONS, Oct 29 21:40 UTC). Read: OWNER-DECISIONS, DECISION-REGISTER, the governing brief's four research notes; searched the pool for twins.
