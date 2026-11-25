---
id: ui-person-card-view-unknown-pronoun
title: "A person's card says where he, she or they stand, matching the card's own pronouns"
area: play
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by: claude/person-card-pronoun-unknown
pr: #9637
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: none
source: Words lead, Nov 15 (the card's Politics line says "they" on a card whose headings say "he" or "she")
claimed-at:
checked: words builder A 2026-11-16
merged-at: 2026-11-16T19:58:33.567Z
---

**What.** On the person card, a person whose political view the player has not learned shows "You don't know where they stand yet." under headings that say "Who he is" and "How I see him". Seen: a person's card whose headings say he or she says he or she in the Politics line too, and a card whose headings say they says they. Seen: a person's card says "where he stands" or "where she stands" to match its headings.

**Cause.** Found in code: the Politics line in the person-card builder in src/bench/play.mjs prints `controls.who.viewUnknown` as one fixed string ("...where they stand yet."), while the headings beside it pick a pronoun label through `heading` and `fill` from the card's pronouns (card.ts `pronouns`). The line never took a pronoun.

**Fix.** `controls.who.viewUnknown` becomes "You don't know where {lower} stands yet." for a card with pronouns and `viewUnknownThey` keeps "You don't know where they stand yet." for the they form, picked the way `heading` picks its label. The view-learned test reads the same two labels. No other card line changes.

**Time box.** 1 hour for one Sonnet session at low effort.

**Rules.** The card's labels are data in src/bench/data/controls.json; no pronoun written in code. Pinned place and seed.

**Done when.** At Sheridan WY, seed 7, every People card with an unknown view says the pronoun its own headings say (src/bench/person-card-view-unknown.browser.mjs, red on the old label: "heading says he, politics line says they"; green after), with a he card and a she card printed (the world holds no they card, so the they label is unchanged text, covered by view-learned.test.ts). A second session (not the builder) opens a person card whose view is unknown at a drawn place from all 56 (place and seed named) and reads the matching pronoun.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/data/controls.json, src/director/view-learned.test.ts, src/bench/person-card-view-unknown.browser.mjs
