---
id: people-partnership-forms
title: "Two single adults who are close, fit in age and can afford it become one household, as a decision from their traits and money"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr: #4963
blocked-on:
after: core-household-membership-change
source: added with npm run pool -- add
claimed-at:
---

**What.** Two single adults who are close, fit in age and can afford a home together become one household, as a decision read from each person's traits, closeness and money. The core calls exist but nothing uses them in play: setPartnersV1 with together true (src/core2/state.ts, around line 1764) links two living single adults and emits family.partnered, and changeHouseholdV1 moves one into the other's household with the lease following (done item core-household-membership-change). After the opening sets partnerships once (src/core2/opening-partnership.ts), households change only by births, deaths and moves, and the director's married and started-dating scenes (src/director/data/situation-types.json, marked awaitingProducer) have no record to wait on. The owner's Oct 19 pairing ruling (docs/coordination/OWNER-DECISIONS.md, Pairing) says people can move in together, who pairs with whom reads each person's own record including orientation, two homeowners can pair and combine households like anyone else, and the home they leave returns to the market; the woman-and-man-only and never-two-homeowners rules in PR #4963 are defects to replace.

**Rules.** No dice: a pair forms from the people's ages, closeness, traits, money and housing, never from a fixed percentage, and real marriage rates (CDC and ACS) check totals only. Wire to the world: a new household moves a dwelling, lease and cash by journal record, through changeHouseholdV1. One model, two tiers: counted pairs follow the same weighing times their count, which is the open item people-partnership-counted.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) a named couple is traced from their closeness record to the partner link id, the household they now share, the lease id that followed and the journal record that moved their cash, with the pair not assumed to be a woman and a man and two homeowners able to pair, shown by a test in src/core2 that names the place and seed. **On screen.** Nothing yet: it would show on a person's card in the People web, and nothing there reads it.

**Files.** src/core2/modules/people.ts, src/core2/state.ts, src/core2/modules/housing.ts, src/core2/closeness.ts

**Notes.** TODO

Sent back 2026-10-17 from PR #4963 (branch claude/partnership-forms): Morning check: the partnership-forming stack includes the same non-Words edit to protected src/director/play-modules.ts as #4959. Land that installation through a Words-owned PR and merge the Core household/family-link prerequisites first, then merge main here so the remaining People diff can be checked. Record World-area agreement for the housing-engine helpers, or split them to World.; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #4963 (branch claude/partnership-forms): The item still has TODO acceptance and the body lacks its Done-when evidence table; document ordinary-world installation and the combined home-leaving scope; finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: rewrite SMART, apply OD:588.
