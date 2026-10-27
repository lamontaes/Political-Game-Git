---
id: screens-person-card-plain
title: "The person card has no Talk button and says what the person is like in a plain sentence, not trait names"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: screens/person-card-plain
pr: #6390
blocked-on:
source: "the owner's v0.56.2 sitting, Oct 27, 3:30 PM Eastern (Carlos Washington, 35, Salida, Colorado), filed by the screens designer"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T20:15:17.597Z
---

**What.** In v0.56.2 the owner said "Remove the goddamn talk button" of the person card, and of its traits block (Deliberation, Sociability "Neither, much", Handling disagreement, Keeping commitments, Risk): "The player is not seeing this stuff. It needs to be a plain version of what this person's like." The card loses its Talk button (talking is reached the way the mocks show, by the person in the room), and the traits block becomes one or two plain sentences from the person's traits through an English bank, never the trait names. The card keeps its portrait, name and what the person thinks of the player.

**Rules.** No hand-written player text: the sentences come from an English bank keyed by trait and strength. Replace, never layer: the trait rows and the Talk button are deleted. One model, two tiers: the same sentence rule reads a filled-in person's traits wherever they come from.

**Done when.** In a drawn place (name the place and seed), src/bench/person-card.browser.mjs passes on a restarted bench and asserts the card has no Talk button, no text Deliberation, Sociability or Neither, much, and a sentence of at least six words about the person; a 1440x900 screenshot is in the PR body beside the before shot.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** A person's card says what they're like in a sentence and has no Talk button.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/card.ts, data/english/parts, src/bench/person-card.browser.mjs

**Notes.** Reading: OWNER-DECISIONS.md (Oct 27 afternoon screens rulings), DECISION-REGISTER.md, prior-rulings/, docs/play-first/LAW.md section 1, docs/ui/mocks/screens-2026-10-14/README.md; docs/ searched for the screen name. Principles: docs/design/screens/principles-2026-10-27.md.
