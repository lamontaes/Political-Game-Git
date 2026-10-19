---
id: people-partnerships-full-people-form
title: "Full people form partnerships from age, closeness, traits, money and housing, and the law in force"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: core-family-link-change,core-household-membership-change
source: added with npm run pool -- add
---

**What.** Full people form partnerships from age, closeness, traits, money and housing, and the law in force. Two people who spend time together and are close, whose traits fit and who can afford a home may move in together or marry, where the law allows it. Today partnerships exist only at the opening and no new one forms in play. The player would see it as a neighbor or a friend finding a partner.

**Rules.** No dice: a partnership forms from the people's closeness, traits, money, housing and the law, never a roll; An effect is a read, not a record: the housing and finance engines read the new household and pay for one home; The chain is the acceptance: follow one pair from first closeness to the move-in or marriage, the law read, the household record and the director's line; One rule, all 56 places: marriage law is state data; No hand-written player text: words come from the English engine.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, named in the PR body, two full people form a partnership, a household record joins them with one home, and a test in src/core2 shows the law read and the household by record id.

**Files.** src/core2/modules/renewal.ts, src/core2/closeness.ts, src/core2/data/renewal/parameters.json

**Notes.** Body written Oct 19 (claude) from the title and the repo layout; the claimant should sharpen it.
