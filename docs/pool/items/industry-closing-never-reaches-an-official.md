---
id: industry-closing-never-reaches-an-official
title: "A closing or layoff in town never reaches an official: no constituent asks about it and no owner asks for relief"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: words
model: opus
effort: medium
source: "Industries thread, Nov 16 (trace /mnt/project-files/account-lead/reports/industry-events-read-by-story.md), at the Account lead's direction, for the owner's Nov 16 01:58Z ask"
---

**What.** When a business closes or cuts staff, the town's officials hear nothing through a scene: no worker comes to the council member's desk, no owner asks the mayor for relief, and the player as an official is never asked what they will do. Strikes and protests reach officials, but only over the town's term. Seen: src/director/data/situation-types.json on Train head a62a2fda; `desk-visit` is caused only by `bill-presented`, `action-confront` only by `civic.strike` and `civic.protest`.

**Cause.** Found in code: src/director/data/situation-types.json, no cause for `desk-visit`, `action-confront` or any official's scene reads `organization.closed`, `business.closed` or `business.staff-reduced`.

**Fix.** Add a cause to the official's desk visit (or a new type through scene-producers) reading a closing or staff cut weighed by its share of the town's jobs, with the worker or the owner as the visitor and the official's answer as the outcome. The player as an official sees it at the desk.

**Time box.** 4 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Rules.** Sliding scales and causes: the closing weighs by its share of the town's jobs, never a cutoff. A scene without an outcome is not a scene. Day one is in motion: an official in a town where a large employer is failing hears of it.

**Done when.** In a drawn place where the player holds office and a business closes or cuts staff, a visitor raises it at the desk and the answer has an outcome, by record id, and a second session sees it in the running game.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json
