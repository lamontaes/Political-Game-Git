---
id: play-stop-41-person-card-no-empty-headings
title: "A person card shows no empty heading, no floating date and a capitalized relation, with where they live and what they do"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #6246
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at:
---

**What.** Kendall Roberts's person card in v0.34.0 reads "parent · Age 47" in lowercase, shows a FAMILY heading with nothing under it, a lone date "January 20, 2025" floating at the right, and one action, Talk. Leo Roberts's card, "brother · Age 21", is the same. The approved person card is a small header (name, office, age, street, chips) with facts below it. This item removes every heading that has nothing under it, labels or drops the floating date, capitalizes the relation, and fills the facts the records already give: where they live and their work or school, and how the player knows them.

**Rules.** Serves LAW.md §2, People in rooms and figures (nothing that breaks immersion on a person card, REG:149) and LAW.md §8, Dev-speak. No hand-written player text: the facts are record data under control names. This is a game, not a spreadsheet. Replace, never layer: the empty-section path is replaced by sections that render only with content.

**Done when.** In a drawn place on the first evening, a browser check in src/bench/person-card.browser.mjs opens the card of each household member and fails on a heading with no content under it, a date with no label, or a lowercase relation; each card shows where the person lives and their work or school from records (record ids named), shown by a screenshot of two cards at 1440x900.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Opening your mother's or brother's card shows their name, relation, age, where they live and what they do, and no empty headings.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/card.ts, src/bench/play.mjs, src/bench/play.css, src/bench/person-card.browser.mjs

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). No owner words on the card in this sitting; these are the CTO's observations. The relation word itself (mother or father, not "parent") is words-parent-named-mother-or-father. The card was see-through at v0.34.0; the opaque panel (play-stop-17) merged after that build. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
- Merged Oct 27 in PR #6246; awaiting the owner's installed-build check. Open: the browser check opens only the first person in the room, not every household member; one after screenshot.
