---
id: play-person-card-heading-shows-object-slot
title: 'A person card on People heads a section "How I see {object}", with the slot unfilled'
area: play
kind: bug
priority: 2
size: S
status: merged
claimed-by: claude/pool-play-person-card-heading-shows-object-slot
pr: #8865
after:
blocked-on:
source: P1, Nov 11, 2026, seen while building play-one-person-shows-two-faces (#8330)
lead: screens
standard: 2
model: sonnet
effort: medium
root: none
claimed-at: 2026-11-11T18:40:15.008Z
merged-at: 2026-11-11T19:14:11.781Z
---

**What.** In Blodgett Landing, New Hampshire (bench seed `37f08a0a-d3e8-4547-a399-874750060651`, a life made in the creator), People opens on the player's son, Kai Walton, and his card's second section is headed "How I see {object}", the slot shown raw. Shot: docs/seen/play-one-person-shows-two-faces/blodgett-landing-nh/people.png on branch claude/pool-play-one-person-shows-two-faces. Seen: People, the open card's section under Who they are.

**Cause.** Found in code: `personCardNode` in src/bench/play.mjs words its headings with `heading(key, theyKey)`, which fills the label's slots from the card's `pronouns` and, when the card has none, shows `labels[theyKey ?? key]`. The section is built with `heading("howISee")` (play.mjs, about line 2445) and no they-key, and src/bench/data/controls.json has only `"howISee": "How I see {object}"`, so a card with no pronouns shows the label with its slot. The section "Their story" has its they-key (`lifeStoryThey`). Why `/api/known` gave this card no pronouns was not traced.

**Fix.** Give the heading a they-form: add `howISeeThem` to the person labels in src/bench/data/controls.json (Words session's wording) and build the section with `heading("howISee", "howISeeThem")`, as "Their story" does. Check the other `heading(` calls in `personCardNode` for the same gap.

**Time box.** 0.5 hours.

**Rules.** No hand-written player text: the words are a control label in controls.json, worded by the Words session. One rule, all 56 places: the check draws its place and names it with its seed.

**Done when.** A second session, on main, in a drawn place, opens People and each household member's card, and sees no heading with a brace in it; a person whose card has no pronouns reads the they-form heading. Place and seed named.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs (`personCardNode`), src/bench/data/controls.json (person labels)
