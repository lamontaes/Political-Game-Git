---
id: words-party-welcome-replies-give-a-reason-and-move-on
title: "Replies in party-welcome give a reason and move the talk on"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-words-machine
source: M5's offer-placed sheets, Nov 14, 2026, pairs-offer-placed/noes.md; filed by the short-replies builder (conflict-accuse, #9262)
---

**What.** In the talk about a party welcoming you, the player's replies are a bare yes, a bare no, a delay or an exit, or a later round restates the first round in new words. A reply judge (M5, fresh reviewers, plants caught) said no on the rules replies-may-be-long-and-substantive and later-replies-move-the-talk-on. The rule asks that a reply carry an argument or a reason and that a later reply take up what was just said. Seen: the reply buttons in this talk, in play.

**Cause.** Measured: `npm run words:pairs -- --rule later-replies-move-the-talk-on --out <dir>` (and the same for replies-may-be-long-and-substantive) lists these paths; M5's verdicts on the offer-placed sheets, Nov 14, in /mnt/project-files/words-lead/short-replies/conflict-accuse/pairs-offer-placed/noes.md (ids 1clk0u8rvro on replies-may-be-long-and-substantive; none on later-replies-move-the-talk-on), and the same family under "Unassigned: party-welcome" in /mnt/project-files/words-lead/9133/set-rule-gaps.md. The reply pieces for this purpose in data/english/parts/scene-talk.json carry no reason, and their first-round pieces (no `after`) fit later rounds too.

**Fix.** The method of #9262 (conflict-accuse), applied to this purpose. The scene's cause record gives the facts a reason can come from, set in `composeBinding` (src/director/purpose-scene.ts) the way `justice.accused` sets them. Each reply piece is gated on the facts that make it true. First-round pieces carry `after` set to the opening move, so they do not return in later rounds. The purpose's `again` lists in src/director/data/purpose-arcs.json (or arc-variants.json) offer only moves whose pieces say something new. The player sees it in the talk itself.

**Time box.** 3 hours, Opus.

**Rules.** Replace, never layer: the reason-less reply pieces are deleted in the same change, not left beside the new ones. No hand-written player text: every new line is a bank piece in data/english/parts/scene-talk.json. Never fold a "no"; a builder never judges its own lines.

**Done when.** M5 judges the new sheets for this purpose with no no on either rule, line-rules is green, and two played scenes in a drawn place, each named with its seed, show a reason in each first reply and a new turn in each later one. A second session, on main, plays the talk and sees the same.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/data/purpose-arcs.json, src/director/purpose-scene.ts

**Notes.** Filed by hand on the #9262 branch, Nov 14.
