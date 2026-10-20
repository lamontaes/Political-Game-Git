---
id: people-births-reads-family-partnered
title: "The births engine takes up a couple formed in play: it reads the family.partnered event"
area: people
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr: #5395
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Core now has api.setPartnersV1, which adds or ends a partner link between two people and emits family.partnered or family.separated. The births engine (src/core2/modules/renewal.ts) builds its couples only once, at the opening, so a couple formed in play is never reviewed for a child. Make the engine read the event: build the couple from the link and review it from that day. The finished change is on branch claude/births-reads-partnered (coupleFromLink, shared with the opening, and an onEvent for family.partnered); land it through People.

**Rules.** An effect is a read, not a record: the event is written by the core call and read by the births engine when it decides a pregnancy. One model, two tiers: the same couple rule for full and counted people. No dice: a birth follows the couple's reviewed reasons, never a percentage.

**Done when.** In a played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body), two single adults made partners with setPartnersV1 after sharing a household have an active row in the births engine's couples table by link id the next day, with the mother and the other parent named by person id, and src/core2/family-link-change.test.ts asserts it.

**Files.** src/core2/modules/renewal.ts, src/core2/family-link-change.test.ts

**Notes.** TODO
