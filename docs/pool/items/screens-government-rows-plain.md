---
id: screens-government-rows-plain
title: "Politics > Government and Local rows say the term in a voter's words and never a placeholder vote share"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: screens/government-rows-plain
pr: #6383
blocked-on:
source: "the owner's v0.56.2 sitting, Oct 27, 3:30 PM Eastern (Carlos Washington, 35, Salida, Colorado), filed by the screens designer"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T19:49:05.098Z
---

**What.** In v0.56.2 every Politics > Government row said "Serving when your story began" (owner: "Like, what is that? No. Stop."), and Politics > Local showed all five council members at "60% of the vote", a placeholder number. Each row must show the term in words a voter would use ("Term ends January 2027") or nothing, and each member's vote share must be read from their election record or not shown.

**Rules.** Estimate, never UNKNOWN does not cover a made-up share: a vote share is a fact from the election record, and with no record nothing is shown. No hand-written player text: words come from the controls and English data. Replace, never layer: the opening-day line is deleted. One rule, all 56 places.

**Done when.** In a drawn place (name the place and seed), src/bench/politics.browser.mjs passes on a restarted bench and asserts no row contains when your story began and that no two council members share a vote share unless their election records do; a 1440x900 screenshot is in the PR body beside the before shot.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Government rows say when each term ends, and council members show their own vote shares or none.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/government.ts, src/bench/politics.browser.mjs, src/bench/data/controls.json

**Notes.** Reading: OWNER-DECISIONS.md (Oct 27 afternoon screens rulings), DECISION-REGISTER.md, prior-rulings/, docs/play-first/LAW.md section 1, docs/ui/mocks/screens-2026-10-14/README.md; docs/ searched for the screen name. Principles: docs/design/screens/principles-2026-10-27.md.
