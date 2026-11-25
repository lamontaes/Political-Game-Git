---
id: play-congress-banner-shows-the-capitol
title: "The House and the Senate show the White House on their banner"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: the CTO's pass of Nov 24 on the Bills follow-up (comment 7131936843 on the crew's issue)
claimed-at:
after:
lead: play-first
model: sonnet
effort: low
root: none
---

**What.** A federal bill's banner and the Government screen draw the House and the Senate over a picture of the White House lawn, but Congress sits in the Capitol. The CTO caught it on the Bills follow-up: Congress needs a Capitol picture and the White House belongs to the President's office alone. Seen: a federal bill's banner in a drawn place at 1440x900 shows the Capitol building over the House's name.

**Cause.** Measured: in Lee, Massachusetts, seed 9b74e177-6066-4bcc-87bd-825d77008373, opening H.R. 2 from Politics > Bills drew `state-capitol-dome` for the House. `roomPlace` in src/bench/government-bodies.ts sent every Congress kind (`us-senate`, `us-house`, `us-house-delegate`) to the generic state dome place, which resolves to the White House picture, while a painted `us-capitol-exterior` already exists in art/backdrops and the scene places list names it for those same kinds (src/bench/data/scene-places.json).

**Fix.** In `roomPlace`, return `us-capitol-exterior` for the Congress kinds; the President's and Vice President's offices keep `oval-office-standard`. No picture is painted or added.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the banner and the Government screen read the same room lookup, so one change fixes both. Replace, never layer: the old place name for Congress is replaced in the one function, not covered by a second lookup.

**Done when.** A second session starts the bench on main and, in a drawn place, opens a federal bill and a Senate bill in Politics > Bills at 1440x900, and sees in a screenshot the Capitol picture behind the chamber's name on each, while the President's office on the Government screen still shows the Oval Office.

**Waits on.** Nothing.

**Files.** src/bench/government-bodies.ts

**Notes.** Filed by Box and scroll (lane 2), Nov 24. A painted Capitol interior for the House and Senate floors would suit better than the exterior; that is a wanted picture for Story, not added here.
