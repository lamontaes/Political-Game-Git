---
id: screens-talk-who-in-a-sentence
title: "The talk box says who you're talking to in a sentence ('Your partner. Works at Quinn Supply.')"
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
claimed-at: 2026-10-27T20:15:26.114Z
---

**What.** In v0.56.2 the talk box subtitle read "Warehouse worker · Quinn Supply Company · partner"; the owner said "that needs work." It must say in a sentence a person would who this is to the player and what they do, through the English engine, for example "Your partner. Works at Quinn Supply." The name stays above it as it is now. A person the player has never met says only what they do.

**Rules.** No hand-written player text: the sentence comes from an English bank with slots filled from the person's relation, job and employer records. Replace, never layer: the dot-joined subtitle is deleted. One rule, all 56 places.

**Done when.** In a drawn place (name the place and seed), a browser check on a restarted bench opens a talk with a household member and asserts the subtitle has no middle dot and reads as a sentence; a 1440x900 screenshot is in the PR body beside the before shot.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The talk box says "Your partner. Works at Quinn Supply." under the name.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/ui/talk-box.mjs, data/english/parts, src/bench/talk-history.browser.mjs

**Notes.** Reading: OWNER-DECISIONS.md (Oct 27 afternoon screens rulings), DECISION-REGISTER.md, prior-rulings/, docs/play-first/LAW.md section 1, docs/ui/mocks/screens-2026-10-14/README.md; docs/ searched for the screen name. Principles: docs/design/screens/principles-2026-10-27.md.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built (merged #6390; owner check per OD:105).

Oct 29 (CTO): set done; PR #6390 merged (the done flip failed while branch protection refused the flip job's push).
